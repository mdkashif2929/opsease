import {
  users,
  orders,
  productionPlans,
  expenses,
  stock,
  stockTransactions,
  employees,
  attendance,
  payments,
  invoices,
  customers,
  suppliers,
  ledger,
  type User,
  type UpsertUser,
  type Order,
  type InsertOrder,
  type ProductionPlan,
  type InsertProductionPlan,
  type Expense,
  type InsertExpense,
  type Stock,
  type InsertStock,
  type Employee,
  type InsertEmployee,
  type Attendance,
  type InsertAttendance,
  type Payment,
  type InsertPayment,
  type Invoice,
  type InsertInvoice,
  type Customer,
  type InsertCustomer,
  type Supplier,
  type InsertSupplier,
  type Ledger,
  type InsertLedger,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, gte, lte, count, sum, sql } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: UpsertUser): Promise<User>;
  upsertUser(user: UpsertUser): Promise<User>;

  // Orders
  getOrders(userId: string): Promise<Order[]>;
  getOrder(id: string, userId: string): Promise<Order | undefined>;
  createOrder(order: InsertOrder): Promise<Order>;
  updateOrder(id: string, order: Partial<InsertOrder>, userId: string): Promise<Order>;
  deleteOrder(id: string, userId: string): Promise<boolean>;

  // Production Plans
  getProductionPlans(userId: string): Promise<ProductionPlan[]>;
  getProductionPlansByOrder(orderId: string, userId: string): Promise<ProductionPlan[]>;
  createProductionPlan(plan: InsertProductionPlan): Promise<ProductionPlan>;
  updateProductionPlan(id: string, plan: Partial<InsertProductionPlan>, userId: string): Promise<ProductionPlan>;

  // Expenses
  getExpenses(userId: string, startDate?: string, endDate?: string): Promise<Expense[]>;
  createExpense(expense: InsertExpense): Promise<Expense>;
  updateExpense(id: string, expense: Partial<InsertExpense>, userId: string): Promise<Expense>;
  deleteExpense(id: string, userId: string): Promise<boolean>;

  // Stock
  getStock(userId: string): Promise<Stock[]>;
  getStockItem(id: string, userId: string): Promise<Stock | undefined>;
  createStockItem(stock: InsertStock): Promise<Stock>;
  updateStockItem(id: string, stock: Partial<InsertStock>, userId: string): Promise<Stock>;
  getLowStockItems(userId: string): Promise<Stock[]>;

  // Employees
  getEmployees(userId: string): Promise<Employee[]>;
  getEmployee(id: string, userId: string): Promise<Employee | undefined>;
  createEmployee(employee: InsertEmployee): Promise<Employee>;
  updateEmployee(id: string, employee: Partial<InsertEmployee>, userId: string): Promise<Employee>;

  // Attendance
  getAttendance(userId: string, date?: string): Promise<(Attendance & { employee: Employee })[]>;
  markAttendance(attendance: InsertAttendance): Promise<Attendance>;
  updateAttendance(id: string, attendance: Partial<InsertAttendance>, userId: string): Promise<Attendance>;

  // Payments
  getPayments(userId: string): Promise<(Payment & { employee: Employee })[]>;
  createPayment(payment: InsertPayment): Promise<Payment>;
  updatePayment(id: string, payment: Partial<InsertPayment>, userId: string): Promise<Payment>;

  // Invoices
  getInvoices(userId: string): Promise<Invoice[]>;
  getInvoice(id: string, userId: string): Promise<Invoice | undefined>;
  createInvoice(invoice: InsertInvoice): Promise<Invoice>;
  updateInvoice(id: string, invoice: Partial<InsertInvoice>, userId: string): Promise<Invoice>;
  deleteInvoice(id: string, userId: string): Promise<boolean>;

  // Customers
  getCustomers(userId: string): Promise<Customer[]>;
  getCustomer(id: string, userId: string): Promise<Customer | undefined>;
  getCustomerByCode(customerCode: string, userId: string): Promise<Customer | undefined>;
  createCustomer(customer: InsertCustomer): Promise<Customer>;
  updateCustomer(id: string, customer: Partial<InsertCustomer>, userId: string): Promise<Customer>;
  deleteCustomer(id: string, userId: string): Promise<boolean>;

  // Suppliers
  getSuppliers(userId: string): Promise<Supplier[]>;
  getSupplier(id: string, userId: string): Promise<Supplier | undefined>;
  getSupplierByCode(supplierCode: string, userId: string): Promise<Supplier | undefined>;
  createSupplier(supplier: InsertSupplier): Promise<Supplier>;
  updateSupplier(id: string, supplier: Partial<InsertSupplier>, userId: string): Promise<Supplier>;
  deleteSupplier(id: string, userId: string): Promise<boolean>;

  // Ledger
  getLedgerEntries(userId: string, partyName?: string): Promise<Ledger[]>;
  createLedgerEntry(entry: InsertLedger): Promise<Ledger>;

  // Dashboard stats
  getDashboardStats(userId: string): Promise<{
    activeOrders: number;
    todayExpenses: number;
    lowStockCount: number;
    presentEmployeesToday: number;
    totalEmployees: number;
  }>;
}

