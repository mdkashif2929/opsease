import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import Header from "@/components/layout/header";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Plus, Search, Edit, FileText, DollarSign, Users, Calendar, Download } from "lucide-react";
import type { Payment, Employee } from "@shared/schema";

export default function Payments() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [formData, setFormData] = useState({
    employeeId: "",
    payPeriodStart: "",
    payPeriodEnd: "",
    regularHours: "",
    overtimeHours: "",
    piecesCompleted: 0,
    grossAmount: "",
    deductions: "",
    paymentMethod: "",
    notes: "",
  });

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

  const { data: payments, isLoading: paymentsLoading } = useQuery({
    queryKey: ["/api/payments"],
    enabled: isAuthenticated,
  });

  const { data: employees } = useQuery({
    queryKey: ["/api/employees"],
    enabled: isAuthenticated,
  });

  const createPaymentMutation = useMutation({
    mutationFn: async (paymentData: any) => {
      const netAmount = parseFloat(paymentData.grossAmount) - parseFloat(paymentData.deductions || "0");
      return await apiRequest("/api/payments", "POST", {
        ...paymentData,
        netAmount: netAmount.toString(),
        status: "pending",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({ title: "Success", description: "Payment record created successfully" });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      if (isUnauthorizedError(error as Error)) {
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
      toast({
        title: "Error",
        description: "Failed to create payment record",
        variant: "destructive",
      });
    },
  });

  const updatePaymentMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return await apiRequest(`/api/payments/${id}`, "PUT", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payments"] });
      toast({ title: "Success", description: "Payment updated successfully" });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      if (isUnauthorizedError(error as Error)) {
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
      toast({
        title: "Error",
        description: "Failed to update payment",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      employeeId: "",
      payPeriodStart: "",
      payPeriodEnd: "",
      regularHours: "",
      overtimeHours: "",
      piecesCompleted: 0,
      grossAmount: "",
      deductions: "",
      paymentMethod: "",
      notes: "",
    });
    setEditingPayment(null);
  };

  const calculateGrossAmount = () => {
    const employee = employees?.find((emp: Employee) => emp.id === formData.employeeId);
    if (!employee) return;

    const rate = parseFloat(employee.rate || "0");
    let gross = 0;

    if (employee.paymentType === "daily_rate") {
      const totalHours = parseFloat(formData.regularHours || "0") + parseFloat(formData.overtimeHours || "0");
      const days = totalHours / 8; // Assuming 8 hours per day
      gross = days * rate;
    } else if (employee.paymentType === "piece_rate") {
      gross = formData.piecesCompleted * rate;
    } else if (employee.paymentType === "monthly_salary") {
      gross = rate;
    }

    setFormData({ ...formData, grossAmount: gross.toString() });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingPayment) {
      updatePaymentMutation.mutate({ id: editingPayment.id, data: formData });
    } else {
      createPaymentMutation.mutate(formData);
    }
  };

  const handleEdit = (payment: Payment & { employee: Employee }) => {
    setEditingPayment(payment);
    setFormData({
      employeeId: payment.employeeId,
      payPeriodStart: payment.payPeriodStart,
      payPeriodEnd: payment.payPeriodEnd,
      regularHours: payment.regularHours || "",
      overtimeHours: payment.overtimeHours || "",
      piecesCompleted: payment.piecesCompleted || 0,
      grossAmount: payment.grossAmount,
      deductions: payment.deductions || "",
      paymentMethod: payment.paymentMethod || "",
      notes: payment.notes || "",
    });
    setIsDialogOpen(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "paid":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getPaymentTypeIcon = (paymentType: string) => {
    switch (paymentType) {
      case "daily_rate":
        return "📅";
      case "piece_rate":
        return "🔢";
      case "monthly_salary":
        return "💰";
      default:
        return "💼";
    }
  };

  const filteredPayments = payments?.filter((payment: Payment & { employee: Employee }) => {
    const matchesSearch = payment.employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         payment.employee.employeeId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || payment.status === statusFilter;
    return matchesSearch && matchesStatus;
  }) || [];

  const totalPendingAmount = payments?.filter((p: Payment) => p.status === 'pending')
    .reduce((sum, p) => sum + parseFloat(p.netAmount), 0) || 0;

  const totalPaidAmount = payments?.filter((p: Payment) => p.status === 'paid')
    .reduce((sum, p) => sum + parseFloat(p.netAmount), 0) || 0;

  const paymentsByType = employees?.reduce((acc: Record<string, number>, emp: Employee) => {
    acc[emp.paymentType] = (acc[emp.paymentType] || 0) + 1;
    return acc;
  }, {}) || {};

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
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Worker Payments</h1>
            <p className="text-muted-foreground mt-1">Manage employee payroll and payment records</p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90 text-white mt-4 sm:mt-0" onClick={resetForm}>
                <Plus className="h-4 w-4 mr-2" />
                Add Payment
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editingPayment ? "Edit Payment" : "Create Payment Record"}</DialogTitle>
              </DialogHeader>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="employeeId">Employee</Label>
                    <Select 
                      value={formData.employeeId} 
                      onValueChange={(value) => {
                        setFormData({ ...formData, employeeId: value });
                        // Auto-calculate gross amount when employee changes
                        setTimeout(calculateGrossAmount, 100);
                      }}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select employee" />
                      </SelectTrigger>
                      <SelectContent>
                        {employees?.map((employee: Employee) => (
                          <SelectItem key={employee.id} value={employee.id}>
                            <div className="flex items-center space-x-2">
                              <span>{getPaymentTypeIcon(employee.paymentType)}</span>
                              <span>{employee.name} - {employee.employeeId}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="paymentMethod">Payment Method</Label>
                    <Select 
                      value={formData.paymentMethod} 
                      onValueChange={(value) => setFormData({ ...formData, paymentMethod: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select method" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="payPeriodStart">Pay Period Start</Label>
                    <Input
                      id="payPeriodStart"
                      type="date"
                      value={formData.payPeriodStart}
                      onChange={(e) => setFormData({ ...formData, payPeriodStart: e.target.value })}
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="payPeriodEnd">Pay Period End</Label>
                    <Input
                      id="payPeriodEnd"
                      type="date"
                      value={formData.payPeriodEnd}
                      onChange={(e) => setFormData({ ...formData, payPeriodEnd: e.target.value })}
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="regularHours">Regular Hours</Label>
                    <Input
                      id="regularHours"
                      type="number"
                      step="0.5"
                      value={formData.regularHours}
                      onChange={(e) => {
                        setFormData({ ...formData, regularHours: e.target.value });
                        setTimeout(calculateGrossAmount, 100);
                      }}
                      placeholder="40.0"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="overtimeHours">Overtime Hours</Label>
                    <Input
                      id="overtimeHours"
                      type="number"
                      step="0.5"
                      value={formData.overtimeHours}
                      onChange={(e) => {
                        setFormData({ ...formData, overtimeHours: e.target.value });
                        setTimeout(calculateGrossAmount, 100);
                      }}
                      placeholder="0.0"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="piecesCompleted">Pieces Completed</Label>
                    <Input
                      id="piecesCompleted"
                      type="number"
                      value={formData.piecesCompleted}
                      onChange={(e) => {
                        setFormData({ ...formData, piecesCompleted: parseInt(e.target.value) || 0 });
                        setTimeout(calculateGrossAmount, 100);
                      }}
                      placeholder="0"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="grossAmount">Gross Amount (₹)</Label>
                    <Input
                      id="grossAmount"
                      type="number"
                      step="0.01"
                      value={formData.grossAmount}
                      onChange={(e) => setFormData({ ...formData, grossAmount: e.target.value })}
                      placeholder="5000.00"
                      required
                    />
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm" 
                      className="mt-2 w-full"
                      onClick={calculateGrossAmount}
                    >
                      Auto Calculate
                    </Button>
                  </div>
                  
                  <div>
                    <Label htmlFor="deductions">Deductions (₹)</Label>
                    <Input
                      id="deductions"
                      type="number"
                      step="0.01"
                      value={formData.deductions}
                      onChange={(e) => setFormData({ ...formData, deductions: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                </div>

                {/* Net Amount Display */}
                {formData.grossAmount && (
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Net Amount:</span>
                      <span className="text-xl font-bold text-primary">
                        ₹{(parseFloat(formData.grossAmount) - parseFloat(formData.deductions || "0")).toLocaleString()}
                      </span>
                    </div>
                  </div>
                )}

                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Additional notes about this payment"
                    rows={3}
                  />
                </div>

                <div className="flex justify-end space-x-4 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="bg-primary hover:bg-primary/90 text-white"
                    disabled={createPaymentMutation.isPending || updatePaymentMutation.isPending}
                  >
                    {createPaymentMutation.isPending || updatePaymentMutation.isPending
                      ? "Saving..."
                      : editingPayment
                      ? "Update Payment"
                      : "Create Payment"
                    }
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="border border-border">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm font-medium">Pending Payments</p>
                  <p className="text-3xl font-bold text-foreground">₹{totalPendingAmount.toLocaleString()}</p>
                </div>
                <div className="bg-yellow-100 p-3 rounded-lg">
                  <DollarSign className="text-yellow-600 h-6 w-6" />
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                {payments?.filter((p: Payment) => p.status === 'pending').length || 0} payments pending
              </p>
            </CardContent>
          </Card>

          <Card className="border border-border">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm font-medium">Paid This Month</p>
                  <p className="text-3xl font-bold text-foreground">₹{totalPaidAmount.toLocaleString()}</p>
                </div>
                <div className="bg-green-100 p-3 rounded-lg">
                  <FileText className="text-green-600 h-6 w-6" />
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                {payments?.filter((p: Payment) => p.status === 'paid').length || 0} payments completed
              </p>
            </CardContent>
          </Card>

          <Card className="border border-border">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm font-medium">Active Employees</p>
                  <p className="text-3xl font-bold text-foreground">{employees?.length || 0}</p>
                </div>
                <div className="bg-blue-100 p-3 rounded-lg">
                  <Users className="text-blue-600 h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm font-medium">Payment Records</p>
                  <p className="text-3xl font-bold text-foreground">{payments?.length || 0}</p>
                </div>
                <div className="bg-purple-100 p-3 rounded-lg">
                  <Calendar className="text-purple-600 h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Payment Type Breakdown */}
        <Card className="mb-8">
          <CardHeader>
            <h2 className="text-xl font-semibold text-foreground">Employee Payment Types</h2>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Object.entries(paymentsByType).map(([type, count]) => (
                <div key={type} className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl mb-2">{getPaymentTypeIcon(type)}</div>
                  <p className="text-sm font-medium text-foreground capitalize">
                    {type.replace('_', ' ')}
                  </p>
                  <p className="text-lg font-bold text-primary">{count} employees</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Filters Section */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search by employee name or ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                </SelectContent>
              </Select>

              <Button variant="outline" className="border-primary text-primary hover:bg-primary hover:text-white">
                <Download className="h-4 w-4 mr-2" />
                Generate Payslips
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Payments Table */}
        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold text-foreground">
              Payment Records ({filteredPayments.length})
            </h2>
          </CardHeader>
          <CardContent>
            {paymentsLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-16 bg-gray-200 rounded"></div>
                  </div>
                ))}
              </div>
            ) : filteredPayments.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">
                  {searchTerm || statusFilter !== "all" 
                    ? "No payment records match your search criteria" 
                    : "No payment records found"
                  }
                </p>
                <Button
                  onClick={() => {
                    resetForm();
                    setIsDialogOpen(true);
                  }}
                  className="bg-primary hover:bg-primary/90 text-white"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Payment Record
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Pay Period</TableHead>
                      <TableHead>Hours/Pieces</TableHead>
                      <TableHead>Gross Amount</TableHead>
                      <TableHead>Deductions</TableHead>
                      <TableHead>Net Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPayments.map((payment: Payment & { employee: Employee }) => (
                      <TableRow key={payment.id}>
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <Avatar>
                              <AvatarImage src="" alt={payment.employee.name} />
                              <AvatarFallback>
                                {payment.employee.name.split(' ').map(n => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium">{payment.employee.name}</div>
                              <div className="text-sm text-muted-foreground flex items-center space-x-1">
                                <span>{getPaymentTypeIcon(payment.employee.paymentType)}</span>
                                <span>{payment.employee.employeeId}</span>
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div>{new Date(payment.payPeriodStart).toLocaleDateString()}</div>
                            <div className="text-muted-foreground">to {new Date(payment.payPeriodEnd).toLocaleDateString()}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {payment.employee.paymentType === 'piece_rate' ? (
                              <div>{payment.piecesCompleted} pieces</div>
                            ) : (
                              <>
                                <div>{payment.regularHours || 0}h regular</div>
                                {payment.overtimeHours && payment.overtimeHours !== "0" && (
                                  <div className="text-muted-foreground">{payment.overtimeHours}h overtime</div>
                                )}
                              </>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="font-semibold">₹{parseFloat(payment.grossAmount).toLocaleString()}</TableCell>
                        <TableCell>₹{parseFloat(payment.deductions || "0").toLocaleString()}</TableCell>
                        <TableCell className="font-semibold text-primary">₹{parseFloat(payment.netAmount).toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(payment.status || "pending")}>
                            {payment.status === "pending" ? "Pending" : "Paid"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(payment)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => toast({ title: "Feature Coming Soon", description: "Payslip generation will be available soon" })}
                            >
                              <FileText className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
