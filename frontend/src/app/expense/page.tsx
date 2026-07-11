import { GenericDashboardView } from "@/components/layout/GenericDashboardView";
import { mockDashboardData } from "@/lib/mockData";

export default function Page() {
  return (
    <GenericDashboardView 
      title="Expense Analysis" 
      data={mockDashboardData.expense} 
    />
  );
}
