import { GenericDashboardView } from "@/components/layout/GenericDashboardView";
import { mockDashboardData } from "@/lib/mockData";

export default function Page() {
  return (
    <GenericDashboardView 
      title="Alerts & Notifications" 
      data={{ activeAlerts: mockDashboardData.alerts }} 
    />
  );
}
