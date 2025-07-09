import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Factory, BarChart3, Users, Package, Calendar, DollarSign, FileText, BookOpen } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-primary shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="bg-white rounded-lg p-2">
                <Factory className="text-primary h-6 w-6" />
              </div>
              <h1 className="text-white text-xl font-bold">OpsEase</h1>
            </div>
            <Button 
              onClick={() => window.location.href = '/login'}
              className="bg-white text-primary hover:bg-gray-100"
            >
              Sign In
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl font-bold text-foreground mb-6">
            Streamline Your Export Manufacturing Operations
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
            OpsEase brings order to chaos for small-scale garment exporters. Manage orders, 
            production, expenses, and employee payments all from one unified platform.
          </p>
          <Button 
            size="lg"
            onClick={() => window.location.href = '/login'}
            className="bg-primary hover:bg-primary/90 text-white px-8 py-3 text-lg"
          >
            Get Started Today
          </Button>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-foreground mb-12">
            Everything You Need to Manage Your Business
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Order Management */}
            <Card className="border border-border hover:shadow-lg transition-shadow">
              <CardContent className="p-6 text-center">
                <div className="bg-primary/10 rounded-lg p-3 w-fit mx-auto mb-4">
                  <BarChart3 className="text-primary h-8 w-8" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Order Management</h3>
                <p className="text-sm text-muted-foreground">
                  Track export orders from creation to delivery with buyer details and status updates.
                </p>
              </CardContent>
            </Card>

            {/* Production Planning */}
            <Card className="border border-border hover:shadow-lg transition-shadow">
              <CardContent className="p-6 text-center">
                <div className="bg-primary/10 rounded-lg p-3 w-fit mx-auto mb-4">
                  <Factory className="text-primary h-8 w-8" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Production Planning</h3>
                <p className="text-sm text-muted-foreground">
                  Set targets, assign teams, and monitor progress across all production stages.
                </p>
              </CardContent>
            </Card>

            {/* Employee Management */}
            <Card className="border border-border hover:shadow-lg transition-shadow">
              <CardContent className="p-6 text-center">
                <div className="bg-primary/10 rounded-lg p-3 w-fit mx-auto mb-4">
                  <Users className="text-primary h-8 w-8" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Employee Management</h3>
                <p className="text-sm text-muted-foreground">
                  Track attendance, calculate payments, and manage worker payroll seamlessly.
                </p>
              </CardContent>
            </Card>

            {/* Stock Management */}
            <Card className="border border-border hover:shadow-lg transition-shadow">
              <CardContent className="p-6 text-center">
                <div className="bg-primary/10 rounded-lg p-3 w-fit mx-auto mb-4">
                  <Package className="text-primary h-8 w-8" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Stock Management</h3>
                <p className="text-sm text-muted-foreground">
                  Monitor raw materials and finished goods with automatic reorder alerts.
                </p>
              </CardContent>
            </Card>

            {/* Expense Tracking */}
            <Card className="border border-border hover:shadow-lg transition-shadow">
              <CardContent className="p-6 text-center">
                <div className="bg-primary/10 rounded-lg p-3 w-fit mx-auto mb-4">
                  <DollarSign className="text-primary h-8 w-8" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Expense Tracking</h3>
                <p className="text-sm text-muted-foreground">
                  Record daily expenses with categories and generate cash flow reports.
                </p>
              </CardContent>
            </Card>

            {/* Attendance System */}
            <Card className="border border-border hover:shadow-lg transition-shadow">
              <CardContent className="p-6 text-center">
                <div className="bg-primary/10 rounded-lg p-3 w-fit mx-auto mb-4">
                  <Calendar className="text-primary h-8 w-8" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Attendance System</h3>
                <p className="text-sm text-muted-foreground">
                  Track employee attendance with monthly views and automated calculations.
                </p>
              </CardContent>
            </Card>

            {/* Invoice Generator */}
            <Card className="border border-border hover:shadow-lg transition-shadow">
              <CardContent className="p-6 text-center">
                <div className="bg-primary/10 rounded-lg p-3 w-fit mx-auto mb-4">
                  <FileText className="text-primary h-8 w-8" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Invoice Generator</h3>
                <p className="text-sm text-muted-foreground">
                  Create GST-compliant invoices with PDF download and sharing options.
                </p>
              </CardContent>
            </Card>

            {/* Ledger Management */}
            <Card className="border border-border hover:shadow-lg transition-shadow">
              <CardContent className="p-6 text-center">
                <div className="bg-primary/10 rounded-lg p-3 w-fit mx-auto mb-4">
                  <BookOpen className="text-primary h-8 w-8" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Ledger Management</h3>
                <p className="text-sm text-muted-foreground">
                  Maintain buyer and supplier accounts with automated balance calculations.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-primary">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to Transform Your Business?
          </h2>
          <p className="text-xl text-white/90 mb-8">
            Join hundreds of export manufacturers who have streamlined their operations with OpsEase.
          </p>
          <Button 
            size="lg"
            onClick={() => window.location.href = '/api/login'}
            className="bg-white text-primary hover:bg-gray-100 px-8 py-3 text-lg"
          >
            Start Your Free Trial
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <div className="bg-primary rounded-lg p-2">
              <Factory className="text-white h-6 w-6" />
            </div>
            <h3 className="text-xl font-bold">OpsEase</h3>
          </div>
          <p className="text-gray-400">
            Streamlining export manufacturing operations for small businesses worldwide.
          </p>
        </div>
      </footer>
    </div>
  );
}
