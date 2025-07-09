import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import Header from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Search, Edit, Trash2, Eye, ShoppingCart, Truck } from "lucide-react";
import type { Order, Customer, Supplier } from "@shared/schema";

interface OrdersTabProps {
  orderType: "sales_order" | "purchase_order";
  orders: Order[];
  onAddOrder: () => void;
  onEditOrder: (order: Order) => void;
  onDeleteOrder: (orderId: string) => void;
  onViewOrder: (order: Order) => void;
}

function OrdersTab({ orderType, orders, onAddOrder, onEditOrder, onDeleteOrder, onViewOrder }: OrdersTabProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">
            {orderType === "sales_order" ? "Sales Orders" : "Purchase Orders"}
          </CardTitle>
          <Button onClick={onAddOrder} className="bg-[#1AADA3] hover:bg-[#1AADA3]/90">
            <Plus className="h-4 w-4 mr-2" />
            Add {orderType === "sales_order" ? "Sales" : "Purchase"} Order
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {orders.length === 0 ? (
          <div className="text-center py-8">
            {orderType === "sales_order" ? (
              <ShoppingCart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            ) : (
              <Truck className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            )}
            <h3 className="text-lg font-medium mb-2">
              No {orderType === "sales_order" ? "sales" : "purchase"} orders found
            </h3>
            <p className="text-muted-foreground mb-4">
              Get started by creating your first {orderType === "sales_order" ? "sales" : "purchase"} order
            </p>
            <Button onClick={onAddOrder} className="bg-[#1AADA3] hover:bg-[#1AADA3]/90">
              <Plus className="h-4 w-4 mr-2" />
              Add {orderType === "sales_order" ? "Sales" : "Purchase"} Order
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order ID</TableHead>
                <TableHead>{orderType === "sales_order" ? "Customer" : "Supplier"}</TableHead>
                <TableHead>Total Value</TableHead>
                <TableHead>Delivery Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-medium">{order.orderId}</TableCell>
                  <TableCell>{order.partyName}</TableCell>
                  <TableCell>₹{parseFloat(order.totalValue).toLocaleString()}</TableCell>
                  <TableCell>{new Date(order.deliveryDate).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Badge 
                      variant={
                        order.status === "completed" ? "default" : 
                        order.status === "in_progress" ? "secondary" :
                        order.status === "delayed" ? "destructive" :
                        order.status === "cancelled" ? "destructive" :
                        "outline"
                      }
                    >
                      {order.status.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase())}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button variant="ghost" size="sm" onClick={() => onViewOrder(order)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => onEditOrder(order)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => onDeleteOrder(order.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

export default function Orders() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("sales_order");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [viewingOrder, setViewingOrder] = useState<Order | null>(null);
  const [formData, setFormData] = useState({
    orderId: "",
    orderType: "sales_order" as "sales_order" | "purchase_order",
    customerId: "",
    supplierId: "",
    partyName: "",
    partyEmail: "",
    partyPhone: "",
    products: [{ name: "", description: "", quantity: 0, unitPrice: 0 }],
    deliveryDate: "",
    notes: "",
    status: "planning",
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

  const { data: orders, isLoading: ordersLoading } = useQuery({
    queryKey: ["/api/orders"],
    enabled: isAuthenticated,
  });

  const { data: customers } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
    enabled: isAuthenticated,
  });

  const { data: suppliers } = useQuery<Supplier[]>({
    queryKey: ["/api/suppliers"],
    enabled: isAuthenticated,
  });

  const createOrderMutation = useMutation({
    mutationFn: async (orderData: any) => {
      const totalQuantity = orderData.products.reduce((sum: number, p: any) => sum + p.quantity, 0);
      const totalValue = orderData.products.reduce((sum: number, p: any) => sum + (p.quantity * p.unitPrice), 0);
      
      // Clean up the data - remove empty strings and undefined values
      const cleanData = {
        ...orderData,
        totalQuantity,
        totalValue: totalValue.toString(),
        orderDate: new Date().toISOString().split('T')[0],
      };

      // Remove empty fields to avoid validation issues
      if (!cleanData.customerId || cleanData.customerId === "") {
        delete cleanData.customerId;
      }
      if (!cleanData.supplierId || cleanData.supplierId === "") {
        delete cleanData.supplierId;
      }
      
      return await apiRequest("/api/orders", "POST", cleanData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      toast({ title: "Success", description: "Order created successfully" });
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
        description: "Failed to create order",
        variant: "destructive",
      });
    },
  });

  const updateOrderMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const totalQuantity = data.products.reduce((sum: number, p: any) => sum + p.quantity, 0);
      const totalValue = data.products.reduce((sum: number, p: any) => sum + (p.quantity * p.unitPrice), 0);
      
      const cleanData = {
        ...data,
        totalQuantity,
        totalValue: totalValue.toString(),
      };

      if (!cleanData.customerId || cleanData.customerId === "") {
        delete cleanData.customerId;
      }
      if (!cleanData.supplierId || cleanData.supplierId === "") {
        delete cleanData.supplierId;
      }
      
      return await apiRequest(`/api/orders/${id}`, "PUT", cleanData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      toast({ title: "Success", description: "Order updated successfully" });
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
        description: "Failed to update order",
        variant: "destructive",
      });
    },
  });

  const deleteOrderMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest(`/api/orders/${id}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      toast({ title: "Success", description: "Order deleted successfully" });
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
        description: "Failed to delete order",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      orderId: "",
      orderType: activeTab as "sales_order" | "purchase_order",
      customerId: "",
      supplierId: "",
      partyName: "",
      partyEmail: "",
      partyPhone: "",
      products: [{ name: "", description: "", quantity: 0, unitPrice: 0 }],
      deliveryDate: "",
      notes: "",
      status: "planning",
    });
    setEditingOrder(null);
  };

  const handlePartySelection = (partyId: string) => {
    let party;
    if (formData.orderType === "sales_order") {
      party = customers?.find(c => c.id === partyId);
      setFormData(prev => ({
        ...prev,
        customerId: partyId,
        supplierId: "",
        partyName: party?.companyName || "",
        partyEmail: party?.email || "",
        partyPhone: party?.phone || "",
      }));
    } else {
      party = suppliers?.find(s => s.id === partyId);
      setFormData(prev => ({
        ...prev,
        supplierId: partyId,
        customerId: "",
        partyName: party?.companyName || "",
        partyEmail: party?.email || "",
        partyPhone: party?.phone || "",
      }));
    }
  };

  const handleOrderTypeChange = (orderType: "sales_order" | "purchase_order") => {
    setFormData(prev => ({
      ...prev,
      orderType,
      customerId: "",
      supplierId: "",
      partyName: "",
      partyEmail: "",
      partyPhone: "",
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingOrder) {
      updateOrderMutation.mutate({ id: editingOrder.id, data: formData });
    } else {
      createOrderMutation.mutate(formData);
    }
  };

  const handleEditOrder = (order: Order) => {
    setEditingOrder(order);
    setFormData({
      orderId: order.orderId,
      orderType: order.orderType as "sales_order" | "purchase_order",
      customerId: order.customerId || "",
      supplierId: order.supplierId || "",
      partyName: order.partyName,
      partyEmail: order.partyEmail || "",
      partyPhone: order.partyPhone || "",
      products: order.products as any[],
      deliveryDate: order.deliveryDate,
      notes: order.notes || "",
      status: order.status,
    });
    setIsDialogOpen(true);
  };

  const handleDeleteOrder = (orderId: string) => {
    if (confirm("Are you sure you want to delete this order?")) {
      deleteOrderMutation.mutate(orderId);
    }
  };

  const handleViewOrder = (order: Order) => {
    setViewingOrder(order);
    setIsViewDialogOpen(true);
  };

  const addProduct = () => {
    setFormData({
      ...formData,
      products: [...formData.products, { name: "", description: "", quantity: 0, unitPrice: 0 }]
    });
  };

  const updateProduct = (index: number, field: string, value: string | number) => {
    const updatedProducts = formData.products.map((product, i) => 
      i === index ? { ...product, [field]: value } : product
    );
    setFormData({ ...formData, products: updatedProducts });
  };

  const removeProduct = (index: number) => {
    const updatedProducts = formData.products.filter((_, i) => i !== index);
    setFormData({ ...formData, products: updatedProducts });
  };

  const filteredOrders = orders?.filter((order: Order) => {
    const matchesType = order.orderType === activeTab;
    return matchesType;
  }) || [];

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
    <>
      <Header />
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#601809] dark:text-white">Order Management</h1>
            <p className="text-muted-foreground">Manage your sales and purchase orders</p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="sales_order" className="flex items-center space-x-2">
              <ShoppingCart className="h-4 w-4" />
              <span>Sales Orders</span>
            </TabsTrigger>
            <TabsTrigger value="purchase_order" className="flex items-center space-x-2">
              <Truck className="h-4 w-4" />
              <span>Purchase Orders</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="sales_order">
            <OrdersTab 
              orderType="sales_order" 
              orders={filteredOrders}
              onAddOrder={() => {
                setFormData(prev => ({ ...prev, orderType: "sales_order" }));
                setIsDialogOpen(true);
              }}
              onEditOrder={handleEditOrder}
              onDeleteOrder={handleDeleteOrder}
              onViewOrder={handleViewOrder}
            />
          </TabsContent>

          <TabsContent value="purchase_order">
            <OrdersTab 
              orderType="purchase_order" 
              orders={filteredOrders}
              onAddOrder={() => {
                setFormData(prev => ({ ...prev, orderType: "purchase_order" }));
                setIsDialogOpen(true);
              }}
              onEditOrder={handleEditOrder}
              onDeleteOrder={handleDeleteOrder}
              onViewOrder={handleViewOrder}
            />
          </TabsContent>
        </Tabs>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingOrder ? "Edit Order" : `Create New ${formData.orderType === "sales_order" ? "Sales" : "Purchase"} Order`}
              </DialogTitle>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="orderId">Order ID *</Label>
                  <Input
                    id="orderId"
                    value={formData.orderId}
                    onChange={(e) => setFormData({ ...formData, orderId: e.target.value })}
                    placeholder="ORD-2024-001"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="orderType">Order Type *</Label>
                  <Select 
                    value={formData.orderType} 
                    onValueChange={(value: "sales_order" | "purchase_order") => handleOrderTypeChange(value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sales_order">Sales Order</SelectItem>
                      <SelectItem value="purchase_order">Purchase Order</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="party">
                    {formData.orderType === "sales_order" ? "Customer" : "Supplier"} *
                  </Label>
                  <Select 
                    value={formData.orderType === "sales_order" ? formData.customerId : formData.supplierId} 
                    onValueChange={handlePartySelection}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={`Select ${formData.orderType === "sales_order" ? "customer" : "supplier"}`} />
                    </SelectTrigger>
                    <SelectContent>
                      {formData.orderType === "sales_order" 
                        ? customers?.map((customer) => (
                            <SelectItem key={customer.id} value={customer.id}>
                              {customer.companyName} ({customer.customerCode})
                            </SelectItem>
                          ))
                        : suppliers?.map((supplier) => (
                            <SelectItem key={supplier.id} value={supplier.id}>
                              {supplier.companyName} ({supplier.supplierCode})
                            </SelectItem>
                          ))
                      }
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="deliveryDate">Delivery Date *</Label>
                  <Input
                    id="deliveryDate"
                    type="date"
                    value={formData.deliveryDate}
                    onChange={(e) => setFormData({ ...formData, deliveryDate: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="status">Status *</Label>
                  <Select 
                    value={formData.status} 
                    onValueChange={(value) => setFormData({ ...formData, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="planning">Planning</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="delayed">Delayed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Products Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-lg font-medium">Products</Label>
                  <Button type="button" onClick={addProduct} variant="outline" size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Product
                  </Button>
                </div>
                
                {formData.products.map((product, index) => (
                  <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 border rounded-lg">
                    <div>
                      <Label htmlFor={`product-name-${index}`}>Product Name</Label>
                      <Input
                        id={`product-name-${index}`}
                        value={product.name}
                        onChange={(e) => updateProduct(index, "name", e.target.value)}
                        placeholder="Product name"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor={`product-quantity-${index}`}>Quantity</Label>
                      <Input
                        id={`product-quantity-${index}`}
                        type="number"
                        value={product.quantity}
                        onChange={(e) => updateProduct(index, "quantity", parseInt(e.target.value) || 0)}
                        placeholder="0"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor={`product-price-${index}`}>Unit Price (₹)</Label>
                      <Input
                        id={`product-price-${index}`}
                        type="number"
                        step="0.01"
                        value={product.unitPrice}
                        onChange={(e) => updateProduct(index, "unitPrice", parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                        required
                      />
                    </div>
                    <div className="flex items-end">
                      <Button 
                        type="button" 
                        onClick={() => removeProduct(index)} 
                        variant="outline" 
                        size="sm"
                        disabled={formData.products.length === 1}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Additional notes..."
                  rows={3}
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  className="bg-[#1AADA3] hover:bg-[#1AADA3]/90"
                  disabled={createOrderMutation.isPending || updateOrderMutation.isPending}
                >
                  {(createOrderMutation.isPending || updateOrderMutation.isPending)
                    ? (editingOrder ? "Updating..." : "Creating...") 
                    : editingOrder ? "Update Order" : "Create Order"
                  }
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* View Order Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                View Order - {viewingOrder?.orderId}
              </DialogTitle>
            </DialogHeader>
            
            {viewingOrder && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="font-medium">Order Type</Label>
                    <p className="text-sm text-muted-foreground">
                      {viewingOrder.orderType === "sales_order" ? "Sales Order" : "Purchase Order"}
                    </p>
                  </div>
                  <div>
                    <Label className="font-medium">Order ID</Label>
                    <p className="text-sm text-muted-foreground">{viewingOrder.orderId}</p>
                  </div>
                  <div>
                    <Label className="font-medium">
                      {viewingOrder.orderType === "sales_order" ? "Customer" : "Supplier"}
                    </Label>
                    <p className="text-sm text-muted-foreground">{viewingOrder.partyName}</p>
                  </div>
                  <div>
                    <Label className="font-medium">Email</Label>
                    <p className="text-sm text-muted-foreground">{viewingOrder.partyEmail || "N/A"}</p>
                  </div>
                  <div>
                    <Label className="font-medium">Phone</Label>
                    <p className="text-sm text-muted-foreground">{viewingOrder.partyPhone || "N/A"}</p>
                  </div>
                  <div>
                    <Label className="font-medium">Delivery Date</Label>
                    <p className="text-sm text-muted-foreground">
                      {new Date(viewingOrder.deliveryDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <Label className="font-medium">Order Date</Label>
                    <p className="text-sm text-muted-foreground">
                      {new Date(viewingOrder.orderDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <Label className="font-medium">Status</Label>
                    <Badge 
                      variant={
                        viewingOrder.status === "completed" ? "default" : 
                        viewingOrder.status === "in_progress" ? "secondary" :
                        viewingOrder.status === "delayed" ? "destructive" :
                        viewingOrder.status === "cancelled" ? "destructive" :
                        "outline"
                      }
                    >
                      {viewingOrder.status.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase())}
                    </Badge>
                  </div>
                </div>

                <div>
                  <Label className="font-medium text-lg">Products</Label>
                  <div className="mt-2 space-y-2">
                    {(viewingOrder.products as any[]).map((product, index) => (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div>
                            <Label className="text-xs">Product Name</Label>
                            <p className="text-sm">{product.name}</p>
                          </div>
                          <div>
                            <Label className="text-xs">Quantity</Label>
                            <p className="text-sm">{product.quantity}</p>
                          </div>
                          <div>
                            <Label className="text-xs">Unit Price</Label>
                            <p className="text-sm">₹{product.unitPrice}</p>
                          </div>
                          <div>
                            <Label className="text-xs">Total</Label>
                            <p className="text-sm font-medium">₹{(product.quantity * product.unitPrice).toLocaleString()}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                  <div>
                    <Label className="font-medium">Total Quantity</Label>
                    <p className="text-sm text-muted-foreground">{viewingOrder.totalQuantity}</p>
                  </div>
                  <div>
                    <Label className="font-medium">Total Value</Label>
                    <p className="text-lg font-bold">₹{parseFloat(viewingOrder.totalValue).toLocaleString()}</p>
                  </div>
                </div>

                {viewingOrder.notes && (
                  <div>
                    <Label className="font-medium">Notes</Label>
                    <p className="text-sm text-muted-foreground">{viewingOrder.notes}</p>
                  </div>
                )}
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}