import { GenericDashboardView } from "@/components/layout/GenericDashboardView";
import { mockDashboardData } from "@/lib/mockData";

export default function Page() {
  return (
    <GenericDashboardView 
      title="Working Capital" 
      data={mockDashboardData.workingCapital} 
    />
  );
}
