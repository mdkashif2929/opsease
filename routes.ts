import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupSimpleAuth, isAuthenticated } from "./auth";
import {
  insertOrderSchema,
  insertProductionPlanSchema,
  insertExpenseSchema,
  insertStockSchema,
  insertEmployeeSchema,
  insertAttendanceSchema,
  insertPaymentSchema,
  insertInvoiceSchema,
  insertCustomerSchema,
  insertSupplierSchema,
  insertLedgerSchema,
} from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.status(200).json({ 
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  });

  // Auth middleware
  await setupSimpleAuth(app);

  // Helper function to get user ID from session
  const getUserId = (req: any) => (req.session as any).userId;

  // Dashboard stats
  app.get('/api/dashboard/stats', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const stats = await storage.getDashboardStats(userId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  // Orders routes
  app.get('/api/orders', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const orders = await storage.getOrders(userId);
      res.json(orders);
    } catch (error) {
      console.error("Error fetching orders:", error);
      res.status(500).json({ message: "Failed to fetch orders" });
    }
  });

  app.get('/api/orders/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const order = await storage.getOrder(req.params.id, userId);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      res.json(order);
    } catch (error) {
      console.error("Error fetching order:", error);
      res.status(500).json({ message: "Failed to fetch order" });
    }
  });

  app.post('/api/orders', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      console.log("Creating order with data:", req.body);
      const orderData = insertOrderSchema.parse({ ...req.body, userId });
      console.log("Parsed order data:", orderData);
      const order = await storage.createOrder(orderData);
      res.status(201).json(order);
    } catch (error) {
      console.error("Error creating order:", error);
      if (error instanceof Error) {
        console.error("Error message:", error.message);
        console.error("Error stack:", error.stack);
      }
      res.status(500).json({ message: "Failed to create order", error: error instanceof Error ? error.message : String(error) });
    }
  });

  app.put('/api/orders/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const orderData = req.body;
      const order = await storage.updateOrder(req.params.id, orderData, userId);
      res.json(order);
    } catch (error) {
      console.error("Error updating order:", error);
      res.status(500).json({ message: "Failed to update order" });
    }
  });

  app.delete('/api/orders/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const success = await storage.deleteOrder(req.params.id, userId);
      if (!success) {
        return res.status(404).json({ message: "Order not found" });
      }
      res.json({ message: "Order deleted successfully" });
    } catch (error) {
      console.error("Error deleting order:", error);
      res.status(500).json({ message: "Failed to delete order" });
    }
  });

  // Production plans routes
  app.get('/api/production-plans', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const plans = await storage.getProductionPlans(userId);
      res.json(plans);
    } catch (error) {
      console.error("Error fetching production plans:", error);
      res.status(500).json({ message: "Failed to fetch production plans" });
    }
  });

  app.post('/api/production-plans', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const planData = insertProductionPlanSchema.parse({ ...req.body, userId });
      const plan = await storage.createProductionPlan(planData);
      res.status(201).json(plan);
    } catch (error) {
      console.error("Error creating production plan:", error);
      res.status(500).json({ message: "Failed to create production plan" });
    }
  });

  // Expenses routes
  app.get('/api/expenses', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };
      const expenses = await storage.getExpenses(userId, startDate, endDate);
      res.json(expenses);
    } catch (error) {
      console.error("Error fetching expenses:", error);
      res.status(500).json({ message: "Failed to fetch expenses" });
    }
  });

  app.post('/api/expenses', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const expenseData = insertExpenseSchema.parse({ ...req.body, userId });
      const expense = await storage.createExpense(expenseData);
      res.status(201).json(expense);
    } catch (error) {
      console.error("Error creating expense:", error);
      res.status(500).json({ message: "Failed to create expense" });
    }
  });

  app.put('/api/expenses/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const expenseData = req.body;
      const expense = await storage.updateExpense(req.params.id, expenseData, userId);
      res.json(expense);
    } catch (error) {
      console.error("Error updating expense:", error);
      res.status(500).json({ message: "Failed to update expense" });
    }
  });

  app.delete('/api/expenses/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const success = await storage.deleteExpense(req.params.id, userId);
      if (!success) {
        return res.status(404).json({ message: "Expense not found" });
      }
      res.json({ message: "Expense deleted successfully" });
    } catch (error) {
      console.error("Error deleting expense:", error);
      res.status(500).json({ message: "Failed to delete expense" });
    }
  });

  // Stock routes
  app.get('/api/stock', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const stock = await storage.getStock(userId);
      res.json(stock);
    } catch (error) {
      console.error("Error fetching stock:", error);
      res.status(500).json({ message: "Failed to fetch stock" });
    }
  });

  app.get('/api/stock/low-stock', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const lowStockItems = await storage.getLowStockItems(userId);
      res.json(lowStockItems);
    } catch (error) {
      console.error("Error fetching low stock items:", error);
      res.status(500).json({ message: "Failed to fetch low stock items" });
    }
  });

  app.post('/api/stock', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const stockData = insertStockSchema.parse({ ...req.body, userId });
      const stock = await storage.createStockItem(stockData);
      res.status(201).json(stock);
    } catch (error) {
      console.error("Error creating stock item:", error);
      res.status(500).json({ message: "Failed to create stock item" });
    }
  });

  app.put('/api/stock/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const stockData = req.body;
      const stock = await storage.updateStockItem(req.params.id, stockData, userId);
      res.json(stock);
    } catch (error) {
      console.error("Error updating stock item:", error);
      res.status(500).json({ message: "Failed to update stock item" });
    }
  });

  // Employees routes
  app.get('/api/employees', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const employees = await storage.getEmployees(userId);
      res.json(employees);
    } catch (error) {
      console.error("Error fetching employees:", error);
      res.status(500).json({ message: "Failed to fetch employees" });
    }
  });

  app.post('/api/employees', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const employeeData = insertEmployeeSchema.parse({ ...req.body, userId });
      const employee = await storage.createEmployee(employeeData);
      res.status(201).json(employee);
    } catch (error) {
      console.error("Error creating employee:", error);
      res.status(500).json({ message: "Failed to create employee" });
    }
  });

  // Attendance routes
  app.get('/api/attendance', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const { date } = req.query as { date?: string };
      const attendance = await storage.getAttendance(userId, date);
      res.json(attendance);
    } catch (error) {
      console.error("Error fetching attendance:", error);
      res.status(500).json({ message: "Failed to fetch attendance" });
    }
  });

  app.post('/api/attendance', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const attendanceData = insertAttendanceSchema.parse({ ...req.body, userId });
      const attendance = await storage.markAttendance(attendanceData);
      res.status(201).json(attendance);
    } catch (error) {
      console.error("Error marking attendance:", error);
      res.status(500).json({ message: "Failed to mark attendance" });
    }
  });

  // Payments routes
  app.get('/api/payments', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const payments = await storage.getPayments(userId);
      res.json(payments);
    } catch (error) {
      console.error("Error fetching payments:", error);
      res.status(500).json({ message: "Failed to fetch payments" });
    }
  });

  app.post('/api/payments', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const paymentData = insertPaymentSchema.parse({ ...req.body, userId });
      const payment = await storage.createPayment(paymentData);
      res.status(201).json(payment);
    } catch (error) {
      console.error("Error creating payment:", error);
      res.status(500).json({ message: "Failed to create payment" });
    }
  });

  // Invoices routes
  app.get('/api/invoices', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const invoices = await storage.getInvoices(userId);
      res.json(invoices);
    } catch (error) {
      console.error("Error fetching invoices:", error);
      res.status(500).json({ message: "Failed to fetch invoices" });
    }
  });

  app.post('/api/invoices', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const invoiceData = insertInvoiceSchema.parse({ ...req.body, userId });
      const invoice = await storage.createInvoice(invoiceData);
      
      // Automatically create ledger entry for the invoice
      const isSalesInvoice = !invoice.invoiceType || invoice.invoiceType === 'sales_invoice';
      const ledgerEntry = {
        userId,
        partyName: invoice.buyerName,
        partyType: isSalesInvoice ? "buyer" : "supplier", 
        entryType: isSalesInvoice ? "debit" : "credit",
        amount: invoice.totalAmount,
        description: `${isSalesInvoice ? 'Sales' : 'Purchase'} Invoice ${invoice.invoiceNumber} - ${invoice.items ? (typeof invoice.items === 'string' ? JSON.parse(invoice.items) : invoice.items).map((item: any) => item.description).join(', ') : 'Invoice amount'}`,
        reference: invoice.invoiceNumber,
        entryDate: invoice.invoiceDate,
        balance: "0" // Will be calculated by the backend
      };
      
      await storage.createLedgerEntry(ledgerEntry);
      
      res.status(201).json(invoice);
    } catch (error) {
      console.error("Error creating invoice:", error);
      res.status(500).json({ message: "Failed to create invoice" });
    }
  });

  app.put('/api/invoices/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const { id } = req.params;
      
      // Get the current invoice to check for status changes
      const currentInvoice = await storage.getInvoice(id, userId);
      if (!currentInvoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      
      const updateData = req.body;
      const updatedInvoice = await storage.updateInvoice(id, updateData, userId);
      
      // If invoice status changed to "paid", create a payment ledger entry
      if (currentInvoice.status !== "paid" && updateData.status === "paid") {
        const isSalesInvoice = !currentInvoice.invoiceType || currentInvoice.invoiceType === 'sales_invoice';
        const paymentEntry = {
          userId,
          partyName: currentInvoice.buyerName,
          partyType: isSalesInvoice ? "buyer" : "supplier",
          entryType: isSalesInvoice ? "credit" : "debit", // Opposite of invoice entry
          amount: currentInvoice.totalAmount,
          description: `Payment ${isSalesInvoice ? 'received for' : 'made for'} Invoice ${currentInvoice.invoiceNumber}`,
          reference: currentInvoice.invoiceNumber,
          entryDate: new Date().toISOString().split('T')[0],
          balance: "0" // Will be calculated by the backend
        };
        
        await storage.createLedgerEntry(paymentEntry);
      }
      
      res.json(updatedInvoice);
    } catch (error) {
      console.error("Error updating invoice:", error);
      res.status(500).json({ message: "Failed to update invoice" });
    }
  });

  app.delete('/api/invoices/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const { id } = req.params;
      
      // Get the invoice to be deleted for ledger cleanup
      const invoiceToDelete = await storage.getInvoice(id, userId);
      if (!invoiceToDelete) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      
      const success = await storage.deleteInvoice(id, userId);
      if (!success) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      
      // Remove related ledger entries for this invoice
      // Note: This would require adding a method to delete ledger entries by reference
      // For now, we'll leave the ledger entries as they provide audit trail
      
      res.json({ message: "Invoice deleted successfully" });
    } catch (error) {
      console.error("Error deleting invoice:", error);
      res.status(500).json({ message: "Failed to delete invoice" });
    }
  });

  // Customer routes
  app.get('/api/customers', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const customers = await storage.getCustomers(userId);
      res.json(customers);
    } catch (error) {
      console.error("Error fetching customers:", error);
      res.status(500).json({ message: "Failed to fetch customers" });
    }
  });

  app.get('/api/customers/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const customer = await storage.getCustomer(req.params.id, userId);
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }
      res.json(customer);
    } catch (error) {
      console.error("Error fetching customer:", error);
      res.status(500).json({ message: "Failed to fetch customer" });
    }
  });

  app.post('/api/customers', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      console.log("Creating customer with data:", req.body);
      console.log("User ID:", userId);
      const customerData = insertCustomerSchema.parse({ ...req.body, userId });
      const customer = await storage.createCustomer(customerData);
      res.status(201).json(customer);
    } catch (error) {
      console.error("Error creating customer:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ 
          message: "Validation error", 
          details: error.errors 
        });
      }
      res.status(500).json({ 
        message: "Failed to create customer",
        error: error.message 
      });
    }
  });

  app.put('/api/customers/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const customerData = req.body;
      const customer = await storage.updateCustomer(req.params.id, customerData, userId);
      res.json(customer);
    } catch (error) {
      console.error("Error updating customer:", error);
      res.status(500).json({ message: "Failed to update customer" });
    }
  });

  app.delete('/api/customers/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const success = await storage.deleteCustomer(req.params.id, userId);
      if (!success) {
        return res.status(404).json({ message: "Customer not found" });
      }
      res.json({ message: "Customer deleted successfully" });
    } catch (error) {
      console.error("Error deleting customer:", error);
      res.status(500).json({ message: "Failed to delete customer" });
    }
  });

  // Supplier routes
  app.get('/api/suppliers', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const suppliers = await storage.getSuppliers(userId);
      res.json(suppliers);
    } catch (error) {
      console.error("Error fetching suppliers:", error);
      res.status(500).json({ message: "Failed to fetch suppliers" });
    }
  });

  app.get('/api/suppliers/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const supplier = await storage.getSupplier(req.params.id, userId);
      if (!supplier) {
        return res.status(404).json({ message: "Supplier not found" });
      }
      res.json(supplier);
    } catch (error) {
      console.error("Error fetching supplier:", error);
      res.status(500).json({ message: "Failed to fetch supplier" });
    }
  });

  app.post('/api/suppliers', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const supplierData = insertSupplierSchema.parse({ ...req.body, userId });
      const supplier = await storage.createSupplier(supplierData);
      res.status(201).json(supplier);
    } catch (error) {
      console.error("Error creating supplier:", error);
      res.status(500).json({ message: "Failed to create supplier" });
    }
  });

  app.put('/api/suppliers/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const supplierData = req.body;
      const supplier = await storage.updateSupplier(req.params.id, supplierData, userId);
      res.json(supplier);
    } catch (error) {
      console.error("Error updating supplier:", error);
      res.status(500).json({ message: "Failed to update supplier" });
    }
  });

  app.delete('/api/suppliers/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const success = await storage.deleteSupplier(req.params.id, userId);
      if (!success) {
        return res.status(404).json({ message: "Supplier not found" });
      }
      res.json({ message: "Supplier deleted successfully" });
    } catch (error) {
      console.error("Error deleting supplier:", error);
      res.status(500).json({ message: "Failed to delete supplier" });
    }
  });

  // Ledger routes
  app.get('/api/ledger', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const { partyName } = req.query as { partyName?: string };
      const ledgerEntries = await storage.getLedgerEntries(userId, partyName);
      res.json(ledgerEntries);
    } catch (error) {
      console.error("Error fetching ledger entries:", error);
      res.status(500).json({ message: "Failed to fetch ledger entries" });
    }
  });

  app.post('/api/ledger', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const ledgerData = insertLedgerSchema.parse({ ...req.body, userId });
      const entry = await storage.createLedgerEntry(ledgerData);
      res.status(201).json(entry);
    } catch (error) {
      console.error("Error creating ledger entry:", error);
      res.status(500).json({ message: "Failed to create ledger entry" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
