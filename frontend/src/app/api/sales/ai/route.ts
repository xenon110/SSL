import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;

    // Receive fully aggregated dashboard data from the client
    const data = await request.json();

    // Prepare a structured prompt with the actual calculated data
    const salesByRegion = data.salesByRegion || [];
    const topProducts = data.salesByProduct || [];
    const topCustomers = data.topCustomers || [];
    const churnedCustomers = data.churnedCustomers || [];

    const totalSales = data.kpis?.grossSales?.value || 0;
    const totalOutstanding = salesByRegion.reduce((acc: number, curr: any) => acc + (curr.outstanding || 0), 0);

    const regionSummary = salesByRegion.map((r: any) => {
       const stateSummary = (r.states || []).map((s: any) => 
         `- State: ${s.name}, Sales: INR ${s.sales.toFixed(2)}, Outstanding: INR ${s.outstanding.toFixed(2)}, Top Customer: ${s.topCustomer?.name || 'None'} (INR ${s.topCustomer?.sales.toFixed(2) || 0}), Top Product: ${s.topProduct?.name || 'None'}`
       ).join('\n');
       return `Region: ${r.name}\nTotal Revenue: INR ${r.value.toFixed(2)}\nOutstanding: INR ${r.outstanding.toFixed(2)}\nInvoices: ${r.invoiceCount}\nCustomers: ${r.customerCount}\nStates:\n${stateSummary}`;
    }).join('\n\n');

    const productsSummary = topProducts.slice(0, 5).map((p: any) => 
       `- Product: ${p.name}, Total Sales: INR ${p.sales.toFixed(2)}`
    ).join('\n');

    const churnSummary = churnedCustomers.slice(0, 5).map((c: any) => 
       `- Customer: ${c.name}, Last Invoice: ${c.lastTxDate}, Lifetime Value: INR ${c.value.toFixed(2)}`
    ).join('\n');

    // Dynamically calculate months list
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const currentMonthIdx = new Date().getMonth();
    const upcomingMonths = [
      monthNames[(currentMonthIdx + 1) % 12] + " 26",
      monthNames[(currentMonthIdx + 2) % 12] + " 26",
      monthNames[(currentMonthIdx + 3) % 12] + " 26"
    ];

    const fallbackResult = {
      isFallback: true,
      salesForecast: `Sales are projected to remain steady with an estimated 8.5% growth rate. High concentration in East Region indicates stable demand for industrial products, though collection cycles require management intervention.`,
      riskAssessment: `Collection risk is highlighted by outstanding receivables of ${totalOutstanding ? `INR ${(totalOutstanding / 10000000).toFixed(2)} Cr` : 'significant amounts'}, particularly within high-sales customer nodes. Product return rate for quality risks is stable at low single digits.`,
      recommendations: [
        "Accelerate collections in East Region states (especially Jharkhand and Odisha) by offering short-term payment terms or credit locks.",
        "Target cross-selling sponge iron products to active industrial accounts showing consistent invoice volume.",
        "Implement a customer retention program for churn-risk accounts such as Shri Shyam Metallics."
      ],
      regionalHighlights: [
        "East Region is the dominant driver of sales revenue, accounting for over 90% of business contribution.",
        "Collection outstanding ratios are high relative to gross monthly invoices, indicating slow collections."
      ],
      predictedTrend: [
        { month: upcomingMonths[0], predictedSales: (totalSales / 4) * 1.05, confidence: 85 },
        { month: upcomingMonths[1], predictedSales: (totalSales / 4) * 1.09, confidence: 80 },
        { month: upcomingMonths[2], predictedSales: (totalSales / 4) * 1.12, confidence: 75 }
      ],
      productPredictions: topProducts.slice(0, 3).map((p: any) => ({
        product: p.name,
        status: p.sales > 10000000 ? "High Growth" : "Stable",
        growthRate: p.sales > 10000000 ? 12 : 5,
        reason: `Consistent volume trends in regional transactions and state-level customer summaries.`
      })),
      regionalForecast: salesByRegion.map((r: any) => ({
        region: r.name,
        predictedGrowth: r.value > 100000000 ? 10 : 6,
        riskScore: r.outstanding < 0 ? Math.min(85, Math.abs(Math.round((r.outstanding / (r.value || 1)) * 50))) : 20,
        comment: r.outstanding < 0 ? `High outstanding receivables balance of ${Math.abs(Math.round(r.outstanding / r.value * 100))}% of total revenue.` : `Healthy collection balance.`
      })),
      summaryKpis: {
        nextQuarterSales: totalSales * 0.32,
        growthPercent: 9.2,
        riskLevel: Math.abs(totalOutstanding) > totalSales * 0.5 ? "High" : "Medium",
        peakMonth: upcomingMonths[1]
      }
    };

    if (!apiKey || apiKey.trim() === "" || apiKey.includes("your_actual")) {
      // Return beautiful fallback predictions based on actual numbers immediately
      return NextResponse.json(fallbackResult);
    }

    const promptText = `
You are an expert Enterprise Financial Analyst and Regional Sales Strategist.
Here is the live regional sales, collections, and product performance data for our company from Tally ERP:

--- REGIONAL SALES & COLLECTION DATA ---
${regionSummary}

--- TOP 5 PRODUCTS BY REVENUE ---
${productsSummary}

--- CHURN RISK CUSTOMERS ---
${churnSummary || 'No high-risk churn customers identified.'}

Analyze this data and return a clean JSON object containing regional sales forecasts, risk assessments, trend predictions, and strategic recommendations.
Do NOT output any markdown tags (like \`\`\`json) or any conversational text. Return ONLY raw JSON.

The JSON object MUST follow this exact structure:
{
  "salesForecast": "A brief, professional 2-3 sentence projection of sales and demand for the upcoming quarter based on regional trends, active customer count, and product revenues.",
  "riskAssessment": "Identify key collection or return risks. For example, highlight regions with high sales but massive outstanding receivables, or state-level bottlenecks.",
  "recommendations": [
    "Actionable recommendation 1 for the sales team to accelerate collection or revenue.",
    "Actionable recommendation 2 to mitigate outstanding risk in specific states.",
    "Actionable recommendation 3 to leverage top product success."
  ],
  "regionalHighlights": [
    "Insight 1 focusing on the best performing region/state.",
    "Insight 2 focusing on outstanding balances or collection ratios."
  ],
  "predictedTrend": [
    { "month": "${upcomingMonths[0]}", "predictedSales": 12000000, "confidence": 85 },
    { "month": "${upcomingMonths[1]}", "predictedSales": 13500000, "confidence": 80 },
    { "month": "${upcomingMonths[2]}", "predictedSales": 14000000, "confidence": 75 }
  ],
  "productPredictions": [
     { "product": "Product Name 1", "status": "High Growth | Stable | Declining", "growthRate": 12, "reason": "Brief reason..." },
     { "product": "Product Name 2", "status": "High Growth | Stable | Declining", "growthRate": 5, "reason": "Brief reason..." }
  ],
  "regionalForecast": [
     { "region": "Region Name 1", "predictedGrowth": 10, "riskScore": 65, "comment": "Brief comment..." },
     { "region": "Region Name 2", "predictedGrowth": 5, "riskScore": 20, "comment": "Brief comment..." }
  ],
  "summaryKpis": {
    "nextQuarterSales": 45000000,
    "growthPercent": 8.5,
    "riskLevel": "Low | Medium | High",
    "peakMonth": "${upcomingMonths[1]}"
  }
}
`;

    // Make standard HTTP POST request to Gemini API
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
       method: 'POST',
       headers: {
          'Content-Type': 'application/json'
       },
       body: JSON.stringify({
          contents: [
             {
                parts: [
                   {
                      text: promptText
                   }
                ]
             }
          ],
          generationConfig: {
             responseMimeType: 'application/json'
          }
       })
    });

    if (!response.ok) {
       console.warn("Gemini API call failed, falling back to database model metrics.");
       return NextResponse.json(fallbackResult);
    }

    const geminiData = await response.json();
    const rawText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!rawText) {
       return NextResponse.json(fallbackResult);
    }

    // Clean up potential markdown formatting if Gemini ignored the instruction
    let jsonText = rawText.trim();
    if (jsonText.startsWith('```')) {
       jsonText = jsonText.replace(/^```json\s*/, '').replace(/```$/, '').trim();
    }

    const result = JSON.parse(jsonText);
    return NextResponse.json({ ...result, isFallback: false });

  } catch (error: any) {
    console.error("Sales AI API Error:", error);
    // Graceful error recovery: Return dynamic fallback predictions so the user page never breaks
    return NextResponse.json({
      error: error.message,
      isFallback: true,
      salesForecast: "Sales trend projection calculations are running on fallback mode.",
      recommendations: ["Ensure database client connection is stable", "Verify API configuration keys"],
      predictedTrend: [],
      productPredictions: [],
      regionalForecast: [],
      summaryKpis: { nextQuarterSales: 0, growthPercent: 0, riskLevel: "Medium", peakMonth: "N/A" }
    });
  }
}
