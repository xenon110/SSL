import sys
import os
import json
import traceback

from dotenv import load_dotenv

env_path = os.path.join(os.path.dirname(__file__), '.env')
if os.path.exists(env_path):
    load_dotenv(env_path)

from tally_client import TallyClient

def get_dynamic_metrics(company_name, from_date, to_date):
    tally_url = os.getenv("TALLY_URL", "http://localhost:9000")
    tally = TallyClient(url=tally_url, company_name=company_name)
    
    try:
        pnl_xml = tally.export_profit_and_loss(from_date=from_date, to_date=to_date)
        bs_xml = tally.export_balance_sheet(from_date=from_date, to_date=to_date)
        
        if not pnl_xml or not bs_xml:
            print(json.dumps({"error": "Failed to fetch data from Tally. Ensure Tally is open and running."}))
            sys.exit(1)
            
        pnl_data = tally.parse_profit_and_loss(pnl_xml)
        bs_data = tally.parse_balance_sheet(bs_xml)

        sales = pnl_data.get("Sales Accounts", 0)
        direct_inc = pnl_data.get("Direct Incomes", 0)
        indirect_inc = pnl_data.get("Indirect Incomes", 0)
        total_revenue = sales + direct_inc + indirect_inc

        direct_exp = pnl_data.get("Direct Expenses", 0)
        indirect_exp = pnl_data.get("Indirect Expenses", 0)
        
        cost_of_sales = 0
        for k, v in pnl_data.items():
            if "Cost of Sales" in k:
                cost_of_sales = v
                break
        
        if cost_of_sales == 0:
            opening_stock = pnl_data.get("Opening Stock", 0)
            purchases = pnl_data.get("Purchase Accounts", pnl_data.get("Add: Purchase Accounts", 0))
            closing_stock = pnl_data.get("Closing Stock", pnl_data.get("Less: Closing Stock", 0))
            cost_of_sales = opening_stock + purchases - closing_stock + direct_exp
            
        gross_profit = sales + direct_inc - cost_of_sales
        net_profit = gross_profit + indirect_inc - indirect_exp
        
        total_expenses = cost_of_sales + indirect_exp

        ebitda = net_profit + pnl_data.get("Depreciation", 0) + pnl_data.get("Interest", 0)

        cash_in_bank = bs_data.get("Bank Accounts", 0)
        cash_on_hand = bs_data.get("Cash-in-hand", 0)
        receivables = bs_data.get("Sundry Debtors", 0)
        payables = bs_data.get("Sundry Creditors", 0)

        current_assets = bs_data.get("Current Assets", 0)
        current_liabilities = bs_data.get("Current Liabilities", 0)
        working_capital = current_assets - current_liabilities
        current_ratio = round(current_assets / current_liabilities, 2) if current_liabilities else 0
        
        loans = bs_data.get("Loans (Liability)", 0)
        capital = bs_data.get("Capital Account", 0)
        debt_equity = round(loans / capital, 2) if capital else 0
        net_worth = capital + bs_data.get("Reserves & Surplus", net_profit)
        
        total_assets = bs_data.get("Fixed Assets", 0) + bs_data.get("Current Assets", 0) + bs_data.get("Investments", 0) + bs_data.get("Miscellaneous Expenses (AS)", 0)
        capital_employed = total_assets - current_liabilities

        metrics_data = {
            "Total Revenue": total_revenue,
            "Total Expenses": total_expenses,
            "Gross Profit": gross_profit,
            "Net Profit": net_profit,
            "EBITDA": ebitda,
            "Cash in Bank": cash_in_bank,
            "Cash on Hand": cash_on_hand,
            "Accounts Receivable": receivables,
            "Accounts Payable": payables,
            "Working Capital": working_capital,
            "Current Ratio": current_ratio,
            "Debt-Equity Ratio": debt_equity,
            "Net Worth": net_worth,
            "Total Assets": total_assets,
            "Capital Employed": capital_employed,
            "Expense Breakdown": pnl_data.get("Expense Breakdown", {}),
            "BS Breakdown": bs_data,
            "Cost of Sales": cost_of_sales,
            "Direct Expenses": direct_exp,
            "Indirect Expenses": indirect_exp,
            "Direct Incomes": direct_inc,
            "Indirect Incomes": indirect_inc,
            "Sales Accounts": sales
        }

        return {"success": True, "data": metrics_data}
        
    except Exception as e:
        return {"error": str(e), "traceback": traceback.format_exc()}

if __name__ == "__main__":
    if len(sys.argv) < 4:
        print(json.dumps({"error": "Usage: fetch_dynamic_metrics.py <company_name> <YYYYMMDD> <YYYYMMDD>"}))
        sys.exit(1)
        
    company_name = sys.argv[1]
    start_date = sys.argv[2]
    end_date = sys.argv[3]
    
    result = get_dynamic_metrics(company_name, start_date, end_date)
    print(json.dumps(result))
