export const mockDashboardData = {
  executive: {
    revenue: 1250000.00,
    netProfit: 350000.00,
    cashBalance: 850000.00,
    receivables: 420000.00,
    payables: 180000.00,
    trend: [
      { month: "Jan", revenue: 200000, expense: 150000 },
      { month: "Feb", revenue: 220000, expense: 160000 },
      { month: "Mar", revenue: 250000, expense: 170000 },
      { month: "Apr", revenue: 210000, expense: 140000 },
      { month: "May", revenue: 280000, expense: 190000 },
      { month: "Jun", revenue: 300000, expense: 200000 },
    ]
  },
  sales: {
    totalSales: 1250000.00,
    topCustomers: [
      { ledger_name: "Acme Corp", amount: 450000 },
      { ledger_name: "Global Tech", amount: 320000 },
      { ledger_name: "Stark Industries", amount: 210000 },
      { ledger_name: "Wayne Enterprises", amount: 150000 },
      { ledger_name: "Cyberdyne Systems", amount: 120000 }
    ],
    topItems: [
      { stock_item_name: "MacBook Pro M3", qty: 15, value: 300000 },
      { stock_item_name: "Dell UltraSharp 32\"", qty: 25, value: 150000 },
      { stock_item_name: "Logitech MX Master 3S", qty: 50, value: 50000 }
    ]
  },
  purchase: {
    totalPurchases: 800000.00,
    topSuppliers: [
      { ledger_name: "Tech Data Distributors", amount: 500000 },
      { ledger_name: "Ingram Micro", amount: 200000 },
      { ledger_name: "Redington India", amount: 100000 }
    ],
    recentPurchases: [
      { date: "2023-10-01", voucher_number: "PUR/001", amount: 50000, supplier: "Tech Data Distributors" },
      { date: "2023-10-03", voucher_number: "PUR/002", amount: 120000, supplier: "Ingram Micro" }
    ]
  },
  receivable: {
    totalOutstanding: 420000.00,
    aging: {
      "0_30": 200000,
      "31_60": 150000,
      "61_90": 50000,
      "90_plus": 20000
    },
    defaulters: [
      { ledger_name: "Alpha Solutions", overdue_days: 95, amount: 20000 },
      { ledger_name: "Beta Innovations", overdue_days: 65, amount: 50000 }
    ]
  },
  payable: {
    totalPayable: 180000.00,
    upcomingPayments: [
      { ledger_name: "Office Supplies Co.", dueDate: "2023-10-15", amount: 15000 },
      { ledger_name: "WeWork", dueDate: "2023-10-20", amount: 45000 },
      { ledger_name: "AWS", dueDate: "2023-10-25", amount: 120000 }
    ]
  },
  cashFlow: {
    openingBalance: 100000.00,
    inflow: 500000.00,
    outflow: 300000.00,
    closingBalance: 300000.00
  },
  profitAndLoss: {
    salesAccounts: 1250000,
    directExpenses: 400000,
    grossProfit: 850000,
    indirectExpenses: 200000,
    netProfit: 650000
  },
  expense: {
    totalExpense: 200000,
    breakdown: [
      { category: "Salaries", amount: 120000 },
      { category: "Rent", amount: 50000 },
      { category: "Travel", amount: 30000 }
    ]
  },
  gstAndCompliance: {
    cgst_payable: 25000,
    sgst_payable: 25000,
    igst_payable: 10000,
    itc_available: 30000,
    net_liability: 30000
  },
  inventory: {
    totalValue: 850000.00,
    lowStockAlerts: [
      { item_name: "Dell Monitors", current_qty: 2, reorder_level: 10 },
      { item_name: "HDMI Cables", current_qty: 5, reorder_level: 50 }
    ]
  },
  bankAndLoan: {
    bankBalances: [
      { ledger_name: "HDFC Current", amount: 450000 },
      { ledger_name: "SBI Overdraft", amount: -150000 }
    ]
  },
  workingCapital: {
    currentAssets: 1500000,
    currentLiabilities: 500000,
    currentRatio: 3.0
  },
  auditAndControl: {
    anomalies: [
      { type: "Deleted Voucher", voucher_no: "SAL/102", date: "2023-10-05" },
      { type: "High Cash Payment", voucher_no: "PMT/044", amount: 50000 }
    ]
  },
  collection: {
    dso: 45, 
    target: 500000,
    collected: 350000
  },
  paymentPlanning: {
    week1: 50000,
    week2: 120000,
    week3: 10000,
    week4: 0
  },
  alerts: [
    { id: 1, type: "warning", message: "Tally Sync failed at 10:00 AM" },
    { id: 2, type: "critical", message: "Payment to Office Supplies Co. is overdue by 5 days" }
  ],
  powerBiPurchases: {
    kpis: {
      totalPurchases: { value: 800000.00, growth: 2.5 },
      avgOrderValue: { value: 12000.00, growth: -1.0 },
      activeSuppliers: { value: 45, growth: 1.5 },
      pendingOrders: { value: 12, growth: 0 }
    },
    purchaseTrend: [
      { month: "Jan", spend: 300000, budget: 330000 },
      { month: "Feb", spend: 310000, budget: 340000 }
    ],
    spendByCategory: [
      { name: "Raw Materials", value: 45 },
      { name: "Services", value: 30 }
    ],
    supplierPerformance: [
      { name: "Tech Data", rating: 4.5, onTime: 95 },
      { name: "Ingram", rating: 4.2, onTime: 88 }
    ],
    poStatus: [
      { status: "Delivered", value: 60 },
      { status: "Pending", value: 30 }
    ]
  },
  powerBiSales: {
    kpis: {
      totalRevenue: { value: 4580000.00, growth: 12.5 },
      grossMargin: { value: 32.4, growth: 1.2 },
      avgOrderValue: { value: 15400.00, growth: -2.1 },
      activeCustomers: { value: 245, growth: 5.0 }
    },
    salesTrend: [
      { month: "Jan", revenue: 320000, target: 300000 },
      { month: "Feb", revenue: 340000, target: 310000 },
      { month: "Mar", revenue: 410000, target: 330000 },
      { month: "Apr", revenue: 380000, target: 340000 },
      { month: "May", revenue: 450000, target: 360000 },
      { month: "Jun", revenue: 490000, target: 380000 },
      { month: "Jul", revenue: 520000, target: 400000 },
      { month: "Aug", revenue: 510000, target: 420000 },
      { month: "Sep", revenue: 580000, target: 440000 },
      { month: "Oct", revenue: 610000, target: 460000 },
      { month: "Nov", revenue: 640000, target: 480000 },
      { month: "Dec", revenue: 700000, target: 500000 }
    ],
    salesByCategory: [
      { name: "Electronics", value: 45 },
      { name: "Software", value: 30 },
      { name: "Services", value: 15 },
      { name: "Hardware", value: 10 }
    ],
    salesByRegion: [
      { region: "Maharashtra", sales: 1250000 },
      { region: "Karnataka", sales: 980000 },
      { region: "Delhi", sales: 850000 },
      { region: "Gujarat", sales: 620000 },
      { region: "Tamil Nadu", sales: 550000 }
    ],
    topCustomers: [
      { name: "Acme Corp", sales: 450000 },
      { name: "Global Tech", sales: 320000 },
      { name: "Stark Industries", sales: 210000 },
      { name: "Wayne Enterprises", sales: 150000 },
      { name: "Cyberdyne Systems", sales: 120000 }
    ],
    recentTransactions: [
      { id: "SAL/1045", date: "2023-10-05", customer: "Acme Corp", amount: 45000, status: "Paid" },
      { id: "SAL/1046", date: "2023-10-06", customer: "Stark Industries", amount: 120000, status: "Pending" },
      { id: "SAL/1047", date: "2023-10-06", customer: "Global Tech", amount: 35000, status: "Paid" },
      { id: "SAL/1048", date: "2023-10-07", customer: "Wayne Enterprises", amount: 89000, status: "Overdue" },
      { id: "SAL/1049", date: "2023-10-08", customer: "Cyberdyne Systems", amount: 15000, status: "Paid" }
    ],
    yoyComparison: [
      { month: "Jan", currentYear: 320000, previousYear: 280000 },
      { month: "Feb", currentYear: 340000, previousYear: 290000 },
      { month: "Mar", currentYear: 410000, previousYear: 310000 },
      { month: "Apr", currentYear: 380000, previousYear: 340000 },
      { month: "May", currentYear: 450000, previousYear: 360000 },
      { month: "Jun", currentYear: 490000, previousYear: 380000 },
      { month: "Jul", currentYear: 520000, previousYear: 400000 },
      { month: "Aug", currentYear: 510000, previousYear: 420000 },
      { month: "Sep", currentYear: 580000, previousYear: 470000 },
      { month: "Oct", currentYear: 610000, previousYear: 490000 },
      { month: "Nov", currentYear: 640000, previousYear: 520000 },
      { month: "Dec", currentYear: 700000, previousYear: 550000 }
    ],
    profitabilityByCategory: [
      { category: "Electronics", revenue: 1500000, marginPercent: 12 },
      { category: "Software", revenue: 1000000, marginPercent: 75 },
      { category: "Services", revenue: 800000, marginPercent: 60 },
      { category: "Hardware", revenue: 500000, marginPercent: 25 },
      { category: "Accessories", revenue: 200000, marginPercent: 45 }
    ],
    salesFunnel: [
      { stage: "1. Quotes Issued", amount: 8500000 },
      { stage: "2. Sales Orders", amount: 5200000 },
      { stage: "3. Pending Delivery", amount: 2100000 },
      { stage: "4. Invoiced (Billed)", amount: 4580000 }
    ],
    salesVsCollections: [
      { month: "May", sales: 450000, collections: 420000 },
      { month: "Jun", sales: 490000, collections: 460000 },
      { month: "Jul", sales: 520000, collections: 480000 },
      { month: "Aug", sales: 510000, collections: 410000 },
      { month: "Sep", sales: 580000, collections: 500000 },
      { month: "Oct", sales: 610000, collections: 540000 }
    ],
    detailedTransactions: [
      {
        id: "SAL/1045",
        date: "2023-10-05",
        particulars: "MacBook Pro M3",
        buyerSupplier: "Acme Corp",
        buyerSupplierAddress: "123 Tech Park, Mumbai",
        consigneeParty: "Acme Corp Warehouse",
        voucherType: "Sales",
        quantity: 5,
        rate: 200000,
        value: 1000000,
        gross: 1180000,
        sales: 1000000,
        igst: 180000,
        roundOff: 0
      },
      {
        id: "SAL/1046",
        date: "2023-10-06",
        particulars: "Dell UltraSharp 32\"",
        buyerSupplier: "Stark Industries",
        buyerSupplierAddress: "Stark Tower, Delhi",
        consigneeParty: "Stark R&D",
        voucherType: "Sales",
        quantity: 10,
        rate: 50000,
        value: 500000,
        gross: 590000,
        sales: 500000,
        igst: 90000,
        roundOff: 0
      },
      {
        id: "SAL/1047",
        date: "2023-10-06",
        particulars: "Logitech MX Master 3S",
        buyerSupplier: "Global Tech",
        buyerSupplierAddress: "45 Cyber City, Pune",
        consigneeParty: "Global Tech IT",
        voucherType: "Sales",
        quantity: 20,
        rate: 8000,
        value: 160000,
        gross: 188800,
        sales: 160000,
        igst: 28800,
        roundOff: 0
      },
      {
        id: "SAL/1048",
        date: "2023-10-07",
        particulars: "Office Chairs",
        buyerSupplier: "Wayne Enterprises",
        buyerSupplierAddress: "Wayne Manor, Gotham (BLR)",
        consigneeParty: "Wayne Enterprises HQ",
        voucherType: "Sales",
        quantity: 15,
        rate: 12000,
        value: 180000,
        gross: 212400,
        sales: 180000,
        igst: 32400,
        roundOff: 0
      },
      {
        id: "SAL/1049",
        date: "2023-10-08",
        particulars: "Server Rack",
        buyerSupplier: "Cyberdyne Systems",
        buyerSupplierAddress: "AI Lab, Hyderabad",
        consigneeParty: "Cyberdyne Systems",
        voucherType: "Sales",
        quantity: 2,
        rate: 150000,
        value: 300000,
        gross: 354000,
        sales: 300000,
        igst: 54000,
        roundOff: 0
      }
    ]
  }
};

