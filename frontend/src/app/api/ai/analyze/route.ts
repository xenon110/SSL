import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { type, data } = body;

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: 'GEMINI_API_KEY is not configured.' }, { status: 500 });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });

    const today = new Date();
    const futureDate = new Date();
    futureDate.setMonth(today.getMonth() + 3);

    const formattedToday = today.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    const formattedFuture = futureDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

    let systemPrompt = '';
    const schemaInstructions = `
You must analyze the provided data and return your analysis in EXACTLY the following JSON format. Do NOT wrap the JSON in backticks or markdown, just return the raw JSON object.
Use "${formattedToday}" for the snapshotDate and "Up to ${formattedFuture}" for the forecastHorizon.

{
  "pageTitle": "AI Prediction Report",
  "snapshotDate": "${formattedToday}",
  "forecastHorizon": "Up to ${formattedFuture}",
  "topKPIs": [
    { "label": "KPI 1 LABEL", "value": "Formatted Value (e.g. ₹12,00,00,000)", "subtitle": "Short subtitle...", "isPositive": true },
    { "label": "KPI 2 LABEL", "value": "Value", "subtitle": "...", "isPositive": false },
    { "label": "KPI 3 LABEL", "value": "Value", "subtitle": "...", "isPositive": null },
    { "label": "KPI 4 LABEL", "value": "Value", "subtitle": "...", "isPositive": true }
  ],
  "mainChart": {
    "title": "Main Chart Title",
    "subtitle": "Main chart subtitle...",
    "metric1Name": "Metric 1 (e.g. Inflow/Revenue)",
    "metric2Name": "Metric 2 (e.g. Outflow/Expenses)",
    "labels": ["Month 1", "Month 2", "Month 3", "Month 4", "Month 5", "Month 6"],
    "metric1Data": [100, 110, 105, 120, 130, 125],
    "metric2Data": [90, 95, 90, 100, 110, 105]
  },
  "barChart": {
    "title": "Bar Chart Title",
    "subtitle": "Bar chart subtitle...",
    "dataset1Name": "Current Actuals",
    "dataset2Name": "Predicted Target",
    "labels": ["Category A", "Category B", "Category C", "Category D"],
    "dataset1Data": [1000, 2000, 1500, 3000],
    "dataset2Data": [1200, 2500, 1800, 3500]
  },
  "horizontalBarChart": {
    "title": "Risk/Performance Profile",
    "subtitle": "Index values (0-100)",
    "items": [
      { "name": "Item A", "value": 85 },
      { "name": "Item B", "value": 60 },
      { "name": "Item C", "value": 40 }
    ]
  },
  "table": {
    "title": "Detailed Breakdown",
    "subtitle": "AI analysis of specific items",
    "headers": ["ITEM/CATEGORY", "RISK/EFFICIENCY RATING", "PROJECTED METRIC", "AI REMARKS"],
    "rows": [
      { "name": "Item Name", "rating": "Critical Risk / High Efficiency", "metric": "Value", "remarks": "Detailed AI insight...", "isCritical": true },
      { "name": "Item Name", "rating": "Moderate", "metric": "Value", "remarks": "...", "isCritical": false }
    ]
  },
  "recommendations": [
    { "id": 1, "text": "Actionable recommendation 1..." },
    { "id": 2, "text": "Actionable recommendation 2..." },
    { "id": 3, "text": "Actionable recommendation 3..." }
  ],
  "logicRationale": [
    { "title": "1. FORECASTING BASIS", "content": "Text explaining logic..." },
    { "title": "2. RISK FACTORS", "content": "Text explaining risks..." },
    { "title": "3. PREDICTION LOGIC", "bullets": ["Bullet point 1", "Bullet point 2"] }
  ]
}
`;

    if (type === 'production') {
      systemPrompt = `You are an elite, highly intelligent Manufacturing and Production Analyst.
You are given a JSON object containing Live Production Metrics (KPIs, yield percentages, top raw materials, top products, and overall value distributions).
Your job is to adapt the data into the requested JSON schema representing an "AI Production & Yield Predictions" report.
- The Main Chart should compare "Production Output Value" vs "Raw Material Consumption".
- The Bar Chart should compare "Current Yield" vs "Target Yield" for top products.
- The Horizontal Bar should assess "Production Inefficiency Risk" for top raw materials (0-100).
- The Table should break down top production items and their efficiency ratings.
${schemaInstructions}`;
    } else if (type === 'pnl') {
      systemPrompt = `You are an elite, highly intelligent Financial Analyst.
You are given a JSON object containing Live Profit & Loss Data (revenue, expenses, gross profit, net profit, major expense categories).
Your job is to adapt the data into the requested JSON schema representing an "AI Revenue & Expense Predictions" report.
- The Main Chart should compare "Projected Revenue" vs "Projected Expenses".
- The Bar Chart should compare "Current Expenses" vs "Predicted Optimized Expenses" for top categories.
- The Horizontal Bar should assess "Cost Overrun Risk Profile" for major cost centers (0-100).
- The Table should break down Top Expense categories and their risk ratings.
${schemaInstructions}`;
    } else {
      return NextResponse.json({ error: 'Invalid analysis type.' }, { status: 400 });
    }

    const prompt = `${systemPrompt}\n\nHere is the data to analyze:\n${JSON.stringify(data, null, 2)}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    try {
      // Clean up the text in case the model returns markdown JSON blocks
      let cleanedText = text.trim();
      if (cleanedText.startsWith('\`\`\`json')) {
        cleanedText = cleanedText.replace(/^\`\`\`json/, '').replace(/\`\`\`$/, '').trim();
      } else if (cleanedText.startsWith('\`\`\`')) {
        cleanedText = cleanedText.replace(/^\`\`\`/, '').replace(/\`\`\`$/, '').trim();
      }
      
      const jsonResponse = JSON.parse(cleanedText);
      return NextResponse.json(jsonResponse);
    } catch (parseError) {
      console.error('Failed to parse AI response:', text);
      return NextResponse.json({ error: 'Failed to parse AI response.' }, { status: 500 });
    }
    
  } catch (error: any) {
    console.error('AI Analysis API Error:', error);
    return NextResponse.json({ error: 'Failed to generate analysis', details: error.message }, { status: 500 });
  }
}

export const runtime = 'edge';
