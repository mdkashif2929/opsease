import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/layout/header";
import OverviewCards from "@/components/dashboard/overview-cards";
import RecentOrders from "@/components/dashboard/recent-orders";
import QuickActions from "@/components/dashboard/quick-actions";
import Alerts from "@/components/dashboard/alerts";
import ProductionProgress from "@/components/dashboard/production-progress";
import CashFlow from "@/components/dashboard/cash-flow";
import AttendanceToday from "@/components/dashboard/attendance-today";
import PaymentSummary from "@/components/dashboard/payment-summary";
import StockAlerts from "@/components/dashboard/stock-alerts";

export default function Dashboard() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Dashboard Overview Cards */}
        <section className="mb-8">
          <h2 className="text-2xl font-bold text-foreground mb-6">Dashboard Overview</h2>
          <OverviewCards />
        </section>

        {/* Recent Orders and Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          <div className="lg:col-span-2">
            <RecentOrders />
          </div>
          <div className="space-y-6">
            <QuickActions />
            <Alerts />
          </div>
        </div>

        {/* Production and Cash Flow Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <ProductionProgress />
          <CashFlow />
        </div>

        {/* Attendance and Worker Management */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <AttendanceToday />
          </div>
          <div className="space-y-6">
            <PaymentSummary />
            <StockAlerts />
          </div>
        </div>
      </main>
    </div>
  );
}
