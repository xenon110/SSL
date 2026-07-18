import { NextResponse } from 'next/server';
import { supabase, fetchAllData } from '@/lib/supabase';

export async function GET() {
  const xmlRequest = `
    <ENVELOPE>
      <HEADER>
        <VERSION>1</VERSION>
        <TALLYREQUEST>Export</TALLYREQUEST>
        <TYPE>Collection</TYPE>
        <ID>AllCompanies</ID>
      </HEADER>
      <BODY>
        <DESC>
          <STATICVARIABLES>
            <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
          </STATICVARIABLES>
          <TDL>
            <TDLMESSAGE>
              <COLLECTION NAME="AllCompanies" ISINITIALIZE="Yes">
                <TYPE>Company</TYPE>
                <FETCH>Name</FETCH>
              </COLLECTION>
            </TDLMESSAGE>
          </TDL>
        </DESC>
      </BODY>
    </ENVELOPE>
  `;

  try {
    // 1. Fetch from Supabase (all previously synced companies)
    const { data: dbCompanies } = await supabase.from('companies').select('id, name');
    const companies: {id: string, name: string}[] = [];
    
    if (dbCompanies) {
      dbCompanies.forEach(c => companies.push({ id: c.id, name: c.name }));
    }

    // 2. Fetch from Tally (currently open companies)
    let tallyWorks = false;
    try {
      const tallyUrl = process.env.TALLY_URL || 'http://localhost:9000';
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 seconds timeout
      
      const response = await fetch(tallyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/xml' },
        body: xmlRequest,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const xmlResponse = await response.text();
        const nameMatches = xmlResponse.match(/<NAME[^>]*>(.*?)<\/NAME>/g);
        
        if (nameMatches) {
          nameMatches.forEach((match, index) => {
            const name = match.replace(/<NAME[^>]*>|<\/NAME>/g, '').replace(/&amp;/g, '&');
            if (name && name.trim().length > 0) {
              companies.push({ id: `tally-${index}`, name: name.trim() });
            }
          });
        }
        tallyWorks = true;
      }
    } catch (e) {
      console.log("Tally not reachable right now, falling back to just DB companies.");
    }

    // Deduplicate in case Tally returns multiple NAME tags or if it's already in Supabase
    const uniqueCompanies = Array.from(new Map(companies.map(item => [item.name, item])).values());

    return NextResponse.json({ companies: uniqueCompanies });
  } catch (error: any) {
    console.error("Error fetching companies:", error);
    return NextResponse.json({ 
      error: error.message, 
      companies: [] // Fallback to empty
    }, { status: 500 });
  }
}
