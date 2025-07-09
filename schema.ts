import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  index,
  serial,
  integer,
  decimal,
  boolean,
  date,
  uuid,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Session storage table - mandatory for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  username: varchar("username").unique(),
  password: varchar("password"),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role").default("user"),
  companyName: varchar("company_name"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Orders table
export const orders = pgTable("orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: varchar("order_id").notNull().unique(),
  orderType: varchar("order_type").notNull(), // sales_order, purchase_order
  customerId: uuid("customer_id").references(() => customers.id),
  supplierId: uuid("supplier_id").references(() => suppliers.id),
  partyName: varchar("party_name").notNull(), // customer or supplier name
  partyEmail: varchar("party_email"),
  partyPhone: varchar("party_phone"),
  products: jsonb("products").notNull(), // Array of {name, description, quantity, unitPrice}
  totalQuantity: integer("total_quantity").notNull(),
  totalValue: decimal("total_value", { precision: 12, scale: 2 }).notNull(),
  deliveryDate: date("delivery_date").notNull(),
  orderDate: date("order_date").notNull().defaultNow(),
  status: varchar("status").notNull().default("planning"), // planning, in_progress, completed, delayed, cancelled
  notes: text("notes"),
  attachments: jsonb("attachments"), // Array of file URLs
  userId: varchar("user_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Production planning table
export const productionPlans = pgTable("production_plans", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  stage: varchar("stage").notNull(), // cutting, stitching, quality_check, packaging
  targetQuantity: integer("target_quantity").notNull(),
  completedQuantity: integer("completed_quantity").default(0),
  assignedTeam: varchar("assigned_team"),
  startDate: date("start_date"),
  endDate: date("end_date"),
  status: varchar("status").default("pending"), // pending, in_progress, completed, delayed
  notes: text("notes"),
  userId: varchar("user_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Daily expenses table
export const expenses = pgTable("expenses", {
  id: uuid("id").primaryKey().defaultRandom(),
  category: varchar("category").notNull(), // raw_materials, wages, utilities, maintenance, transportation, other
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  description: text("description").notNull(),
  paidBy: varchar("paid_by"),
  paidTo: varchar("paid_to"),
  paymentMethod: varchar("payment_method"), // cash, bank_transfer, cheque
  expenseDate: date("expense_date").notNull(),
  receipt: varchar("receipt_url"),
  userId: varchar("user_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Stock management table
export const stock = pgTable("stock", {
  id: uuid("id").primaryKey().defaultRandom(),
  itemName: varchar("item_name").notNull(),
  category: varchar("category").notNull(), // raw_materials, finished_goods, accessories
  currentQuantity: integer("current_quantity").notNull().default(0),
  unit: varchar("unit").notNull(), // pieces, meters, kg, etc.
  reorderLevel: integer("reorder_level").default(10),
  unitCost: decimal("unit_cost", { precision: 8, scale: 2 }),
  supplier: varchar("supplier"),
  location: varchar("location"),
  lastUpdated: timestamp("last_updated").defaultNow(),
  userId: varchar("user_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Stock transactions table
export const stockTransactions = pgTable("stock_transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  stockId: uuid("stock_id").notNull().references(() => stock.id, { onDelete: "cascade" }),
  type: varchar("type").notNull(), // in, out
  quantity: integer("quantity").notNull(),
  reason: varchar("reason"), // purchase, production_use, sale, waste, adjustment
  reference: varchar("reference"), // order_id, expense_id, etc.
  notes: text("notes"),
  transactionDate: date("transaction_date").notNull(),
  userId: varchar("user_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Employee table
export const employees = pgTable("employees", {
  id: uuid("id").primaryKey().defaultRandom(),
  employeeId: varchar("employee_id").notNull().unique(),
  name: varchar("name").notNull(),
  email: varchar("email"),
  phone: varchar("phone"),
  department: varchar("department").notNull(), // cutting, stitching, quality_control, packaging, management
  position: varchar("position"),
  employeeType: varchar("employee_type").notNull(), // staff, worker
  paymentType: varchar("payment_type").notNull(), // daily_rate, piece_rate, monthly_salary
  rate: decimal("rate", { precision: 8, scale: 2 }).notNull(),
  joinDate: date("join_date").notNull(),
  isActive: boolean("is_active").default(true),
  userId: varchar("user_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Attendance table
export const attendance = pgTable("attendance", {
  id: uuid("id").primaryKey().defaultRandom(),
  employeeId: uuid("employee_id").notNull().references(() => employees.id, { onDelete: "cascade" }),
  date: date("date").notNull(),
  checkIn: timestamp("check_in"),
  checkOut: timestamp("check_out"),
  status: varchar("status").notNull(), // present, absent, half_day, late
  workHours: decimal("work_hours", { precision: 4, scale: 2 }).default("0"),
  overtime: decimal("overtime", { precision: 4, scale: 2 }).default("0"),
  notes: text("notes"),
  userId: varchar("user_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Worker payments table
export const payments = pgTable("payments", {
  id: uuid("id").primaryKey().defaultRandom(),
  employeeId: uuid("employee_id").notNull().references(() => employees.id, { onDelete: "cascade" }),
  payPeriodStart: date("pay_period_start").notNull(),
  payPeriodEnd: date("pay_period_end").notNull(),
  regularHours: decimal("regular_hours", { precision: 6, scale: 2 }).default("0"),
  overtimeHours: decimal("overtime_hours", { precision: 6, scale: 2 }).default("0"),
  piecesCompleted: integer("pieces_completed").default(0),
  grossAmount: decimal("gross_amount", { precision: 10, scale: 2 }).notNull(),
  deductions: decimal("deductions", { precision: 8, scale: 2 }).default("0"),
  netAmount: decimal("net_amount", { precision: 10, scale: 2 }).notNull(),
  status: varchar("status").default("pending"), // pending, paid
  paymentDate: date("payment_date"),
  paymentMethod: varchar("payment_method"), // cash, bank_transfer
  notes: text("notes"),
  userId: varchar("user_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Invoices table
export const invoices = pgTable("invoices", {
  id: uuid("id").primaryKey().defaultRandom(),
  invoiceNumber: varchar("invoice_number").notNull().unique(),
  invoiceType: varchar("invoice_type").default("sales_invoice"), // sales_invoice, purchase_invoice
  orderId: uuid("order_id").references(() => orders.id),
  customerId: uuid("customer_id").references(() => customers.id),
  supplierId: uuid("supplier_id").references(() => suppliers.id),
  buyerName: varchar("buyer_name").notNull(),
  buyerAddress: text("buyer_address"),
  buyerGst: varchar("buyer_gst"),
  buyerPhone: varchar("buyer_phone"),
  buyerEmail: varchar("buyer_email"),
  items: jsonb("items").notNull(), // Array of invoice line items
  subtotal: decimal("subtotal", { precision: 12, scale: 2 }).notNull(),
  taxRate: decimal("tax_rate", { precision: 5, scale: 2 }).default("0"),
  taxAmount: decimal("tax_amount", { precision: 10, scale: 2 }).default("0"),
  shippingCost: decimal("shipping_cost", { precision: 8, scale: 2 }).default("0"),
  discount: decimal("discount", { precision: 8, scale: 2 }).default("0"),
  totalAmount: decimal("total_amount", { precision: 12, scale: 2 }).notNull(),
  currency: varchar("currency").default("INR"),
  invoiceDate: date("invoice_date").notNull(),
  dueDate: date("due_date"),
  status: varchar("status").default("draft"), // draft, sent, paid, overdue
  pdfUrl: varchar("pdf_url"),
  userId: varchar("user_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Ledger table for buyers and suppliers
// Customer master data
export const customers = pgTable("customers", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: varchar("user_id").notNull(),
  customerCode: varchar("customer_code").notNull(), // Unique customer identifier
  companyName: varchar("company_name").notNull(),
  contactPerson: varchar("contact_person"),
  email: varchar("email"),
  phone: varchar("phone"),
  gstNumber: varchar("gst_number"),
  address: text("address"),
  city: varchar("city"),
  state: varchar("state"),
  country: varchar("country").default("India"),
  pincode: varchar("pincode"),
  paymentTerms: varchar("payment_terms").default("30"), // Days
  creditLimit: decimal("credit_limit", { precision: 12, scale: 2 }).default("0"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Supplier master data
export const suppliers = pgTable("suppliers", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: varchar("user_id").notNull(),
  supplierCode: varchar("supplier_code").notNull(), // Unique supplier identifier
  companyName: varchar("company_name").notNull(),
  contactPerson: varchar("contact_person"),
  email: varchar("email"),
  phone: varchar("phone"),
  gstNumber: varchar("gst_number"),
  address: text("address"),
  city: varchar("city"),
  state: varchar("state"),
  country: varchar("country").default("India"),
  pincode: varchar("pincode"),
  paymentTerms: varchar("payment_terms").default("30"), // Days
  category: varchar("category"), // Raw materials, Services, etc.
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const ledger = pgTable("ledger", {
  id: uuid("id").primaryKey().defaultRandom(),
  partyName: varchar("party_name").notNull(),
  partyType: varchar("party_type").notNull(), // buyer, supplier
  entryType: varchar("entry_type").notNull(), // debit, credit
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  description: text("description").notNull(),
  reference: varchar("reference"), // invoice_id, order_id, etc.
  entryDate: date("entry_date").notNull(),
  balance: decimal("balance", { precision: 12, scale: 2 }).notNull(),
  userId: varchar("user_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  orders: many(orders),
  productionPlans: many(productionPlans),
  expenses: many(expenses),
  stock: many(stock),
  employees: many(employees),
  attendance: many(attendance),
  payments: many(payments),
  invoices: many(invoices),
  ledger: many(ledger),
  customers: many(customers),
  suppliers: many(suppliers),
}));

export const customersRelations = relations(customers, ({ one }) => ({
  user: one(users, { fields: [customers.userId], references: [users.id] }),
}));

export const suppliersRelations = relations(suppliers, ({ one }) => ({
  user: one(users, { fields: [suppliers.userId], references: [users.id] }),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  user: one(users, { fields: [orders.userId], references: [users.id] }),
  customer: one(customers, { fields: [orders.customerId], references: [customers.id] }),
  supplier: one(suppliers, { fields: [orders.supplierId], references: [suppliers.id] }),
  productionPlans: many(productionPlans),
  invoices: many(invoices),
}));

export const employeesRelations = relations(employees, ({ one, many }) => ({
  user: one(users, { fields: [employees.userId], references: [users.id] }),
  attendance: many(attendance),
  payments: many(payments),
}));

export const stockRelations = relations(stock, ({ one, many }) => ({
  user: one(users, { fields: [stock.userId], references: [users.id] }),
  transactions: many(stockTransactions),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});

export const insertOrderSchema = createInsertSchema(orders).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
}).extend({
  orderType: z.enum(["sales_order", "purchase_order"]),
  customerId: z.string().uuid().optional().or(z.literal("")).transform(val => val === "" ? undefined : val),
  supplierId: z.string().uuid().optional().or(z.literal("")).transform(val => val === "" ? undefined : val),
});

export const insertProductionPlanSchema = createInsertSchema(productionPlans).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});

export const insertExpenseSchema = createInsertSchema(expenses).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});

export const insertStockSchema = createInsertSchema(stock).omit({ 
  id: true, 
  createdAt: true 
});

export const insertEmployeeSchema = createInsertSchema(employees).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});

export const insertAttendanceSchema = createInsertSchema(attendance).omit({ 
  id: true, 
  createdAt: true 
}).extend({
  checkIn: z.string().optional().nullable().transform(val => val ? new Date(val) : null),
  checkOut: z.string().optional().nullable().transform(val => val ? new Date(val) : null),
});

export const insertPaymentSchema = createInsertSchema(payments).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});

export const insertInvoiceSchema = createInsertSchema(invoices).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
}).extend({
  invoiceType: z.enum(["sales_invoice", "purchase_invoice"]),
  orderId: z.string().uuid().optional().or(z.literal("")).transform(val => val === "" ? undefined : val),
  customerId: z.string().uuid().optional().or(z.literal("")).transform(val => val === "" ? undefined : val),
  supplierId: z.string().uuid().optional().or(z.literal("")).transform(val => val === "" ? undefined : val),
});

export const insertLedgerSchema = createInsertSchema(ledger).omit({ 
  id: true, 
  createdAt: true 
});

export const insertCustomerSchema = createInsertSchema(customers).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});

export const insertSupplierSchema = createInsertSchema(suppliers).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof orders.$inferSelect;
export type InsertProductionPlan = z.infer<typeof insertProductionPlanSchema>;
export type ProductionPlan = typeof productionPlans.$inferSelect;
export type InsertExpense = z.infer<typeof insertExpenseSchema>;
export type Expense = typeof expenses.$inferSelect;
export type InsertStock = z.infer<typeof insertStockSchema>;
export type Stock = typeof stock.$inferSelect;
export type InsertEmployee = z.infer<typeof insertEmployeeSchema>;
export type Employee = typeof employees.$inferSelect;
export type InsertAttendance = z.infer<typeof insertAttendanceSchema>;
export type Attendance = typeof attendance.$inferSelect;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type Payment = typeof payments.$inferSelect;
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type Invoice = typeof invoices.$inferSelect;
export type InsertLedger = z.infer<typeof insertLedgerSchema>;
export type Ledger = typeof ledger.$inferSelect;
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type Customer = typeof customers.$inferSelect;
export type InsertSupplier = z.infer<typeof insertSupplierSchema>;
export type Supplier = typeof suppliers.$inferSelect;
