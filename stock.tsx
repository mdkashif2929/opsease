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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, Edit, AlertTriangle, Package, TrendingDown, Boxes } from "lucide-react";
import type { Stock } from "@shared/schema";

export default function StockPage() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingStock, setEditingStock] = useState<Stock | null>(null);
  const [formData, setFormData] = useState({
    itemName: "",
    category: "",
    currentQuantity: 0,
    unit: "",
    reorderLevel: 10,
    unitCost: "",
    supplier: "",
    location: "",
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

  const { data: stock, isLoading: stockLoading } = useQuery({
    queryKey: ["/api/stock"],
    enabled: isAuthenticated,
  });

  const { data: lowStock } = useQuery({
    queryKey: ["/api/stock/low-stock"],
    enabled: isAuthenticated,
  });

  const createStockMutation = useMutation({
    mutationFn: async (stockData: any) => {
      return await apiRequest("/api/stock", "POST", stockData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stock"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stock/low-stock"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({ title: "Success", description: "Stock item added successfully" });
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
        description: "Failed to add stock item",
        variant: "destructive",
      });
    },
  });

  const updateStockMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return await apiRequest(`/api/stock/${id}`, "PUT", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stock"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stock/low-stock"] });
      toast({ title: "Success", description: "Stock item updated successfully" });
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
        description: "Failed to update stock item",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      itemName: "",
      category: "",
      currentQuantity: 0,
      unit: "",
      reorderLevel: 10,
      unitCost: "",
      supplier: "",
      location: "",
    });
    setEditingStock(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingStock) {
      updateStockMutation.mutate({ id: editingStock.id, data: formData });
    } else {
      createStockMutation.mutate(formData);
    }
  };

  const handleEdit = (stockItem: Stock) => {
    setEditingStock(stockItem);
    setFormData({
      itemName: stockItem.itemName,
      category: stockItem.category,
      currentQuantity: stockItem.currentQuantity,
      unit: stockItem.unit,
      reorderLevel: stockItem.reorderLevel || 10,
      unitCost: stockItem.unitCost || "",
      supplier: stockItem.supplier || "",
      location: stockItem.location || "",
    });
    setIsDialogOpen(true);
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      raw_materials: "Raw Materials",
      finished_goods: "Finished Goods",
      accessories: "Accessories",
    };
    return labels[category] || category;
  };

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, string> = {
      raw_materials: "📦",
      finished_goods: "👕",
      accessories: "🔘",
    };
    return icons[category] || "📦";
  };

  const getStockStatus = (currentQuantity: number, reorderLevel: number) => {
    if (currentQuantity === 0) {
      return { status: "Out of Stock", color: "bg-red-100 text-red-800", severity: "critical" };
    } else if (currentQuantity <= reorderLevel * 0.5) {
      return { status: "Critical", color: "bg-red-100 text-red-800", severity: "critical" };
    } else if (currentQuantity <= reorderLevel) {
      return { status: "Low Stock", color: "bg-yellow-100 text-yellow-800", severity: "low" };
    } else {
      return { status: "In Stock", color: "bg-green-100 text-green-800", severity: "good" };
    }
  };

  const filteredStock = stock?.filter((item: Stock) => {
    const matchesSearch = item.itemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.supplier?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === "all" || item.category === categoryFilter;
    return matchesSearch && matchesCategory;
  }) || [];

  const totalItems = stock?.length || 0;
  const lowStockCount = lowStock?.length || 0;
  const totalValue = stock?.reduce((sum, item) => 
    sum + (item.currentQuantity * parseFloat(item.unitCost || "0")), 0
  ) || 0;

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
            <h1 className="text-3xl font-bold text-foreground">Stock Management</h1>
            <p className="text-muted-foreground mt-1">Track inventory and manage stock levels</p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90 text-white mt-4 sm:mt-0" onClick={resetForm}>
                <Plus className="h-4 w-4 mr-2" />
                Add Stock Item
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editingStock ? "Edit Stock Item" : "Add New Stock Item"}</DialogTitle>
              </DialogHeader>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="itemName">Item Name</Label>
                    <Input
                      id="itemName"
                      value={formData.itemName}
                      onChange={(e) => setFormData({ ...formData, itemName: e.target.value })}
                      placeholder="Cotton Fabric"
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="category">Category</Label>
                    <Select 
                      value={formData.category} 
                      onValueChange={(value) => setFormData({ ...formData, category: value })}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="raw_materials">Raw Materials</SelectItem>
                        <SelectItem value="finished_goods">Finished Goods</SelectItem>
                        <SelectItem value="accessories">Accessories</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="currentQuantity">Current Quantity</Label>
                    <Input
                      id="currentQuantity"
                      type="number"
                      value={formData.currentQuantity}
                      onChange={(e) => setFormData({ ...formData, currentQuantity: parseInt(e.target.value) || 0 })}
                      placeholder="100"
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="unit">Unit</Label>
                    <Select 
                      value={formData.unit} 
                      onValueChange={(value) => setFormData({ ...formData, unit: value })}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select unit" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pieces">Pieces</SelectItem>
                        <SelectItem value="meters">Meters</SelectItem>
                        <SelectItem value="kg">Kilograms</SelectItem>
                        <SelectItem value="liters">Liters</SelectItem>
                        <SelectItem value="yards">Yards</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="reorderLevel">Reorder Level</Label>
                    <Input
                      id="reorderLevel"
                      type="number"
                      value={formData.reorderLevel}
                      onChange={(e) => setFormData({ ...formData, reorderLevel: parseInt(e.target.value) || 10 })}
                      placeholder="10"
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="unitCost">Unit Cost (₹)</Label>
                    <Input
                      id="unitCost"
                      type="number"
                      step="0.01"
                      value={formData.unitCost}
                      onChange={(e) => setFormData({ ...formData, unitCost: e.target.value })}
                      placeholder="25.00"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="supplier">Supplier</Label>
                    <Input
                      id="supplier"
                      value={formData.supplier}
                      onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                      placeholder="Supplier name"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      placeholder="Warehouse A, Shelf 1"
                    />
                  </div>
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
                    disabled={createStockMutation.isPending || updateStockMutation.isPending}
                  >
                    {createStockMutation.isPending || updateStockMutation.isPending
                      ? "Saving..."
                      : editingStock
                      ? "Update Item"
                      : "Add Item"
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
                  <p className="text-muted-foreground text-sm font-medium">Total Items</p>
                  <p className="text-3xl font-bold text-foreground">{totalItems}</p>
                </div>
                <div className="bg-blue-100 p-3 rounded-lg">
                  <Package className="text-blue-600 h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm font-medium">Low Stock Alerts</p>
                  <p className="text-3xl font-bold text-foreground">{lowStockCount}</p>
                </div>
                <div className="bg-yellow-100 p-3 rounded-lg">
                  <AlertTriangle className="text-yellow-600 h-6 w-6" />
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-2">Items need reordering</p>
            </CardContent>
          </Card>

          <Card className="border border-border">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm font-medium">Total Value</p>
                  <p className="text-3xl font-bold text-foreground">₹{totalValue.toLocaleString()}</p>
                </div>
                <div className="bg-green-100 p-3 rounded-lg">
                  <TrendingDown className="text-green-600 h-6 w-6" />
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-2">Current inventory value</p>
            </CardContent>
          </Card>

          <Card className="border border-border">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm font-medium">Categories</p>
                  <p className="text-3xl font-bold text-foreground">3</p>
                </div>
                <div className="bg-purple-100 p-3 rounded-lg">
                  <Boxes className="text-purple-600 h-6 w-6" />
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-2">Item categories</p>
            </CardContent>
          </Card>
        </div>

        {/* Low Stock Alerts */}
        {lowStock && lowStock.length > 0 && (
          <Card className="mb-8 border-yellow-200 bg-yellow-50">
            <CardHeader>
              <div className="flex items-center space-x-2">
                <AlertTriangle className="text-yellow-600 h-5 w-5" />
                <h2 className="text-lg font-semibold text-yellow-800">Stock Alerts</h2>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {lowStock.slice(0, 6).map((item: Stock) => {
                  const stockStatus = getStockStatus(item.currentQuantity, item.reorderLevel || 10);
                  return (
                    <div key={item.id} className="bg-white p-4 rounded-lg border border-yellow-200">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center space-x-2">
                          <span>{getCategoryIcon(item.category)}</span>
                          <h3 className="font-medium text-foreground">{item.itemName}</h3>
                        </div>
                        <Badge className={stockStatus.color}>
                          {stockStatus.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {item.currentQuantity} {item.unit} remaining
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Reorder at: {item.reorderLevel} {item.unit}
                      </p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filters Section */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search items by name or supplier..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="raw_materials">Raw Materials</SelectItem>
                  <SelectItem value="finished_goods">Finished Goods</SelectItem>
                  <SelectItem value="accessories">Accessories</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Stock Table */}
        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold text-foreground">
              Stock Items ({filteredStock.length})
            </h2>
          </CardHeader>
          <CardContent>
            {stockLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-16 bg-gray-200 rounded"></div>
                  </div>
                ))}
              </div>
            ) : filteredStock.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">
                  {searchTerm || categoryFilter !== "all" 
                    ? "No stock items match your search criteria" 
                    : "No stock items found"
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
                  Add Your First Stock Item
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Current Stock</TableHead>
                      <TableHead>Reorder Level</TableHead>
                      <TableHead>Unit Cost</TableHead>
                      <TableHead>Total Value</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStock.map((item: Stock) => {
                      const stockStatus = getStockStatus(item.currentQuantity, item.reorderLevel || 10);
                      const totalValue = item.currentQuantity * parseFloat(item.unitCost || "0");
                      
                      return (
                        <TableRow key={item.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{item.itemName}</div>
                              {item.location && (
                                <div className="text-sm text-muted-foreground">{item.location}</div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <span>{getCategoryIcon(item.category)}</span>
                              <span>{getCategoryLabel(item.category)}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">
                              {item.currentQuantity.toLocaleString()} {item.unit}
                            </div>
                          </TableCell>
                          <TableCell>
                            {(item.reorderLevel || 0).toLocaleString()} {item.unit}
                          </TableCell>
                          <TableCell>
                            {item.unitCost ? `₹${parseFloat(item.unitCost).toLocaleString()}` : "-"}
                          </TableCell>
                          <TableCell>
                            {item.unitCost ? `₹${totalValue.toLocaleString()}` : "-"}
                          </TableCell>
                          <TableCell>
                            <Badge className={stockStatus.color}>
                              {stockStatus.status}
                            </Badge>
                          </TableCell>
                          <TableCell>{item.supplier || "-"}</TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(item)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
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
