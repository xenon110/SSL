import os

routes = {
    'executive': { 'title': 'Executive Summary', 'kpis': ['Total Revenue (MTD/YTD)', 'Total Expenses', 'Gross Profit', 'Net Profit', 'EBITDA', 'Cash in Bank', 'Cash on Hand', 'Accounts Receivable', 'Accounts Payable', 'Working Capital', 'Current Ratio', 'Debt-Equity Ratio', 'Net Worth'] },
    'revenue': { 'title': 'Revenue Dashboard', 'kpis': ['Revenue Today', 'Revenue This Month', 'Revenue Last Month', 'Revenue This Quarter', 'Revenue This Year', 'Average Invoice Value', 'Number of Sales', 'Revenue Growth %', 'Repeat Customer %'] },
    'profitability': { 'title': 'Profitability Dashboard', 'kpis': ['Gross Profit', 'Net Profit', 'Operating Profit', 'EBITDA', 'Gross Margin %', 'Net Margin %'] },
    'receivables': { 'title': 'Receivables Dashboard', 'kpis': ['Total Outstanding Receivables', '0-30 Days', '31-60 Days', '61-90 Days', '90+ Days', 'Collection Efficiency %', 'Average Collection Period (DSO)'] },
    'payables': { 'title': 'Payables Dashboard', 'kpis': ['Outstanding Vendors', 'Current', '30 Days', '60 Days', '90 Days', 'Upcoming Payments', 'Average Payment Days (DPO)'] },
    'bank': { 'title': 'Bank Dashboard', 'kpis': ['Current Balance', 'Total Bank Balance', 'Cash vs Bank'] },
    'expense': { 'title': 'Expense Dashboard', 'kpis': ['Salary', 'Rent', 'Electricity', 'Marketing', 'Office Expenses', 'Travel', 'Expense Growth %'] },
    'compliance': { 'title': 'Tax & Compliance Dashboard', 'kpis': ['GST Payable', 'GST Receivable', 'GST Filed', 'TDS Payable', 'PF', 'Income Tax'] },
    'ratios': { 'title': 'Financial Ratios', 'kpis': ['Current Ratio', 'Quick Ratio', 'Gross Margin', 'Net Margin', 'EBITDA Margin', 'ROA', 'ROE', 'ROCE', 'Inventory Turnover', 'Asset Turnover', 'Debtor Days (DSO)', 'Creditor Days (DPO)', 'Debt Equity Ratio', 'Interest Coverage Ratio'] },
    'working-capital': { 'title': 'Working Capital Dashboard', 'kpis': ['Current Assets', 'Current Liabilities', 'Working Capital', 'Receivables', 'Payables', 'Inventory', 'Working Capital Cycle', 'Cash Conversion Cycle'] },
    'budget': { 'title': 'Budget vs Actual', 'kpis': ['Revenue', 'Expense', 'Profit', 'Cash Flow', 'Variance %'] },
    'customer-analytics': { 'title': 'Customer Analytics', 'kpis': ['Customer-wise Revenue', 'Outstanding by Customer', 'Customer Growth', 'Inactive Customers', 'New Customers', 'Repeat Customers'] },
    'vendor-analytics': { 'title': 'Vendor Analytics', 'kpis': ['Vendor Spend', 'Outstanding Vendors', 'Purchase Trend', 'Vendor Payment Performance'] },
    'alerts': { 'title': 'Business Alerts', 'kpis': ['Negative Cash Balance', 'GST Due', 'TDS Due', 'Large Overdue Receivables', 'High Expenses', 'Inventory Shortage', 'Sales Drop'] },
    'forecast': { 'title': 'Forecast Dashboard', 'kpis': ['Next Month Revenue Forecast', 'Expected Collections', 'Expected Payments', 'Projected Cash Flow', 'Projected Profit', 'Cash Requirement'] },
    'investor': { 'title': 'Investor Dashboard', 'kpis': ['Revenue Growth %', 'EBITDA', 'Net Profit', 'Operating Cash Flow', 'Free Cash Flow', 'ROE', 'ROCE', 'Debt-Equity Ratio', 'Net Worth', 'Working Capital', 'Cash Balance', 'Monthly Burn Rate', 'ROI'] },
    'director': { 'title': 'Director Decision Panel', 'kpis': ['Can we pay salaries this month?', 'Can we pay vendors on time?', 'How much cash is available today?', 'Is revenue ahead or behind target?', 'What is this month’s expected profit?', 'Are any statutory filings due?'] }
}

base_dir = r"c:\Users\yashs\Downloads\Tally\frontend\src\app"

template = """\"use client\";

import React from "react";
import {{ Card, CardContent, CardHeader, CardTitle }} from "@/components/ui/card";
import {{ GenericDashboardView }} from "@/components/layout/GenericDashboardView";
import {{ Activity, TrendingUp, DollarSign, AlertCircle, PieChart, BarChart3, Users, Briefcase }} from "lucide-react";

// Mock data based on the required KPIs
const mockData = {{
{mock_data}
}};

export default function {component_name}() {{
  return (
    <div className="p-6 space-y-6">
      <GenericDashboardView title="{title}" data={{mockData}} />
    </div>
  );
}}
"""

def generate_mock_data(kpis):
    lines = []
    for kpi in kpis:
        # If it's a question or alert, make it a string, else a number
        if "?" in kpi or "Alert" in kpi or kpi.startswith("Can we"):
            lines.append(f'  "{kpi}": "Requires Review 🟡",')
        elif "%" in kpi or "Ratio" in kpi or "Margin" in kpi or "ROE" in kpi or "ROCE" in kpi or "ROI" in kpi:
            lines.append(f'  "{kpi}": "15.4%",')
        elif "Days" in kpi or "Cycle" in kpi:
            lines.append(f'  "{kpi}": "45 Days",')
        else:
            # Random-ish number between 10k and 10Cr
            import random
            val = random.randint(100000, 50000000)
            lines.append(f'  "{kpi}": {val},')
    return "\n".join(lines)

for route, info in routes.items():
    route_dir = os.path.join(base_dir, route)
    if not os.path.exists(route_dir):
        os.makedirs(route_dir)
    
    page_path = os.path.join(route_dir, "page.tsx")
    
    comp_name = "".join([part.capitalize() for part in route.split('-')]) + "Page"
    mock_str = generate_mock_data(info['kpis'])
    
    content = template.format(
        title=info['title'],
        component_name=comp_name,
        mock_data=mock_str
    )
    
    with open(page_path, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print(f"Created: {page_path}")

print("Scaffolding complete.")
