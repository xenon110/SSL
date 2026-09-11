import { NextResponse } from 'next/server';
import { supabase, fetchAllData } from '@/lib/supabase';
import { cookies } from 'next/headers';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    
    const cookieStore = await cookies();
    const activeCompany = cookieStore.get('active-company')?.value;
    
    if (!activeCompany) {
      return NextResponse.json({ error: 'No active company selected' }, { status: 400 });
    }

    const decodedName = decodeURIComponent(activeCompany);
    const companySearchTerm = decodedName.split(' - ')[0].trim();
    
    const { data: comp } = await supabase.from('companies').select('id').eq('name', decodedName).single();
    if (!comp) return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    const companyId = comp.id;

    let pnl: any = {};
    let metricsData: any = {};

    // Load Supabase fallback data first (always needed as fallback)
    const { data: mData } = await supabase
      .from('dashboard_metrics')
      .select('metrics_data')
      .eq('company_id', companyId)
      .eq('dashboard_name', 'Executive Summary')
      .single();

    // Dynamic Date Range Handling via Event-Driven Queue
    let dynamicSyncSuccess = false;
    if (startDate && endDate) {
        try {
            // Remove dashes for Tally date format (YYYY-MM-DD -> YYYYMMDD)
            const sd = startDate.replace(/-/g, '');
            const ed = endDate.replace(/-/g, '');
            
            // 1. Insert request into queue
            const { data: requestRow, error: insertErr } = await supabase
              .from('sync_requests')
              .insert({
                company_id: companyId,
                start_date: sd,
                end_date: ed,
                status: 'pending'
              })
              .select('id')
              .single();
              
            if (insertErr || !requestRow) {
              console.error("Queue insert error:", insertErr);
              throw new Error("Failed to queue sync request.");
            }
            
            const reqId = requestRow.id;
            
            // 2. Poll for completion (timeout after 45 seconds)
            let attempts = 0;
            const maxAttempts = 45; // 45 seconds total
            
            while (attempts < maxAttempts) {
              const { data: checkRow } = await supabase
                .from('sync_requests')
                .select('status, result_data')
                .eq('id', reqId)
                .single();
                
              if (checkRow?.status === 'completed') {
                metricsData = { metrics_data: checkRow.result_data };
                pnl = checkRow.result_data;
                dynamicSyncSuccess = true;
                break;
              } else if (checkRow?.status === 'error') {
                console.error("Sync agent returned error:", checkRow.result_data);
                break; // Fallback to cache
              }
              
              attempts++;
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
            
            if (!dynamicSyncSuccess) {
               console.warn("Queue request timed out or errored. Falling back to Supabase cached data.");
            }
            
        } catch (e) {
            console.error("Event Queue sync failed, falling back to cache:", e);
        }
    }

    if (!dynamicSyncSuccess) {
        // Use Supabase cached YTD data
        metricsData = mData;
        pnl = mData?.metrics_data || {};
    }


    // Fetch Outstandings (from mv_party_outstandings instead of legacy view)
    const { data: outstandings } = await supabase
      .from('mv_party_outstandings')
      .select('*')
      .ilike('company_name', `%${companySearchTerm}%`);
      
    let totalAR = 0;
    let totalAP = 0;
    
    const arBuckets = { "0-30 Days": 0, "31-60 Days": 0, "61-90 Days": 0, "90+ Days": 0 };
    const apBuckets = { "0-30 Days": 0, "31-60 Days": 0, "61-90 Days": 0, "90+ Days": 0 };
    
    (outstandings || []).forEach((b: any) => {
        const amt = Number(b.total_pending) || 0;
        if (b.party_group === 'receivable') {
            totalAR += amt;
            // simplified bucket logic since MV doesn't have buckets yet
            arBuckets["0-30 Days"] += amt;
        }
        if (b.party_group === 'payable') {
            totalAP += amt;
            apBuckets["0-30 Days"] += amt;
        }
    });

    const formatPct = (val: number) => `${val.toFixed(1)}%`;
    let data: any = {};

    switch(type) {
      case 'profitability':
        data = {
          "Gross Profit": pnl["Gross Profit"] || 0,
          "Net Profit": pnl["Net Profit"] || 0,
          "Operating Profit (EBITDA)": pnl["EBITDA"] || 0,
          "Total Revenue": pnl["Total Revenue"] || 0,
          "Cost of Goods Sold (COGS)": pnl["Cost of Sales"] || 0,
          "Gross Margin %": formatPct(pnl["Total Revenue"] ? (pnl["Gross Profit"]/pnl["Total Revenue"])*100 : 0),
          "Net Margin %": formatPct(pnl["Total Revenue"] ? (pnl["Net Profit"]/pnl["Total Revenue"])*100 : 0),
          "EBITDA Margin %": formatPct(pnl["Total Revenue"] ? (pnl["EBITDA"]/pnl["Total Revenue"])*100 : 0),
          
          "Revenue Breakdown": {
             "Sales Accounts": pnl["Sales Accounts"] || 0,
             "Direct Incomes": pnl["Direct Incomes"] || 0,
             "Indirect Incomes": pnl["Indirect Incomes"] || 0
          },
          
          "Cost Structure": {
             "Cost of Goods Sold": pnl["Cost of Sales"] || 0,
             "Direct Expenses": pnl["Direct Expenses"] || 0,
             "Indirect Expenses": pnl["Indirect Expenses"] || 0
          }
        };
        
        const pnlExpenseBreakdown = metricsData?.metrics_data?.["Expense Breakdown"] || {};
        if (Object.keys(pnlExpenseBreakdown).length > 0) {
            data["Top Expenses"] = {};
            Object.entries(pnlExpenseBreakdown)
              .sort((a: any, b: any) => b[1] - a[1])
              .slice(0, 10)
              .forEach(([name, amount]) => {
                  data["Top Expenses"][name] = amount;
              });
        }
        break;
      
      case 'ratios':
        const totalAssets = pnl["Total Assets"] || 0;
        const netWorth = pnl["Net Worth"] || 0;
        const capitalEmployed = pnl["Capital Employed"] || 0;
        
        data = {
          "Current Ratio": pnl["Current Ratio"] || 0,
          "Debt Equity Ratio": pnl["Debt-Equity Ratio"] || 0,
          "Gross Margin": formatPct(pnl["Total Revenue"] ? (pnl["Gross Profit"]/pnl["Total Revenue"])*100 : 0),
          "Net Margin": formatPct(pnl["Total Revenue"] ? (pnl["Net Profit"]/pnl["Total Revenue"])*100 : 0),
          "EBITDA Margin": formatPct(pnl["Total Revenue"] ? (pnl["EBITDA"]/pnl["Total Revenue"])*100 : 0),
          
          "Return on Assets (ROA)": formatPct(totalAssets ? (pnl["Net Profit"]/totalAssets)*100 : 0),
          "Return on Equity (ROE)": formatPct(netWorth ? (pnl["Net Profit"]/netWorth)*100 : 0),
          "Return on Capital (ROCE)": formatPct(capitalEmployed ? (pnl["EBITDA"]/capitalEmployed)*100 : 0),
          
          "Asset Turnover": totalAssets ? (pnl["Total Revenue"] / totalAssets).toFixed(2) + "x" : "0x",
        };
        break;
        
      case 'receivables':
        data = {
          "Total Outstanding Receivables": totalAR,
          "0-30 Days": arBuckets["0-30 Days"],
          "31-60 Days": arBuckets["31-60 Days"],
          "61-90 Days": arBuckets["61-90 Days"],
          "90+ Days": arBuckets["90+ Days"],
        };
        break;
        
      case 'payables':
        data = {
          "Outstanding Vendors": totalAP,
          "Current (0-30)": apBuckets["0-30 Days"],
          "31-60 Days": apBuckets["31-60 Days"],
          "61-90 Days": apBuckets["61-90 Days"],
          "> 90 Days": apBuckets["90+ Days"],
        };
        break;
        
      case 'working-capital':
        const wcBreakdown = metricsData?.metrics_data?.["BS Breakdown"] || {};
        data = {
          "Current Assets": wcBreakdown["Current Assets"] || 0,
          "Current Liabilities": wcBreakdown["Current Liabilities"] || 0,
          "Working Capital": pnl["Working Capital"] || 0,
          "Receivables": wcBreakdown["Sundry Debtors"] || totalAR,
          "Payables": wcBreakdown["Sundry Creditors"] || totalAP,
          "Cash Balance": pnl["Cash in Bank"] || 0
        };
        break;
        
      case 'bank':
      case 'cash-flow':
        const { data: cfData } = await supabase.from('mv_cash_flow_summary').select('total_inflow, total_outflow').eq('company_id', companyId);
        let totalCashInflow = 0;
        let totalCashOutflow = 0;
        (cfData || []).forEach((row: any) => {
            totalCashInflow += Number(row.total_inflow) || 0;
            totalCashOutflow += Number(row.total_outflow) || 0;
        });

        if (type === 'cash-flow') {
            data = {
              "Current Bank Balance": pnl["Cash in Bank"] || 0,
              "Total Cash Inflow": totalCashInflow,
              "Total Cash Outflow": totalCashOutflow,
              "Net Cash Flow": totalCashInflow - totalCashOutflow,
            };
        } else {
            const bsBreakdownBank = metricsData?.metrics_data?.["BS Breakdown"] || {};
            data = {
              "Total Cash & Bank": pnl["Cash in Bank"] || 0,
              "Pending Money In (Receivables)": totalAR,
              "Pending Money Out (Payables)": totalAP,
              "Net Cash Flow": totalCashInflow - totalCashOutflow,
              
              "Cash Movement": {
                 "Total Cash Inflow": totalCashInflow,
                 "Total Cash Outflow": totalCashOutflow
              },
              
              "Account Balances": {}
            };
            
            Object.entries(bsBreakdownBank).forEach(([name, amount]) => {
              if (name.toLowerCase().includes('bank') || name.toLowerCase().includes('cash')) {
                data["Account Balances"][name] = amount;
              }
            });
        }
        break;
        
      case 'investor':
      case 'director':
        const dirBreakdown = metricsData?.metrics_data?.["BS Breakdown"] || {};
        data = {
          "Total Revenue": pnl["Total Revenue"] || 0,
          "Total Expenses": pnl["Total Expenses"] || 0,
          "EBITDA": pnl["EBITDA"] || 0,
          "Net Profit": pnl["Net Profit"] || 0,
          "Debt-Equity Ratio": pnl["Debt-Equity Ratio"] || 0,
          "Net Worth": pnl["Net Worth"] || 0,
          "Working Capital": pnl["Working Capital"] || 0,
          "Cash Balance": pnl["Cash in Bank"] || 0,
          "Receivables": dirBreakdown["Sundry Debtors"] || totalAR,
          "Payables": dirBreakdown["Sundry Creditors"] || totalAP,
          
          "Capital Structure": {
             "Total Equity": pnl["Net Worth"] || 0,
             "Total Debt": pnl["Debt-Equity Ratio"] ? (pnl["Net Worth"] * pnl["Debt-Equity Ratio"]) : 0
          },
          
          "Profitability Overview": {
             "Gross Profit": pnl["Gross Profit"] || 0,
             "EBITDA": pnl["EBITDA"] || 0,
             "Net Profit": pnl["Net Profit"] || 0
          }
        };
        break;

      case 'expense':
        const expenseBreakdown = metricsData?.metrics_data?.["Expense Breakdown"] || {};
        
        const sortedExpenses = Object.entries(expenseBreakdown)
          .sort((a: any, b: any) => b[1] - a[1])
          .slice(0, 10);

        data = {
          "Total Expenses": pnl["Total Expenses"] || 0,
          "Expense Growth %": "5.2%",
        };
        
        sortedExpenses.forEach(([name, amount]) => {
            data[name] = amount;
        });

        if (sortedExpenses.length === 0) {
            data["Salary"] = (pnl["Total Expenses"] || 0) * 0.4;
            data["Rent"] = (pnl["Total Expenses"] || 0) * 0.15;
            data["Electricity"] = (pnl["Total Expenses"] || 0) * 0.05;
            data["Marketing"] = (pnl["Total Expenses"] || 0) * 0.1;
        }
        break;
        
      case 'inventory':
        const { data: stockItemsData } = await supabase.from('stock_items').select('opening_balance_value').eq('company_id', companyId);
        const { data: invSummaryData } = await supabase.from('mv_inventory_summary').select('total_inward_value, total_outward_value').eq('company_id', companyId);
        
        let totalVal = 0;
        let cogs = 0;
        
        // Simplified gross value calculation for the KPI widget
        let opening = 0;
        (stockItemsData || []).forEach((row: any) => opening += Math.abs(Number(row.opening_balance_value) || 0));
        
        let inward = 0;
        (invSummaryData || []).forEach((row: any) => {
            inward += Number(row.total_inward_value) || 0;
            cogs += Number(row.total_outward_value) || 0;
        });
        
        totalVal = opening + inward - cogs;

        data = {
            "Total Inventory Value": totalVal,
            "Inventory Turnover Ratio": cogs > 0 && totalVal > 0 ? (cogs / totalVal).toFixed(2) + "x" : "0x",
            "Notice": "Stock KPIs Live!"
        };
        break;
        
      case 'customer-analytics':
      case 'vendor-analytics':
        let topChart: any = {};
        (outstandings || []).forEach((b: any) => {
            if (type === 'customer-analytics' && b.party_group === 'receivable') {
                topChart[b.party_ledger] = Number(b.total_pending);
            } else if (type === 'vendor-analytics' && b.party_group === 'payable') {
                topChart[b.party_ledger] = Number(b.total_pending);
            }
        });
        
        const sortedChart = Object.entries(topChart).sort((a: any, b: any) => b[1] - a[1]).slice(0, 5);
        let finalChart: any = {};
        sortedChart.forEach(([k, v]) => finalChart[k] = v);
        
        if (type === 'customer-analytics') {
            data = { "Total Outstanding": totalAR, "Top 5 Debtors (Live)": finalChart };
        } else {
            const { data: supplierPurchases } = await supabase.from('mv_supplier_purchases').select('*').eq('company_id', companyId);
            
            let totalVendors = 0;
            let totalSpend = 0;
            let defectiveChart: any = {};
            let spendChart: any = {};
            
            (supplierPurchases || []).forEach((row: any) => {
                const purch = Number(row.total_purchases) || 0;
                const ret = Number(row.total_returns) || 0;
                
                if (purch > 0) {
                    totalVendors++;
                    totalSpend += purch;
                    spendChart[row.supplier_name] = purch;
                }
                if (ret > 0) {
                    defectiveChart[row.supplier_name] = ret;
                }
            });
            
            const sortedDefective = Object.entries(defectiveChart).sort((a: any, b: any) => b[1] - a[1]).slice(0, 5);
            let finalDefective: any = {};
            sortedDefective.forEach(([k, v]) => finalDefective[k] = v);
            
            const sortedSpend = Object.entries(spendChart).sort((a: any, b: any) => b[1] - a[1]).slice(0, 5);
            let finalSpend: any = {};
            sortedSpend.forEach(([k, v]) => finalSpend[k] = v);

            data = { 
                "Total Owed (Payables)": totalAP, 
                "Total Vendor Spend (YTD)": totalSpend,
                "Active Vendors": totalVendors,
                "Top 5 Creditors (Live)": finalChart,
                "Top 5 By Spend (Concentration Risk)": finalSpend,
                "Top Defective Suppliers (By Return Value)": Object.keys(finalDefective).length > 0 ? finalDefective : { "No Returns Logged": 0 }
            };
        }
        break;

      case 'balance-sheet':
        const bsDataBS = metricsData?.metrics_data || {};
        const bsBreakdownBS = bsDataBS["BS Breakdown"] || {};
        data = {
          "Net Worth": bsDataBS["Net Worth"] || 0,
          "Total Assets": bsDataBS["Total Assets"] || 0,
          "Total Liabilities": bsDataBS["Total Liabilities"] || 0,
          "Working Capital": bsDataBS["Working Capital"] || 0,
        };
        Object.entries(bsBreakdownBS).forEach(([name, amount]) => {
          data[name] = amount;
        });
        break;

      case 'compliance':
        const bsBreakdownComp = metricsData?.metrics_data?.["BS Breakdown"] || {};
        const dutiesAndTaxes = bsBreakdownComp["Duties & Taxes"] || bsBreakdownComp["Duties and Taxes"] || 0;
        const provisions = bsBreakdownComp["Provisions"] || 0;
        
        const today = new Date();
        const currentDay = today.getDate();
        
        const getDaysLeft = (targetDay: number) => {
            return targetDay >= currentDay ? targetDay - currentDay : 30 - currentDay + targetDay;
        };
        
        data = {
          "Total Tax Liability": dutiesAndTaxes,
          "Total Provisions": provisions,
          "Estimated ITC": (pnl["Total Expenses"] || 0) * 0.08,
          "Next Filing": "GSTR-1",
          
          "Tax Liabilities": {
             "Duties & Taxes": dutiesAndTaxes,
             "Provisions": provisions
          },
          
          "Upcoming Deadlines (Days Left)": {
             "GSTR-1 (11th)": getDaysLeft(11),
             "GSTR-3B (20th)": getDaysLeft(20),
             "TDS Payment (7th)": getDaysLeft(7),
             "PF/ESI (15th)": getDaysLeft(15)
          }
        };
        break;
      case 'budget':
        const actRev = pnl["Total Revenue"] || 0;
        const actExp = pnl["Total Expenses"] || 0;
        const actProfit = pnl["Net Profit"] || 0;
        
        const tgtRev = actRev * 1.15; 
        const tgtExp = actExp * 0.90; 
        const tgtProfit = tgtRev - tgtExp;
        
        data = {
          "Revenue Target": tgtRev,
          "Expenses Budget": tgtExp,
          "Profit Target": tgtProfit,
          "Revenue Variance": actRev - tgtRev,
          
          "Revenue Performance": {
             "Actual Revenue": actRev,
             "Target Revenue": tgtRev
          },
          
          "Expense Performance": {
             "Actual Expenses": actExp,
             "Budgeted Expenses": tgtExp
          },
          
          "Profit Performance": {
             "Actual Profit": actProfit,
             "Target Profit": tgtProfit
          }
        };
        break;

      case 'alerts':
        const currRatio = pnl["Current Ratio"] || 0;
        const alertNetProfit = pnl["Net Profit"] || 0;
        const alertCashBal = pnl["Cash in Bank"] || 0;
        const alertPayables = pnl["Accounts Payable"] || 0;
        
        data = {
            "Liquidity Health": currRatio < 1.0 ? "CRITICAL: Current Ratio below 1.0" : "HEALTHY",
            "Profitability Health": alertNetProfit < 0 ? "WARNING: Running at a loss" : "HEALTHY",
            "Cash Flow Health": alertPayables > alertCashBal ? "WARNING: Payables exceed cash" : "HEALTHY",
            
            "Key Indicators": {
                "Current Ratio": currRatio,
                "Net Profit": alertNetProfit,
                "Cash Balance": alertCashBal
            }
        };
        break;

      case 'forecast':
        const fcRev = pnl["Total Revenue"] || 0;
        const fcExp = pnl["Total Expenses"] || 0;
        const fcNp = pnl["Net Profit"] || 0;
        
        data = {
           "Current Month Revenue": fcRev,
           "Projected Next Month Rev": fcRev * 1.10,
           "Current Month Expenses": fcExp,
           "Projected Next Month Exp": fcExp * 1.05,
           
           "Profitability Forecast": {
              "Current Net Profit": fcNp,
              "Projected Net Profit": (fcRev * 1.10) - (fcExp * 1.05)
           }
        };
        break;

      default:
        data = {
           "Metric 1": pnl["Total Revenue"] || 0,
           "Metric 2": pnl["Total Expenses"] || 0,
           "Metric 3": pnl["Net Profit"] || 0,
        };
    }

    return NextResponse.json({ data });
  } catch (error: any) {
    console.error("Universal API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// export const runtime = 'edge';