export class DatabaseStorage implements IStorage {
  // User operations - mandatory for Replit Auth
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(userData: UpsertUser): Promise<User> {
    const [user] = await db.insert(users).values(userData).returning();
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Orders
  async getOrders(userId: string): Promise<Order[]> {
    return await db
      .select()
      .from(orders)
      .where(eq(orders.userId, userId))
      .orderBy(desc(orders.createdAt));
  }

  async getOrder(id: string, userId: string): Promise<Order | undefined> {
    const [order] = await db
      .select()
      .from(orders)
      .where(and(eq(orders.id, id), eq(orders.userId, userId)));
    return order;
  }

  async createOrder(order: InsertOrder): Promise<Order> {
    const [newOrder] = await db.insert(orders).values(order).returning();
    return newOrder;
  }

  async updateOrder(id: string, order: Partial<InsertOrder>, userId: string): Promise<Order> {
    const [updatedOrder] = await db
      .update(orders)
      .set({ ...order, updatedAt: new Date() })
      .where(and(eq(orders.id, id), eq(orders.userId, userId)))
      .returning();
    return updatedOrder;
  }

  async deleteOrder(id: string, userId: string): Promise<boolean> {
    const result = await db
      .delete(orders)
      .where(and(eq(orders.id, id), eq(orders.userId, userId)));
    return (result.rowCount || 0) > 0;
  }

  // Production Plans
  async getProductionPlans(userId: string): Promise<ProductionPlan[]> {
    return await db
      .select()
      .from(productionPlans)
      .where(eq(productionPlans.userId, userId))
      .orderBy(desc(productionPlans.createdAt));
  }

  async getProductionPlansByOrder(orderId: string, userId: string): Promise<ProductionPlan[]> {
    return await db
      .select()
      .from(productionPlans)
      .where(and(eq(productionPlans.orderId, orderId), eq(productionPlans.userId, userId)));
  }

  async createProductionPlan(plan: InsertProductionPlan): Promise<ProductionPlan> {
    const [newPlan] = await db.insert(productionPlans).values(plan).returning();
    return newPlan;
  }

  async updateProductionPlan(id: string, plan: Partial<InsertProductionPlan>, userId: string): Promise<ProductionPlan> {
    const [updatedPlan] = await db
      .update(productionPlans)
      .set({ ...plan, updatedAt: new Date() })
      .where(and(eq(productionPlans.id, id), eq(productionPlans.userId, userId)))
      .returning();
    return updatedPlan;
  }

  // Expenses
  async getExpenses(userId: string, startDate?: string, endDate?: string): Promise<Expense[]> {
    let conditions = [eq(expenses.userId, userId)];
    
    if (startDate && endDate) {
      conditions.push(gte(expenses.expenseDate, startDate));
      conditions.push(lte(expenses.expenseDate, endDate));
    }
    
    return await db.select().from(expenses)
      .where(and(...conditions))
      .orderBy(desc(expenses.expenseDate));
  }

  async createExpense(expense: InsertExpense): Promise<Expense> {
    const [newExpense] = await db.insert(expenses).values(expense).returning();
    return newExpense;
  }

  async updateExpense(id: string, expense: Partial<InsertExpense>, userId: string): Promise<Expense> {
    const [updatedExpense] = await db
      .update(expenses)
      .set({ ...expense, updatedAt: new Date() })
      .where(and(eq(expenses.id, id), eq(expenses.userId, userId)))
      .returning();
    return updatedExpense;
  }

  async deleteExpense(id: string, userId: string): Promise<boolean> {
    const result = await db
      .delete(expenses)
      .where(and(eq(expenses.id, id), eq(expenses.userId, userId)));
    return (result.rowCount || 0) > 0;
  }

  // Stock
  async getStock(userId: string): Promise<Stock[]> {
    return await db
      .select()
      .from(stock)
      .where(eq(stock.userId, userId))
      .orderBy(stock.itemName);
  }

  async getStockItem(id: string, userId: string): Promise<Stock | undefined> {
    const [item] = await db
      .select()
      .from(stock)
      .where(and(eq(stock.id, id), eq(stock.userId, userId)));
    return item;
  }

  async createStockItem(stockItem: InsertStock): Promise<Stock> {
    const [newItem] = await db.insert(stock).values(stockItem).returning();
    return newItem;
  }

  async updateStockItem(id: string, stockItem: Partial<InsertStock>, userId: string): Promise<Stock> {
    const [updatedItem] = await db
      .update(stock)
      .set({ ...stockItem, lastUpdated: new Date() })
      .where(and(eq(stock.id, id), eq(stock.userId, userId)))
      .returning();
    return updatedItem;
  }

  async getLowStockItems(userId: string): Promise<Stock[]> {
    return await db
      .select()
      .from(stock)
      .where(
        and(
          eq(stock.userId, userId),
          sql`${stock.currentQuantity} <= ${stock.reorderLevel}`
        )
      );
  }

  // Employees
  async getEmployees(userId: string): Promise<Employee[]> {
    return await db
      .select()
      .from(employees)
      .where(and(eq(employees.userId, userId), eq(employees.isActive, true)))
      .orderBy(employees.name);
  }

  async getEmployee(id: string, userId: string): Promise<Employee | undefined> {
    const [employee] = await db
      .select()
      .from(employees)
      .where(and(eq(employees.id, id), eq(employees.userId, userId)));
    return employee;
  }

  async createEmployee(employee: InsertEmployee): Promise<Employee> {
    const [newEmployee] = await db.insert(employees).values(employee).returning();
    return newEmployee;
  }

  async updateEmployee(id: string, employee: Partial<InsertEmployee>, userId: string): Promise<Employee> {
    const [updatedEmployee] = await db
      .update(employees)
      .set({ ...employee, updatedAt: new Date() })
      .where(and(eq(employees.id, id), eq(employees.userId, userId)))
      .returning();
    return updatedEmployee;
  }

  // Attendance
  async getAttendance(userId: string, date?: string): Promise<(Attendance & { employee: Employee })[]> {
    let conditions = [eq(attendance.userId, userId)];
    
    if (date) {
      conditions.push(eq(attendance.date, date));
    }

    return await db
      .select({
        id: attendance.id,
        employeeId: attendance.employeeId,
        date: attendance.date,
        checkIn: attendance.checkIn,
        checkOut: attendance.checkOut,
        status: attendance.status,
        workHours: attendance.workHours,
        overtime: attendance.overtime,
        notes: attendance.notes,
        userId: attendance.userId,
        createdAt: attendance.createdAt,
        employee: employees,
      })
      .from(attendance)
      .innerJoin(employees, eq(attendance.employeeId, employees.id))
      .where(and(...conditions))
      .orderBy(desc(attendance.date), employees.name);
  }

  async markAttendance(attendanceRecord: InsertAttendance): Promise<Attendance> {
    const [newAttendance] = await db.insert(attendance).values(attendanceRecord).returning();
    return newAttendance;
  }

  async updateAttendance(id: string, attendanceRecord: Partial<InsertAttendance>, userId: string): Promise<Attendance> {
    const [updatedAttendance] = await db
      .update(attendance)
      .set(attendanceRecord)
      .where(and(eq(attendance.id, id), eq(attendance.userId, userId)))
      .returning();
    return updatedAttendance;
  }

  // Payments
  async getPayments(userId: string): Promise<(Payment & { employee: Employee })[]> {
    return await db
      .select({
        id: payments.id,
        employeeId: payments.employeeId,
        payPeriodStart: payments.payPeriodStart,
        payPeriodEnd: payments.payPeriodEnd,
        regularHours: payments.regularHours,
        overtimeHours: payments.overtimeHours,
        piecesCompleted: payments.piecesCompleted,
        grossAmount: payments.grossAmount,
        deductions: payments.deductions,
        netAmount: payments.netAmount,
        status: payments.status,
        paymentDate: payments.paymentDate,
        paymentMethod: payments.paymentMethod,
        notes: payments.notes,
        userId: payments.userId,
        createdAt: payments.createdAt,
        updatedAt: payments.updatedAt,
        employee: employees,
      })
      .from(payments)
      .innerJoin(employees, eq(payments.employeeId, employees.id))
      .where(eq(payments.userId, userId))
      .orderBy(desc(payments.createdAt));
  }

  async createPayment(payment: InsertPayment): Promise<Payment> {
    const [newPayment] = await db.insert(payments).values(payment).returning();
    return newPayment;
  }

  async updatePayment(id: string, payment: Partial<InsertPayment>, userId: string): Promise<Payment> {
    const [updatedPayment] = await db
      .update(payments)
      .set({ ...payment, updatedAt: new Date() })
      .where(and(eq(payments.id, id), eq(payments.userId, userId)))
      .returning();
    return updatedPayment;
  }

  // Invoices
  async getInvoices(userId: string): Promise<Invoice[]> {
    return await db
      .select()
      .from(invoices)
      .where(eq(invoices.userId, userId))
      .orderBy(desc(invoices.createdAt));
  }

  async getInvoice(id: string, userId: string): Promise<Invoice | undefined> {
    const [invoice] = await db
      .select()
      .from(invoices)
      .where(and(eq(invoices.id, id), eq(invoices.userId, userId)));
    return invoice;
  }

  async createInvoice(invoice: InsertInvoice): Promise<Invoice> {
    const [newInvoice] = await db.insert(invoices).values(invoice).returning();
    return newInvoice;
  }

  async updateInvoice(id: string, invoice: Partial<InsertInvoice>, userId: string): Promise<Invoice> {
    const [updatedInvoice] = await db
      .update(invoices)
      .set({ ...invoice, updatedAt: new Date() })
      .where(and(eq(invoices.id, id), eq(invoices.userId, userId)))
      .returning();
    return updatedInvoice;
  }

  async deleteInvoice(id: string, userId: string): Promise<boolean> {
    const result = await db
      .delete(invoices)
      .where(and(eq(invoices.id, id), eq(invoices.userId, userId)));
    return result.rowCount > 0;
  }

  // Customers
  async getCustomers(userId: string): Promise<Customer[]> {
    return await db.select().from(customers)
      .where(eq(customers.userId, userId))
      .orderBy(desc(customers.createdAt));
  }

  async getCustomer(id: string, userId: string): Promise<Customer | undefined> {
    const [customer] = await db.select().from(customers)
      .where(and(eq(customers.id, id), eq(customers.userId, userId)));
    return customer;
  }

  async getCustomerByCode(customerCode: string, userId: string): Promise<Customer | undefined> {
    const [customer] = await db.select().from(customers)
      .where(and(eq(customers.customerCode, customerCode), eq(customers.userId, userId)));
    return customer;
  }

  async createCustomer(customer: InsertCustomer): Promise<Customer> {
    const [newCustomer] = await db.insert(customers).values(customer).returning();
    return newCustomer;
  }

  async updateCustomer(id: string, customer: Partial<InsertCustomer>, userId: string): Promise<Customer> {
    const [updatedCustomer] = await db
      .update(customers)
      .set({ ...customer, updatedAt: new Date() })
      .where(and(eq(customers.id, id), eq(customers.userId, userId)))
      .returning();
    return updatedCustomer;
  }

  async deleteCustomer(id: string, userId: string): Promise<boolean> {
    const result = await db
      .delete(customers)
      .where(and(eq(customers.id, id), eq(customers.userId, userId)));
    return result.rowCount > 0;
  }

  // Suppliers
  async getSuppliers(userId: string): Promise<Supplier[]> {
    return await db.select().from(suppliers)
      .where(eq(suppliers.userId, userId))
      .orderBy(desc(suppliers.createdAt));
  }

  async getSupplier(id: string, userId: string): Promise<Supplier | undefined> {
    const [supplier] = await db.select().from(suppliers)
      .where(and(eq(suppliers.id, id), eq(suppliers.userId, userId)));
    return supplier;
  }

  async getSupplierByCode(supplierCode: string, userId: string): Promise<Supplier | undefined> {
    const [supplier] = await db.select().from(suppliers)
      .where(and(eq(suppliers.supplierCode, supplierCode), eq(suppliers.userId, userId)));
    return supplier;
  }

  async createSupplier(supplier: InsertSupplier): Promise<Supplier> {
    const [newSupplier] = await db.insert(suppliers).values(supplier).returning();
    return newSupplier;
  }

  async updateSupplier(id: string, supplier: Partial<InsertSupplier>, userId: string): Promise<Supplier> {
    const [updatedSupplier] = await db
      .update(suppliers)
      .set({ ...supplier, updatedAt: new Date() })
      .where(and(eq(suppliers.id, id), eq(suppliers.userId, userId)))
      .returning();
    return updatedSupplier;
  }

  async deleteSupplier(id: string, userId: string): Promise<boolean> {
    const result = await db
      .delete(suppliers)
      .where(and(eq(suppliers.id, id), eq(suppliers.userId, userId)));
    return result.rowCount > 0;
  }

  // Ledger
  async getLedgerEntries(userId: string, partyName?: string): Promise<Ledger[]> {
    let conditions = [eq(ledger.userId, userId)];
    
    if (partyName) {
      conditions.push(eq(ledger.partyName, partyName));
    }
    
    const entries = await db.select().from(ledger)
      .where(and(...conditions))
      .orderBy(ledger.entryDate, ledger.createdAt);

    // Calculate running balances for each party
    const partiesMap = new Map<string, { balance: number; entries: Ledger[] }>();
    
    // Group entries by party and calculate running balances
    for (const entry of entries) {
      if (!partiesMap.has(entry.partyName)) {
        partiesMap.set(entry.partyName, { balance: 0, entries: [] });
      }
      
      const partyData = partiesMap.get(entry.partyName)!;
      
      // Calculate running balance
      if (entry.entryType === "debit") {
        // For buyers: debit increases receivable (positive)
        // For suppliers: debit increases payable (positive)  
        partyData.balance += parseFloat(entry.amount);
      } else if (entry.entryType === "credit") {
        // For buyers: credit decreases receivable (payment received)
        // For suppliers: credit decreases payable (payment made)
        partyData.balance -= parseFloat(entry.amount);
      }
      
      // Create entry with updated balance
      const updatedEntry = {
        ...entry,
        balance: partyData.balance.toString()
      };
      
      partyData.entries.push(updatedEntry);
    }
    
    // Flatten all entries and sort by date descending
    const allEntries = Array.from(partiesMap.values())
      .flatMap(party => party.entries)
      .sort((a, b) => new Date(b.entryDate).getTime() - new Date(a.entryDate).getTime());
    
    return allEntries;
  }

  async createLedgerEntry(entry: InsertLedger): Promise<Ledger> {
    // Calculate running balance for this party
    const existingEntries = await db.select()
      .from(ledger)
      .where(and(
        eq(ledger.userId, entry.userId),
        eq(ledger.partyName, entry.partyName)
      ))
      .orderBy(desc(ledger.entryDate), desc(ledger.createdAt));

    // Calculate running balance based on party type and entry type
    let runningBalance = 0;
    
    for (const existingEntry of existingEntries) {
      if (existingEntry.entryType === "debit") {
        // For buyers: debit increases amount owed by buyer (positive for us)
        // For suppliers: debit increases amount we owe to supplier (negative balance)
        runningBalance += (entry.partyType === "buyer" ? 1 : -1) * parseFloat(existingEntry.amount);
      } else if (existingEntry.entryType === "credit") {
        // For buyers: credit reduces amount owed by buyer (payment received)
        // For suppliers: credit reduces amount we owe to supplier (payment made)
        runningBalance -= (entry.partyType === "buyer" ? 1 : -1) * parseFloat(existingEntry.amount);
      }
    }

    // Add the new entry to the balance calculation
    if (entry.entryType === "debit") {
      runningBalance += (entry.partyType === "buyer" ? 1 : -1) * parseFloat(entry.amount);
    } else if (entry.entryType === "credit") {
      runningBalance -= (entry.partyType === "buyer" ? 1 : -1) * parseFloat(entry.amount);
    }

    // Insert the new entry with calculated balance
    const [newEntry] = await db.insert(ledger).values({
      ...entry,
      balance: runningBalance.toString()
    }).returning();
    
    return newEntry;
  }

  // Dashboard stats
  async getDashboardStats(userId: string): Promise<{
    activeOrders: number;
    todayExpenses: number;
    lowStockCount: number;
    presentEmployeesToday: number;
    totalEmployees: number;
  }> {
    const today = new Date().toISOString().split('T')[0];
    
    // Get active orders count
    const [activeOrdersResult] = await db
      .select({ count: count() })
      .from(orders)
      .where(and(eq(orders.userId, userId), eq(orders.status, 'in_progress')));

    // Get today's expenses sum
    const [todayExpensesResult] = await db
      .select({ total: sum(expenses.amount) })
      .from(expenses)
      .where(and(eq(expenses.userId, userId), eq(expenses.expenseDate, today)));

    // Get low stock count
    const [lowStockResult] = await db
      .select({ count: count() })
      .from(stock)
      .where(
        and(
          eq(stock.userId, userId),
          sql`${stock.currentQuantity} <= ${stock.reorderLevel}`
        )
      );

    // Get today's attendance
    const [presentTodayResult] = await db
      .select({ count: count() })
      .from(attendance)
      .where(and(eq(attendance.userId, userId), eq(attendance.date, today), eq(attendance.status, 'present')));

    // Get total employees
    const [totalEmployeesResult] = await db
      .select({ count: count() })
      .from(employees)
      .where(and(eq(employees.userId, userId), eq(employees.isActive, true)));

    return {
      activeOrders: activeOrdersResult.count,
      todayExpenses: Number(todayExpensesResult.total || 0),
      lowStockCount: lowStockResult.count,
      presentEmployeesToday: presentTodayResult.count,
      totalEmployees: totalEmployeesResult.count,
    };
  }
}

export const storage = new DatabaseStorage();
