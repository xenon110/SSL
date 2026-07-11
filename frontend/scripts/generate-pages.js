const fs = require('fs');
const path = require('path');

const routes = [
  { path: 'sales', key: 'sales', title: 'Sales Dashboard' },
  { path: 'purchase', key: 'purchase', title: 'Purchase Dashboard' },
  { path: 'receivable', key: 'receivable', title: 'Accounts Receivable' },
  { path: 'payable', key: 'payable', title: 'Accounts Payable' },
  { path: 'cash-flow', key: 'cashFlow', title: 'Cash Flow Analysis' },
  { path: 'pnl', key: 'profitAndLoss', title: 'Profit & Loss Statement' },
  { path: 'expense', key: 'expense', title: 'Expense Analysis' },
  { path: 'compliance', key: 'gstAndCompliance', title: 'GST & Compliance' },
  { path: 'inventory', key: 'inventory', title: 'Inventory Management' },
  { path: 'bank', key: 'bankAndLoan', title: 'Bank & Loan Accounts' },
  { path: 'working-capital', key: 'workingCapital', title: 'Working Capital' },
  { path: 'audit', key: 'auditAndControl', title: 'Audit & Control' },
  { path: 'collection', key: 'collection', title: 'Collection Efficiency' },
  { path: 'payment-planning', key: 'paymentPlanning', title: 'Payment Planning' }
];

const appDir = path.join(__dirname, '..', 'src', 'app');

routes.forEach(route => {
  const dirPath = path.join(appDir, route.path);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }

  const content = `import { GenericDashboardView } from "@/components/layout/GenericDashboardView";
import { mockDashboardData } from "@/lib/mockData";

export default function Page() {
  return (
    <GenericDashboardView 
      title="${route.title}" 
      data={mockDashboardData.${route.key}} 
    />
  );
}
`;

  fs.writeFileSync(path.join(dirPath, 'page.tsx'), content);
});

// For alerts
const alertsDir = path.join(appDir, 'alerts');
if (!fs.existsSync(alertsDir)) fs.mkdirSync(alertsDir, { recursive: true });
fs.writeFileSync(path.join(alertsDir, 'page.tsx'), `import { GenericDashboardView } from "@/components/layout/GenericDashboardView";
import { mockDashboardData } from "@/lib/mockData";

export default function Page() {
  return (
    <GenericDashboardView 
      title="Alerts & Notifications" 
      data={{ activeAlerts: mockDashboardData.alerts }} 
    />
  );
}
`);

// For settings
const settingsDir = path.join(appDir, 'settings');
if (!fs.existsSync(settingsDir)) fs.mkdirSync(settingsDir, { recursive: true });
fs.writeFileSync(path.join(settingsDir, 'page.tsx'), `export default function Page() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
      <p className="text-muted-foreground">App configuration and sync settings will go here.</p>
    </div>
  );
}
`);

// For reports
const reportsDir = path.join(appDir, 'reports');
if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true });
fs.writeFileSync(path.join(reportsDir, 'page.tsx'), `export default function Page() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Reports Center</h1>
      <p className="text-muted-foreground">Download standard Tally reports here.</p>
    </div>
  );
}
`);

console.log('All pages generated successfully!');
