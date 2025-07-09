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
import { Progress } from "@/components/ui/progress";
import { Plus, Search, Edit, AlertTriangle } from "lucide-react";
import type { ProductionPlan, Order } from "@shared/schema";

export default function Production() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [stageFilter, setStageFilter] = useState("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<ProductionPlan | null>(null);
  const [formData, setFormData] = useState({
    orderId: "",
    stage: "",
    targetQuantity: 0,
    assignedTeam: "",
    startDate: "",
    endDate: "",
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

  const { data: plans, isLoading: plansLoading } = useQuery({
    queryKey: ["/api/production-plans"],
    enabled: isAuthenticated,
  });

  const { data: orders } = useQuery({
    queryKey: ["/api/orders"],
    enabled: isAuthenticated,
  });

  const createPlanMutation = useMutation({
    mutationFn: async (planData: any) => {
      return await apiRequest("/api/production-plans", "POST", {
        ...planData,
        status: "pending",
        completedQuantity: 0,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/production-plans"] });
      toast({ title: "Success", description: "Production plan created successfully" });
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
        description: "Failed to create production plan",
        variant: "destructive",
      });
    },
  });

  const updatePlanMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return await apiRequest(`/api/production-plans/${id}`, "PUT", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/production-plans"] });
      toast({ title: "Success", description: "Production plan updated successfully" });
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
        description: "Failed to update production plan",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      orderId: "",
      stage: "",
      targetQuantity: 0,
      assignedTeam: "",
      startDate: "",
      endDate: "",
      notes: "",
    });
    setEditingPlan(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingPlan) {
      updatePlanMutation.mutate({ id: editingPlan.id, data: formData });
    } else {
      createPlanMutation.mutate(formData);
    }
  };

  const handleEdit = (plan: ProductionPlan) => {
    setEditingPlan(plan);
    setFormData({
      orderId: plan.orderId,
      stage: plan.stage,
      targetQuantity: plan.targetQuantity,
      assignedTeam: plan.assignedTeam || "",
      startDate: plan.startDate || "",
      endDate: plan.endDate || "",
      notes: plan.notes || "",
    });
    setIsDialogOpen(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-gray-100 text-gray-800";
      case "in_progress":
        return "bg-blue-100 text-blue-800";
      case "completed":
        return "bg-green-100 text-green-800";
      case "delayed":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatStatus = (status: string) => {
    return status.split("_").map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(" ");
  };

  const formatStage = (stage: string) => {
    return stage.split("_").map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(" ");
  };

  const getOrderById = (orderId: string) => {
    return orders?.find((order: Order) => order.id === orderId);
  };

  const calculateProgress = (completed: number, target: number) => {
    return target > 0 ? Math.min((completed / target) * 100, 100) : 0;
  };

  const isDelayed = (plan: ProductionPlan) => {
    if (!plan.endDate) return false;
    const today = new Date();
    const endDate = new Date(plan.endDate);
    return today > endDate && plan.status !== "completed";
  };

  const filteredPlans = plans?.filter((plan: ProductionPlan) => {
    const order = getOrderById(plan.orderId);
    const matchesSearch = order?.orderId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order?.buyerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         plan.stage.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStage = stageFilter === "all" || plan.stage === stageFilter;
    return matchesSearch && matchesStage;
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
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Production Planning</h1>
            <p className="text-muted-foreground mt-1">Set targets, assign teams, and track progress</p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90 text-white mt-4 sm:mt-0" onClick={resetForm}>
                <Plus className="h-4 w-4 mr-2" />
                Add Production Plan
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editingPlan ? "Edit Production Plan" : "Create Production Plan"}</DialogTitle>
              </DialogHeader>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="orderId">Order</Label>
                    <Select 
                      value={formData.orderId} 
                      onValueChange={(value) => setFormData({ ...formData, orderId: value })}
                      required
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
                  
                  <div>
                    <Label htmlFor="stage">Production Stage</Label>
                    <Select 
                      value={formData.stage} 
                      onValueChange={(value) => setFormData({ ...formData, stage: value })}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select stage" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cutting">Cutting</SelectItem>
                        <SelectItem value="stitching">Stitching</SelectItem>
                        <SelectItem value="quality_check">Quality Check</SelectItem>
                        <SelectItem value="packaging">Packaging</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="targetQuantity">Target Quantity</Label>
                    <Input
                      id="targetQuantity"
                      type="number"
                      value={formData.targetQuantity}
                      onChange={(e) => setFormData({ ...formData, targetQuantity: parseInt(e.target.value) || 0 })}
                      placeholder="1000"
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="assignedTeam">Assigned Team</Label>
                    <Input
                      id="assignedTeam"
                      value={formData.assignedTeam}
                      onChange={(e) => setFormData({ ...formData, assignedTeam: e.target.value })}
                      placeholder="Team A"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="startDate">Start Date</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="endDate">End Date</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Additional notes or requirements"
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
                    disabled={createPlanMutation.isPending || updatePlanMutation.isPending}
                  >
                    {createPlanMutation.isPending || updatePlanMutation.isPending
                      ? "Saving..."
                      : editingPlan
                      ? "Update Plan"
                      : "Create Plan"
                    }
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Production Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {["cutting", "stitching", "quality_check", "packaging"].map((stage) => {
            const stagePlans = plans?.filter((plan: ProductionPlan) => plan.stage === stage) || [];
            const totalTarget = stagePlans.reduce((sum, plan) => sum + plan.targetQuantity, 0);
            const totalCompleted = stagePlans.reduce((sum, plan) => sum + (plan.completedQuantity || 0), 0);
            const progress = totalTarget > 0 ? (totalCompleted / totalTarget) * 100 : 0;
            
            return (
              <Card key={stage} className="border border-border">
                <CardContent className="p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-semibold text-foreground">{formatStage(stage)}</h3>
                    <span className="text-sm text-muted-foreground">{Math.round(progress)}%</span>
                  </div>
                  <Progress value={progress} className="mb-2" />
                  <p className="text-sm text-muted-foreground">
                    {totalCompleted.toLocaleString()} / {totalTarget.toLocaleString()} units
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Filters Section */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search by order ID, buyer, or stage..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <Select value={stageFilter} onValueChange={setStageFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by stage" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stages</SelectItem>
                  <SelectItem value="cutting">Cutting</SelectItem>
                  <SelectItem value="stitching">Stitching</SelectItem>
                  <SelectItem value="quality_check">Quality Check</SelectItem>
                  <SelectItem value="packaging">Packaging</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Production Plans Table */}
        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold text-foreground">
              Production Plans ({filteredPlans.length})
            </h2>
          </CardHeader>
          <CardContent>
            {plansLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-16 bg-gray-200 rounded"></div>
                  </div>
                ))}
              </div>
            ) : filteredPlans.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">
                  {searchTerm || stageFilter !== "all" 
                    ? "No production plans match your search criteria" 
                    : "No production plans found"
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
                  Create Your First Production Plan
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order</TableHead>
                      <TableHead>Stage</TableHead>
                      <TableHead>Progress</TableHead>
                      <TableHead>Team</TableHead>
                      <TableHead>Timeline</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPlans.map((plan: ProductionPlan) => {
                      const order = getOrderById(plan.orderId);
                      const progress = calculateProgress(plan.completedQuantity || 0, plan.targetQuantity);
                      const delayed = isDelayed(plan);
                      
                      return (
                        <TableRow key={plan.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{order?.orderId}</div>
                              <div className="text-sm text-muted-foreground">{order?.buyerName}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{formatStage(plan.stage)}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-2">
                              <Progress value={progress} className="w-20" />
                              <div className="text-sm text-muted-foreground">
                                {(plan.completedQuantity || 0).toLocaleString()} / {plan.targetQuantity.toLocaleString()}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{plan.assignedTeam || "-"}</TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {plan.startDate && (
                                <div>Start: {new Date(plan.startDate).toLocaleDateString()}</div>
                              )}
                              {plan.endDate && (
                                <div className={delayed ? "text-red-600" : ""}>
                                  End: {new Date(plan.endDate).toLocaleDateString()}
                                  {delayed && <AlertTriangle className="inline h-3 w-3 ml-1" />}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(plan.status || "pending")}>
                              {formatStatus(plan.status || "pending")}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(plan)}
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
