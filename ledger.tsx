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
import { Plus, Search, Download, TrendingUp, TrendingDown, Users, DollarSign } from "lucide-react";
import type { Ledger, Customer, Supplier } from "@shared/schema";

export default function LedgerPage() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [partyTypeFilter, setPartyTypeFilter] = useState("all");
  const [selectedParty, setSelectedParty] = useState("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    partyName: "",
    partyType: "",
    customerId: "",
    supplierId: "",
    entryType: "",
    amount: "",
    description: "",
    reference: "",
    entryDate: new Date().toISOString().split('T')[0],
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

  const { data: ledgerEntries, isLoading: ledgerLoading } = useQuery({
    queryKey: ["/api/ledger", selectedParty && selectedParty !== "all" ? { partyName: selectedParty } : {}],
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

  const createLedgerEntryMutation = useMutation({
    mutationFn: async (ledgerData: any) => {
      // Calculate balance - this would typically be done by the backend
      // For now, we'll send it without balance calculation
      return await apiRequest("/api/ledger", "POST", {
        ...ledgerData,
        balance: "0", // Backend should calculate this based on previous entries
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ledger"] });
      toast({ title: "Success", description: "Ledger entry added successfully" });
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
        description: "Failed to add ledger entry",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      partyName: "",
      partyType: "",
      customerId: "",
      supplierId: "",
      entryType: "",
      amount: "",
      description: "",
      reference: "",
      entryDate: new Date().toISOString().split('T')[0],
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createLedgerEntryMutation.mutate(formData);
  };

  const handlePartyTypeChange = (value: string) => {
    setFormData({
      ...formData,
      partyType: value,
      partyName: "",
      customerId: "",
      supplierId: "",
    });
  };

  const handleCustomerChange = (customerId: string) => {
    const customer = customers?.find((c: Customer) => c.id === customerId);
    if (customer) {
      setFormData({
        ...formData,
        customerId,
        partyName: customer.companyName,
      });
    }
  };

  const handleSupplierChange = (supplierId: string) => {
    const supplier = suppliers?.find((s: Supplier) => s.id === supplierId);
    if (supplier) {
      setFormData({
        ...formData,
        supplierId,
        partyName: supplier.companyName,
      });
    }
  };

  const getEntryTypeColor = (entryType: string) => {
    switch (entryType) {
      case "debit":
        return "text-red-600";
      case "credit":
        return "text-green-600";
      default:
        return "text-gray-600";
    }
  };

  const getPartyTypeIcon = (partyType: string) => {
    switch (partyType) {
      case "buyer":
        return "🏢";
      case "supplier":
        return "📦";
      default:
        return "👤";
    }
  };

  const getPartyTypeColor = (partyType: string) => {
    switch (partyType) {
      case "buyer":
        return "bg-blue-100 text-blue-800";
      case "supplier":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Get unique parties for the party filter
  const uniqueParties = Array.from(
    new Set(ledgerEntries?.map((entry: Ledger) => entry.partyName) || [])
  );

  const filteredEntries = ledgerEntries?.filter((entry: Ledger) => {
    const matchesSearch = entry.partyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         entry.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         entry.reference?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPartyType = partyTypeFilter === "all" || entry.partyType === partyTypeFilter;
    return matchesSearch && matchesPartyType;
  }) || [];

  // Calculate summary statistics
  const totalDebit = filteredEntries.reduce((sum, entry) => 
    entry.entryType === "debit" ? sum + parseFloat(entry.amount) : sum, 0
  );

  const totalCredit = filteredEntries.reduce((sum, entry) => 
    entry.entryType === "credit" ? sum + parseFloat(entry.amount) : sum, 0
  );

  const netBalance = totalCredit - totalDebit;

  const buyerEntries = ledgerEntries?.filter((entry: Ledger) => entry.partyType === 'buyer') || [];
  const supplierEntries = ledgerEntries?.filter((entry: Ledger) => entry.partyType === 'supplier') || [];

  const buyerBalance = buyerEntries.reduce((sum, entry) => 
    entry.entryType === "credit" ? sum + parseFloat(entry.amount) : sum - parseFloat(entry.amount), 0
  );

  const supplierBalance = supplierEntries.reduce((sum, entry) => 
    entry.entryType === "debit" ? sum + parseFloat(entry.amount) : sum - parseFloat(entry.amount), 0
  );

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
            <h1 className="text-3xl font-bold text-foreground">Ledger Book</h1>
            <p className="text-muted-foreground mt-1">Manage buyer and supplier accounts</p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90 text-white mt-4 sm:mt-0" onClick={resetForm}>
                <Plus className="h-4 w-4 mr-2" />
                Add Entry
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add Ledger Entry</DialogTitle>
              </DialogHeader>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="partyType">Party Type</Label>
                    <Select 
                      value={formData.partyType} 
                      onValueChange={handlePartyTypeChange}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select party type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="buyer">Buyer</SelectItem>
                        <SelectItem value="supplier">Supplier</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="party">
                      {formData.partyType === "buyer" ? "Customer" : 
                       formData.partyType === "supplier" ? "Supplier" : "Party Name"}
                    </Label>
                    {formData.partyType === "buyer" ? (
                      <Select 
                        value={formData.customerId} 
                        onValueChange={handleCustomerChange}
                        required
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select customer" />
                        </SelectTrigger>
                        <SelectContent>
                          {customers?.map((customer: Customer) => (
                            <SelectItem key={customer.id} value={customer.id}>
                              {customer.companyName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : formData.partyType === "supplier" ? (
                      <Select 
                        value={formData.supplierId} 
                        onValueChange={handleSupplierChange}
                        required
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select supplier" />
                        </SelectTrigger>
                        <SelectContent>
                          {suppliers?.map((supplier: Supplier) => (
                            <SelectItem key={supplier.id} value={supplier.id}>
                              {supplier.companyName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        disabled
                        placeholder="Select party type first"
                        value=""
                      />
                    )}
                  </div>
                  
                  <div>
                    <Label htmlFor="entryType">Entry Type</Label>
                    <Select 
                      value={formData.entryType} 
                      onValueChange={(value) => setFormData({ ...formData, entryType: value })}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select entry type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="debit">Debit (Money Out)</SelectItem>
                        <SelectItem value="credit">Credit (Money In)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="amount">Amount (₹)</Label>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      placeholder="10000.00"
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="reference">Reference</Label>
                    <Input
                      id="reference"
                      value={formData.reference}
                      onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                      placeholder="INV-001, ORD-002, etc."
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="entryDate">Entry Date</Label>
                    <Input
                      id="entryDate"
                      type="date"
                      value={formData.entryDate}
                      onChange={(e) => setFormData({ ...formData, entryDate: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Payment received for order XYZ"
                    rows={3}
                    required
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
                    disabled={createLedgerEntryMutation.isPending}
                  >
                    {createLedgerEntryMutation.isPending ? "Saving..." : "Add Entry"}
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
                  <p className="text-muted-foreground text-sm font-medium">Net Balance</p>
                  <p className={`text-3xl font-bold ${netBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {netBalance >= 0 ? '+' : ''}₹{netBalance.toLocaleString()}
                  </p>
                </div>
                <div className={`p-3 rounded-lg ${netBalance >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                  {netBalance >= 0 ? (
                    <TrendingUp className="text-green-600 h-6 w-6" />
                  ) : (
                    <TrendingDown className="text-red-600 h-6 w-6" />
                  )}
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Overall financial position
              </p>
            </CardContent>
          </Card>

          <Card className="border border-border">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm font-medium">Total Credits</p>
                  <p className="text-3xl font-bold text-green-600">₹{totalCredit.toLocaleString()}</p>
                </div>
                <div className="bg-green-100 p-3 rounded-lg">
                  <TrendingUp className="text-green-600 h-6 w-6" />
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-2">Money received</p>
            </CardContent>
          </Card>

          <Card className="border border-border">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm font-medium">Total Debits</p>
                  <p className="text-3xl font-bold text-red-600">₹{totalDebit.toLocaleString()}</p>
                </div>
                <div className="bg-red-100 p-3 rounded-lg">
                  <TrendingDown className="text-red-600 h-6 w-6" />
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-2">Money paid out</p>
            </CardContent>
          </Card>

          <Card className="border border-border">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm font-medium">Total Entries</p>
                  <p className="text-3xl font-bold text-foreground">{filteredEntries.length}</p>
                </div>
                <div className="bg-blue-100 p-3 rounded-lg">
                  <DollarSign className="text-blue-600 h-6 w-6" />
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-2">Transaction records</p>
            </CardContent>
          </Card>
        </div>

        {/* Party Balances */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card className="border border-border">
            <CardHeader>
              <h3 className="text-lg font-semibold text-foreground flex items-center">
                <span className="mr-2">🏢</span>
                Buyer Balance
              </h3>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <p className={`text-2xl font-bold ${buyerBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {buyerBalance >= 0 ? '+' : ''}₹{buyerBalance.toLocaleString()}
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  {buyerBalance >= 0 ? 'Money to receive from buyers' : 'Outstanding payments to buyers'}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border">
            <CardHeader>
              <h3 className="text-lg font-semibold text-foreground flex items-center">
                <span className="mr-2">📦</span>
                Supplier Balance
              </h3>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <p className={`text-2xl font-bold ${supplierBalance >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {supplierBalance >= 0 ? '+' : ''}₹{supplierBalance.toLocaleString()}
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  {supplierBalance >= 0 ? 'Outstanding payments to suppliers' : 'Overpaid to suppliers'}
                </p>
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
                    placeholder="Search by party name, description, or reference..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <Select value={partyTypeFilter} onValueChange={setPartyTypeFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by party type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Parties</SelectItem>
                  <SelectItem value="buyer">Buyers</SelectItem>
                  <SelectItem value="supplier">Suppliers</SelectItem>
                </SelectContent>
              </Select>

              <Select value={selectedParty} onValueChange={setSelectedParty}>
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Filter by specific party" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Parties</SelectItem>
                  {uniqueParties.map((party) => (
                    <SelectItem key={party} value={party}>{party}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button variant="outline" className="border-primary text-primary hover:bg-primary hover:text-white">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Ledger Table */}
        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold text-foreground">
              Ledger Entries ({filteredEntries.length})
              {selectedParty && selectedParty !== "all" && ` - ${selectedParty}`}
            </h2>
          </CardHeader>
          <CardContent>
            {ledgerLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-16 bg-gray-200 rounded"></div>
                  </div>
                ))}
              </div>
            ) : filteredEntries.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">
                  {searchTerm || partyTypeFilter !== "all" || (selectedParty && selectedParty !== "all")
                    ? "No ledger entries match your search criteria" 
                    : "No ledger entries found"
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
                  Add Your First Ledger Entry
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Party</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead>Debit</TableHead>
                      <TableHead>Credit</TableHead>
                      <TableHead>Balance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEntries.map((entry: Ledger) => (
                      <TableRow key={entry.id}>
                        <TableCell>{new Date(entry.entryDate).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <span>{getPartyTypeIcon(entry.partyType)}</span>
                            <div>
                              <div className="font-medium">{entry.partyName}</div>
                              <Badge className={`text-xs ${getPartyTypeColor(entry.partyType)}`}>
                                {entry.partyType}
                              </Badge>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="max-w-xs truncate">{entry.description}</TableCell>
                        <TableCell>{entry.reference || "-"}</TableCell>
                        <TableCell>
                          {entry.entryType === "debit" && (
                            <span className="text-red-600 font-semibold">
                              ₹{parseFloat(entry.amount).toLocaleString()}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          {entry.entryType === "credit" && (
                            <span className="text-green-600 font-semibold">
                              ₹{parseFloat(entry.amount).toLocaleString()}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className={`font-semibold ${parseFloat(entry.balance) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {parseFloat(entry.balance) >= 0 ? '+' : ''}₹{parseFloat(entry.balance).toLocaleString()}
                          </span>
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
