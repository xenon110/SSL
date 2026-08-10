import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import fs from "fs";
import path from "path";

let apiKey = process.env.GEMINI_API_KEY || "";
if (!apiKey) {
    try {
        const envPath = path.join(process.cwd(), '.env.local');
        const envContent = fs.readFileSync(envPath, 'utf8');
        const match = envContent.match(/GEMINI_API_KEY="?([^"\n]+)"?/);
        if (match) apiKey = match[1].trim();
    } catch (e) {}
}

const genAI = new GoogleGenerativeAI(apiKey);
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
    const lastMessage = messages[messages.length - 1].content;
    
    const cookieStore = await cookies();
    const activeCompany = cookieStore.get('active-company')?.value;
    const decodedName = activeCompany ? decodeURIComponent(activeCompany) : null;

    let companyId = null;
    if (decodedName) {
        const { data: comp } = await supabase.from('companies').select('id').eq('name', decodedName).single();
        if (comp) companyId = comp.id;
    }

    // Fetch live financial context
    let metricsQuery = supabase.from('dashboard_metrics').select('*').eq('dashboard_name', 'Executive Summary');
    if (companyId) {
        metricsQuery = metricsQuery.eq('company_id', companyId);
    }
    const { data: metrics } = await metricsQuery.single();
    
    // Fetch top debtors for context
    let debtorsQuery = supabase.from('outstanding_bills')
        .select('party_ledger, pending_amount')
        .eq('party_group', 'receivable');
    if (decodedName) {
        debtorsQuery = debtorsQuery.eq('company_name', decodedName);
    }
    const { data: debtors } = await debtorsQuery;
        
    let topDebtors: any[] = [];
    if (debtors) {
        let agg: any = {};
        debtors.forEach(d => { agg[d.party_ledger] = (agg[d.party_ledger]||0) + Number(d.pending_amount) });
        topDebtors = Object.entries(agg).sort((a:any, b:any) => b[1] - a[1]).slice(0, 3);
    }

    let contextStr = "No data available";
    if (metrics && metrics.metrics_data) {
        contextStr = `
FULL ENTERPRISE FINANCIAL DATASET (JSON):
${JSON.stringify(metrics.metrics_data, null, 2)}

TOP 3 DEBTORS (Owe you money):
${topDebtors.map((d:any) => `- ${d[0]}: ₹${d[1].toLocaleString()}`).join("\n")}
`;
    }

    const systemInstruction = `You are SamridhiPrime AI, an elite, Wall Street-tier Chief Financial Officer (CFO). 
You are advising the CEO/business owner. Your answers must be incredibly sharp, highly analytical, and flawless—like a Google CFO. 
Here is their COMPLETE LIVE FINANCIAL DATASET directly from Tally ERP:
${contextStr}

CRITICAL INSTRUCTION: You MUST return your response as a valid JSON object. Do not include markdown formatting like \`\`\`json.
The JSON object must have this exact schema:
{
  "reply": "Your markdown-formatted text response goes here.",
  "chart": {
     "type": "bar", // or "pie"
     "title": "Title of the chart",
     "data": [
        {"name": "Label 1", "value": 100},
        {"name": "Label 2", "value": 200}
     ]
  } // Include the "chart" object ONLY if visualizing the data helps explain the answer (e.g. comparing debtors, showing revenue vs expenses). If a chart is not needed, set "chart": null
}

Analyze their question and provide financial insights based ONLY on the context provided above. 
Do not hallucinate numbers.`;

    const model = genAI.getGenerativeModel({ 
        model: "gemini-2.5-flash",
        generationConfig: {
            responseMimeType: "application/json",
        }
    });
    
    // We must pass history that does not violate the json format.
    // However, previous user messages were plain text. 
    // It's better to just pass the last message to avoid format collisions, 
    // or wrap previous responses in JSON.
    const formattedHistory = messages.slice(0, -1).map((m: any) => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.role === 'model' ? JSON.stringify({ reply: m.content }) : m.content }]
    }));

    formattedHistory.unshift({
        role: "model",
        parts: [{ text: JSON.stringify({ reply: "Understood. I am your elite AI CFO ready to analyze your data." }) }]
    });
    formattedHistory.unshift({
        role: "user",
        parts: [{ text: systemInstruction }]
    });

    const chat = model.startChat({
      history: formattedHistory,
    });

    const result = await chat.sendMessage(lastMessage);
    const responseText = result.response.text();
    
    // Validate if it's JSON
    let parsed;
    try {
        parsed = JSON.parse(responseText);
    } catch(e) {
        // Fallback if model ignored instructions
        parsed = { reply: responseText.replace(/\`\`\`json|\`\`\`/g, ''), chart: null };
    }

    return NextResponse.json(parsed);
    
  } catch (error: any) {
    console.error("AI Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
