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
import { Plus, Search, Edit, Trash2, FileText, Download, DollarSign, Calendar, Receipt, Eye, ShoppingCart, Truck } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Invoice, Order, Customer, Supplier } from "@shared/schema";

export default function Invoices() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("sales_invoice");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [viewInvoice, setViewInvoice] = useState<Invoice | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<string>("");
  // Generate unique invoice number
  const generateInvoiceNumber = (type: 'sales_invoice' | 'purchase_invoice' = 'sales_invoice') => {
    const prefix = type === 'sales_invoice' ? 'SI' : 'PI';
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.floor(Math.random() * 100).toString().padStart(2, '0');
    return `${prefix}${timestamp}${random}`;
  };

  const [formData, setFormData] = useState({
    invoiceNumber: generateInvoiceNumber(),
    invoiceType: "sales_invoice" as "sales_invoice" | "purchase_invoice",
    orderId: "",
    customerId: "",
    supplierId: "",
    buyerName: "",
    buyerAddress: "",
    buyerGst: "",
    buyerPhone: "",
    buyerEmail: "",
    items: [{ description: "", quantity: 1, unitPrice: 0, amount: 0 }],
    taxRate: "18",
    shippingCost: "",
    discount: "",
    currency: "INR",
    invoiceDate: new Date().toISOString().split('T')[0],
    dueDate: "",
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

  const { data: invoices, isLoading: invoicesLoading } = useQuery({
    queryKey: ["/api/invoices"],
    enabled: isAuthenticated,
  });

  const { data: orders } = useQuery({
    queryKey: ["/api/orders"],
    enabled: isAuthenticated,
  });

  const { data: customers } = useQuery({
    queryKey: ["/api/customers"],
    enabled: isAuthenticated,
  });

  const { data: suppliers } = useQuery({
    queryKey: ["/api/suppliers"],
    enabled: isAuthenticated,
  });

  const createInvoiceMutation = useMutation({
    mutationFn: async (invoiceData: any) => {
      const subtotal = invoiceData.items.reduce((sum: number, item: any) => sum + item.amount, 0);
      const taxAmount = (subtotal * parseFloat(invoiceData.taxRate)) / 100;
      const totalAmount = subtotal + taxAmount + parseFloat(invoiceData.shippingCost || "0") - parseFloat(invoiceData.discount || "0");
      
      return await apiRequest("/api/invoices", "POST", {
        ...invoiceData,
        invoiceType: invoiceData.invoiceType,
        orderId: invoiceData.orderId || undefined,
        customerId: invoiceData.customerId || undefined,
        supplierId: invoiceData.supplierId || undefined,
        subtotal: subtotal.toString(),
        taxAmount: taxAmount.toString(),
        totalAmount: totalAmount.toString(),
        shippingCost: invoiceData.shippingCost || "0",
        discount: invoiceData.discount || "0",
        taxRate: invoiceData.taxRate || "0",
        status: "draft",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      toast({ title: "Success", description: "Invoice created successfully" });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      console.error("Invoice creation error:", error);
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
        description: error.message || "Failed to create invoice",
        variant: "destructive",
      });
    },
  });

  const updateInvoiceMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      // Recalculate totals like in create mutation
      const subtotal = data.items.reduce((sum: number, item: any) => sum + item.amount, 0);
      const taxAmount = (subtotal * parseFloat(data.taxRate)) / 100;
      const totalAmount = subtotal + taxAmount + parseFloat(data.shippingCost || "0") - parseFloat(data.discount || "0");
      
      return await apiRequest(`/api/invoices/${id}`, "PUT", {
        ...data,
        subtotal: subtotal.toString(),
        taxAmount: taxAmount.toString(),
        totalAmount: totalAmount.toString(),
        shippingCost: data.shippingCost || "0",
        discount: data.discount || "0",
        taxRate: data.taxRate || "0",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      toast({ title: "Success", description: "Invoice updated successfully" });
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
        description: "Failed to update invoice",
        variant: "destructive",
      });
    },
  });

  const deleteInvoiceMutation = useMutation({
    mutationFn: async (invoiceId: string) => {
      return await apiRequest(`/api/invoices/${invoiceId}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ledger"] });
      toast({ title: "Success", description: "Invoice deleted successfully" });
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
        description: "Failed to delete invoice",
        variant: "destructive",
      });
    },
  });

  const handleCustomerSelect = (customerId: string) => {
    setSelectedCustomer(customerId);
    if (customerId && customers) {
      const customer = customers.find((c: Customer) => c.id === customerId);
      if (customer) {
        setFormData(prev => ({
          ...prev,
          customerId: customerId,
          buyerName: customer.companyName,
          buyerAddress: customer.address || "",
          buyerGst: customer.gstNumber || "",
          buyerPhone: customer.phone || "",
          buyerEmail: customer.email || "",
        }));
      }
    }
  };

  const handleSupplierSelect = (supplierId: string) => {
    if (supplierId && suppliers) {
      const supplier = suppliers.find((s: Supplier) => s.id === supplierId);
      if (supplier) {
        setFormData(prev => ({
          ...prev,
          supplierId: supplierId,
          buyerName: supplier.companyName,
          buyerAddress: supplier.address || "",
          buyerGst: supplier.gstNumber || "",
          buyerPhone: supplier.phone || "",
          buyerEmail: supplier.email || "",
        }));
      }
    }
  };

  const resetForm = () => {
    const invoiceType = activeTab as "sales_invoice" | "purchase_invoice";
    setFormData({
      invoiceNumber: generateInvoiceNumber(invoiceType),
      invoiceType: invoiceType,
      orderId: "",
      customerId: "",
      supplierId: "",
      buyerName: "",
      buyerAddress: "",
      buyerGst: "",
      buyerPhone: "",
      buyerEmail: "",
      items: [{ description: "", quantity: 1, unitPrice: 0, amount: 0 }],
      taxRate: "18",
      shippingCost: "0",
      discount: "0",
      currency: "INR",
      invoiceDate: new Date().toISOString().split('T')[0],
      dueDate: "",
    });
    setSelectedCustomer("");
    setEditingInvoice(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingInvoice) {
      updateInvoiceMutation.mutate({ id: editingInvoice.id, data: formData });
    } else {
      createInvoiceMutation.mutate(formData);
    }
  };

  const handleEdit = (invoice: Invoice) => {
    setEditingInvoice(invoice);
    setFormData({
      invoiceNumber: invoice.invoiceNumber,
      orderId: invoice.orderId,
      buyerName: invoice.buyerName,
      buyerAddress: invoice.buyerAddress || "",
      buyerGst: invoice.buyerGst || "",
      buyerPhone: invoice.buyerPhone || "",
      buyerEmail: invoice.buyerEmail || "",
      items: Array.isArray(invoice.items) ? invoice.items : [{ description: "", quantity: 1, unitPrice: 0, amount: 0 }],
      taxRate: invoice.taxRate || "18",
      shippingCost: invoice.shippingCost || "",
      discount: invoice.discount || "",
      currency: invoice.currency || "INR",
      invoiceDate: invoice.invoiceDate,
      dueDate: invoice.dueDate || "",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (invoice: Invoice) => {
    if (window.confirm(`Are you sure you want to delete invoice ${invoice.invoiceNumber}? This action cannot be undone.`)) {
      deleteInvoiceMutation.mutate(invoice.id);
    }
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { description: "", quantity: 1, unitPrice: 0, amount: 0 }],
    });
  };

  const removeItem = (index: number) => {
    const newItems = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: newItems });
  };

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    
    // Auto-calculate amount for quantity and unitPrice changes
    if (field === 'quantity' || field === 'unitPrice') {
      newItems[index].amount = newItems[index].quantity * newItems[index].unitPrice;
    }
    
    setFormData({ ...formData, items: newItems });
  };

  const populateFromOrder = (orderId: string) => {
    const order = orders?.find((o: Order) => o.id === orderId);
    if (order) {
      const orderItems = Array.isArray(order.products) ? order.products.map((product: any) => ({
        description: `${product.name} - ${product.description || ''}`,
        quantity: product.quantity || 1,
        unitPrice: product.unitPrice || 0,
        amount: (product.quantity || 1) * (product.unitPrice || 0),
      })) : [];

      setFormData({
        ...formData,
        orderId: order.id,
        buyerName: order.buyerName,
        items: orderItems.length > 0 ? orderItems : formData.items,
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "draft":
        return "bg-gray-100 text-gray-800";
      case "sent":
        return "bg-blue-100 text-blue-800";
      case "paid":
        return "bg-green-100 text-green-800";
      case "overdue":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatStatus = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const calculateTotals = () => {
    const subtotal = formData.items.reduce((sum, item) => sum + item.amount, 0);
    const taxAmount = (subtotal * parseFloat(formData.taxRate || "0")) / 100;
    const shipping = parseFloat(formData.shippingCost || "0");
    const discount = parseFloat(formData.discount || "0");
    const total = subtotal + taxAmount + shipping - discount;
    
    return { subtotal, taxAmount, shipping, discount, total };
  };

  const filteredInvoices = invoices?.filter((invoice: Invoice) => {
    const matchesSearch = invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         invoice.buyerName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || invoice.status === statusFilter;
    const matchesType = activeTab === "sales_invoice" 
      ? (!invoice.invoiceType || invoice.invoiceType === "sales_invoice")
      : (invoice.invoiceType === "purchase_invoice");
    return matchesSearch && matchesStatus && matchesType;
  }) || [];

  const totalInvoiceValue = invoices?.reduce((sum, invoice) => 
    sum + parseFloat(invoice.totalAmount), 0
  ) || 0;

  const paidInvoices = invoices?.filter((inv: Invoice) => inv.status === 'paid').length || 0;
  const overdueInvoices = invoices?.filter((inv: Invoice) => {
    if (inv.status === 'paid') return false; // Paid invoices can't be overdue
    const today = new Date();
    const dueDate = new Date(inv.dueDate);
    return dueDate < today;
  }).length || 0;

  const { subtotal, taxAmount, shipping, discount, total } = calculateTotals();

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
            <h1 className="text-3xl font-bold text-foreground">Invoice Generator</h1>
            <p className="text-muted-foreground mt-1">Create and manage GST-compliant invoices</p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90 text-white mt-4 sm:mt-0" onClick={() => {
                resetForm();
                setFormData(prev => ({ ...prev, invoiceType: activeTab as "sales_invoice" | "purchase_invoice" }));
              }}>
                <Plus className="h-4 w-4 mr-2" />
                Create {activeTab === 'sales_invoice' ? 'Sales' : 'Purchase'} Invoice
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingInvoice ? "Edit Invoice" : "Create New Invoice"}</DialogTitle>
              </DialogHeader>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="invoiceNumber">Invoice Number</Label>
                    <Input
                      id="invoiceNumber"
                      value={formData.invoiceNumber}
                      onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
                      placeholder="INV-2024-001"
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="invoiceType">Invoice Type</Label>
                    <Select value={formData.invoiceType} onValueChange={(value: "sales_invoice" | "purchase_invoice") => 
                      setFormData({ ...formData, invoiceType: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sales_invoice">
                          <div className="flex items-center">
                            <ShoppingCart className="h-4 w-4 mr-2" />
                            Sales Invoice
                          </div>
                        </SelectItem>
                        <SelectItem value="purchase_invoice">
                          <div className="flex items-center">
                            <Truck className="h-4 w-4 mr-2" />
                            Purchase Invoice
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="orderId">Link to Order (Optional)</Label>
                    <Select 
                      value={formData.orderId} 
                      onValueChange={(value) => {
                        setFormData({ ...formData, orderId: value });
                        populateFromOrder(value);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select an order" />
                      </SelectTrigger>
                      <SelectContent>
                        {orders?.map((order: Order) => (
                          <SelectItem key={order.id} value={order.id}>
                            {order.orderId} - {order.buyerName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {formData.invoiceType === 'sales_invoice' ? (
                    <div>
                      <Label>Select Customer (Optional)</Label>
                      <Select value={formData.customerId} onValueChange={handleCustomerSelect}>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose an existing customer" />
                        </SelectTrigger>
                        <SelectContent>
                          {customers?.map((customer: Customer) => (
                            <SelectItem key={customer.id} value={customer.id}>
                              {customer.companyName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : (
                    <div>
                      <Label>Select Supplier (Optional)</Label>
                      <Select value={formData.supplierId} onValueChange={handleSupplierSelect}>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose an existing supplier" />
                        </SelectTrigger>
                        <SelectContent>
                          {suppliers?.map((supplier: Supplier) => (
                            <SelectItem key={supplier.id} value={supplier.id}>
                              {supplier.companyName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  
                  <div>
                    <Label htmlFor="buyerName">Buyer Name</Label>
                    <Input
                      id="buyerName"
                      value={formData.buyerName}
                      onChange={(e) => setFormData({ ...formData, buyerName: e.target.value })}
                      placeholder="Global Fashions Ltd"
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="buyerGst">Buyer GST Number</Label>
                    <Input
                      id="buyerGst"
                      value={formData.buyerGst}
                      onChange={(e) => setFormData({ ...formData, buyerGst: e.target.value })}
                      placeholder="27AAPFU0939F1ZV"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="buyerPhone">Buyer Phone</Label>
                    <Input
                      id="buyerPhone"
                      value={formData.buyerPhone}
                      onChange={(e) => setFormData({ ...formData, buyerPhone: e.target.value })}
                      placeholder="+91 98765 43210"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="buyerEmail">Buyer Email</Label>
                    <Input
                      id="buyerEmail"
                      type="email"
                      value={formData.buyerEmail}
                      onChange={(e) => setFormData({ ...formData, buyerEmail: e.target.value })}
                      placeholder="buyer@company.com"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="invoiceDate">Invoice Date</Label>
                    <Input
                      id="invoiceDate"
                      type="date"
                      value={formData.invoiceDate}
                      onChange={(e) => setFormData({ ...formData, invoiceDate: e.target.value })}
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="dueDate">Due Date</Label>
                    <Input
                      id="dueDate"
                      type="date"
                      value={formData.dueDate}
                      onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="buyerAddress">Buyer Address</Label>
                  <Textarea
                    id="buyerAddress"
                    value={formData.buyerAddress}
                    onChange={(e) => setFormData({ ...formData, buyerAddress: e.target.value })}
                    placeholder="Complete billing address"
                    rows={3}
                  />
                </div>

                {/* Invoice Items */}
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <Label>Invoice Items</Label>
                    <Button type="button" variant="outline" onClick={addItem}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Item
                    </Button>
                  </div>
                  
                  <div className="space-y-4">
                    {formData.items.map((item, index) => (
                      <Card key={index} className="p-4">
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                          <div className="md:col-span-2">
                            <Label>Description</Label>
                            <Input
                              value={item.description}
                              onChange={(e) => updateItem(index, 'description', e.target.value)}
                              placeholder="Item description"
                              required
                            />
                          </div>
                          
                          <div>
                            <Label>Quantity</Label>
                            <Input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 0)}
                              required
                            />
                          </div>
                          
                          <div>
                            <Label>Unit Price (₹)</Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={item.unitPrice}
                              onChange={(e) => updateItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                              required
                            />
                          </div>
                          
                          <div className="flex items-end gap-2">
                            <div className="flex-1">
                              <Label>Amount (₹)</Label>
                              <Input
                                type="number"
                                step="0.01"
                                value={item.amount}
                                onChange={(e) => updateItem(index, 'amount', parseFloat(e.target.value) || 0)}
                                required
                              />
                            </div>
                            {formData.items.length > 1 && (
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                onClick={() => removeItem(index)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>

                {/* Tax and Other Charges */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="taxRate">Tax Rate (%)</Label>
                    <Select 
                      value={formData.taxRate} 
                      onValueChange={(value) => setFormData({ ...formData, taxRate: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">0% (Exempt)</SelectItem>
                        <SelectItem value="5">5% GST</SelectItem>
                        <SelectItem value="12">12% GST</SelectItem>
                        <SelectItem value="18">18% GST</SelectItem>
                        <SelectItem value="28">28% GST</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="shippingCost">Shipping Cost (₹)</Label>
                    <Input
                      id="shippingCost"
                      type="number"
                      step="0.01"
                      value={formData.shippingCost}
                      onChange={(e) => setFormData({ ...formData, shippingCost: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="discount">Discount (₹)</Label>
                    <Input
                      id="discount"
                      type="number"
                      step="0.01"
                      value={formData.discount}
                      onChange={(e) => setFormData({ ...formData, discount: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                </div>

                {/* Invoice Summary */}
                <Card className="p-4 bg-gray-50">
                  <h3 className="font-semibold mb-4">Invoice Summary</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span>₹{subtotal.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Tax ({formData.taxRate}%):</span>
                      <span>₹{taxAmount.toLocaleString()}</span>
                    </div>
                    {shipping > 0 && (
                      <div className="flex justify-between">
                        <span>Shipping:</span>
                        <span>₹{shipping.toLocaleString()}</span>
                      </div>
                    )}
                    {discount > 0 && (
                      <div className="flex justify-between">
                        <span>Discount:</span>
                        <span>-₹{discount.toLocaleString()}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold text-lg pt-2 border-t">
                      <span>Total:</span>
                      <span>₹{total.toLocaleString()}</span>
                    </div>
                  </div>
                </Card>

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
                    disabled={createInvoiceMutation.isPending || updateInvoiceMutation.isPending}
                  >
                    {createInvoiceMutation.isPending || updateInvoiceMutation.isPending
                      ? "Saving..."
                      : editingInvoice
                      ? "Update Invoice"
                      : "Create Invoice"
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
                  <p className="text-muted-foreground text-sm font-medium">Total Invoice Value</p>
                  <p className="text-3xl font-bold text-foreground">₹{totalInvoiceValue.toLocaleString()}</p>
                </div>
                <div className="bg-green-100 p-3 rounded-lg">
                  <DollarSign className="text-green-600 h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm font-medium">Total Invoices</p>
                  <p className="text-3xl font-bold text-foreground">{invoices?.length || 0}</p>
                </div>
                <div className="bg-blue-100 p-3 rounded-lg">
                  <Receipt className="text-blue-600 h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm font-medium">Paid Invoices</p>
                  <p className="text-3xl font-bold text-foreground">{paidInvoices}</p>
                </div>
                <div className="bg-green-100 p-3 rounded-lg">
                  <FileText className="text-green-600 h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm font-medium">Overdue</p>
                  <p className="text-3xl font-bold text-foreground">{overdueInvoices}</p>
                </div>
                <div className="bg-red-100 p-3 rounded-lg">
                  <Calendar className="text-red-600 h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters Section */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search invoices by number or buyer name..."
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
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Invoices Table with Tabs */}
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value)} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="sales_invoice" className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" />
              Sales Invoices
            </TabsTrigger>
            <TabsTrigger value="purchase_invoice" className="flex items-center gap-2">
              <Truck className="h-4 w-4" />
              Purchase Invoices
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="sales_invoice">
            <Card>
              <CardHeader>
                <h2 className="text-xl font-semibold text-foreground">
                  Sales Invoices ({filteredInvoices.filter(inv => !inv.invoiceType || inv.invoiceType === 'sales_invoice').length})
                </h2>
              </CardHeader>
              <CardContent>
            {invoicesLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-16 bg-gray-200 rounded"></div>
                  </div>
                ))}
              </div>
            ) : filteredInvoices.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">
                  {searchTerm || statusFilter !== "all" 
                    ? "No invoices match your search criteria" 
                    : "No invoices found"
                  }
                </p>
                <Button
                  onClick={() => {
                    resetForm();
                    setFormData(prev => ({ ...prev, invoiceType: "sales_invoice" }));
                    setIsDialogOpen(true);
                  }}
                  className="bg-primary hover:bg-primary/90 text-white"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Invoice
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice Number</TableHead>
                      <TableHead>Buyer</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInvoices.map((invoice: Invoice) => (
                      <TableRow key={invoice.id}>
                        <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{invoice.buyerName}</div>
                            {invoice.buyerGst && (
                              <div className="text-sm text-muted-foreground">GST: {invoice.buyerGst}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{new Date(invoice.invoiceDate).toLocaleDateString()}</TableCell>
                        <TableCell>
                          {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : "-"}
                        </TableCell>
                        <TableCell className="font-semibold">
                          {invoice.currency} {parseFloat(invoice.totalAmount).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(invoice.status || "draft")}>
                            {formatStatus(invoice.status || "draft")}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setViewInvoice(invoice);
                                setIsViewDialogOpen(true);
                              }}
                              title="View Invoice"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(invoice)}
                              title="Edit Invoice"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(invoice)}
                              title="Delete Invoice"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => toast({ title: "Feature Coming Soon", description: "PDF download will be available soon" })}
                              title="Download PDF"
                            >
                              <Download className="h-4 w-4" />
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
          </TabsContent>
          
          <TabsContent value="purchase_invoice">
            <Card>
              <CardHeader>
                <h2 className="text-xl font-semibold text-foreground">
                  Purchase Invoices ({filteredInvoices.filter(inv => inv.invoiceType === 'purchase_invoice').length})
                </h2>
              </CardHeader>
              <CardContent>
                {invoicesLoading ? (
                  <div className="space-y-4">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="animate-pulse">
                        <div className="h-16 bg-gray-200 rounded"></div>
                      </div>
                    ))}
                  </div>
                ) : filteredInvoices.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground mb-4">
                      {searchTerm || statusFilter !== "all" 
                        ? "No purchase invoices match your search criteria" 
                        : "No purchase invoices found"
                      }
                    </p>
                    <Button
                      onClick={() => {
                        resetForm();
                        setFormData(prev => ({ ...prev, invoiceType: "purchase_invoice" }));
                        setIsDialogOpen(true);
                      }}
                      className="bg-primary hover:bg-primary/90 text-white"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create Your First Purchase Invoice
                    </Button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Invoice Number</TableHead>
                          <TableHead>Supplier</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Due Date</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredInvoices.map((invoice: Invoice) => (
                          <TableRow key={invoice.id}>
                            <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                            <TableCell>
                              <div>
                                <div className="font-medium">{invoice.buyerName}</div>
                                {invoice.buyerGst && (
                                  <div className="text-sm text-muted-foreground">GST: {invoice.buyerGst}</div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>{new Date(invoice.invoiceDate).toLocaleDateString()}</TableCell>
                            <TableCell>
                              {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : "-"}
                            </TableCell>
                            <TableCell className="font-semibold">
                              {invoice.currency} {parseFloat(invoice.totalAmount).toLocaleString()}
                            </TableCell>
                            <TableCell>
                              <Badge className={getStatusColor(invoice.status || "draft")}>
                                {formatStatus(invoice.status || "draft")}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex space-x-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    setViewInvoice(invoice);
                                    setIsViewDialogOpen(true);
                                  }}
                                  title="View Invoice"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleEdit(invoice)}
                                  title="Edit Invoice"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDelete(invoice)}
                                  title="Delete Invoice"
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => toast({ title: "Feature Coming Soon", description: "PDF download will be available soon" })}
                                  title="Download PDF"
                                >
                                  <Download className="h-4 w-4" />
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
          </TabsContent>
        </Tabs>

        {/* View Invoice Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Invoice Details - {viewInvoice?.invoiceNumber}</DialogTitle>
            </DialogHeader>
            {viewInvoice && (
              <div className="space-y-6">
                {/* Invoice Header */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-gray-50 rounded-lg">
                  <div>
                    <h3 className="font-semibold text-lg mb-4">Invoice Information</h3>
                    <div className="space-y-2">
                      <div><span className="font-medium">Invoice Number:</span> {viewInvoice.invoiceNumber}</div>
                      <div><span className="font-medium">Invoice Date:</span> {new Date(viewInvoice.invoiceDate).toLocaleDateString()}</div>
                      {viewInvoice.dueDate && (
                        <div><span className="font-medium">Due Date:</span> {new Date(viewInvoice.dueDate).toLocaleDateString()}</div>
                      )}
                      <div><span className="font-medium">Status:</span> 
                        <Badge className={`ml-2 ${getStatusColor(viewInvoice.status || "draft")}`}>
                          {formatStatus(viewInvoice.status || "draft")}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold text-lg mb-4">Buyer Information</h3>
                    <div className="space-y-2">
                      <div><span className="font-medium">Name:</span> {viewInvoice.buyerName}</div>
                      {viewInvoice.buyerPhone && (
                        <div><span className="font-medium">Phone:</span> {viewInvoice.buyerPhone}</div>
                      )}
                      {viewInvoice.buyerEmail && (
                        <div><span className="font-medium">Email:</span> {viewInvoice.buyerEmail}</div>
                      )}
                      {viewInvoice.buyerGst && (
                        <div><span className="font-medium">GST Number:</span> {viewInvoice.buyerGst}</div>
                      )}
                      {viewInvoice.buyerAddress && (
                        <div className="mt-2">
                          <span className="font-medium">Address:</span>
                          <div className="mt-1 p-2 bg-white rounded border text-sm">
                            {viewInvoice.buyerAddress}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Invoice Items */}
                <div>
                  <h3 className="font-semibold text-lg mb-4">Invoice Items</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Quantity</TableHead>
                        <TableHead className="text-right">Unit Price (₹)</TableHead>
                        <TableHead className="text-right">Amount (₹)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Array.isArray(viewInvoice.items) && viewInvoice.items.map((item: any, index: number) => (
                        <TableRow key={index}>
                          <TableCell>{item.description}</TableCell>
                          <TableCell className="text-right">{item.quantity}</TableCell>
                          <TableCell className="text-right">{item.unitPrice?.toLocaleString()}</TableCell>
                          <TableCell className="text-right">{item.amount?.toLocaleString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Invoice Summary */}
                <div className="flex justify-end">
                  <div className="w-full max-w-sm space-y-2 p-4 bg-gray-50 rounded-lg">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span>₹{parseFloat(viewInvoice.subtotal).toLocaleString()}</span>
                    </div>
                    {parseFloat(viewInvoice.taxAmount) > 0 && (
                      <div className="flex justify-between">
                        <span>Tax ({viewInvoice.taxRate}%):</span>
                        <span>₹{parseFloat(viewInvoice.taxAmount).toLocaleString()}</span>
                      </div>
                    )}
                    {parseFloat(viewInvoice.shippingCost) > 0 && (
                      <div className="flex justify-between">
                        <span>Shipping:</span>
                        <span>₹{parseFloat(viewInvoice.shippingCost).toLocaleString()}</span>
                      </div>
                    )}
                    {parseFloat(viewInvoice.discount) > 0 && (
                      <div className="flex justify-between">
                        <span>Discount:</span>
                        <span>-₹{parseFloat(viewInvoice.discount).toLocaleString()}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold text-lg pt-2 border-t">
                      <span>Total:</span>
                      <span>₹{parseFloat(viewInvoice.totalAmount).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-4 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setIsViewDialogOpen(false)}
                  >
                    Close
                  </Button>
                  <Button
                    onClick={() => {
                      handleEdit(viewInvoice);
                      setIsViewDialogOpen(false);
                    }}
                    className="bg-primary hover:bg-primary/90 text-white"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Invoice
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
