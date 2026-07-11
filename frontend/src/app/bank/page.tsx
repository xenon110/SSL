import { GenericDashboardView } from "@/components/layout/GenericDashboardView";
import { mockDashboardData } from "@/lib/mockData";

export default function Page() {
  return (
    <GenericDashboardView 
      title="Bank & Loan Accounts" 
      data={mockDashboardData.bankAndLoan} 
    />
  );
}
