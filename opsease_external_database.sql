-- OpsEase Manufacturing Operations Management System
-- Database Schema for External PostgreSQL Database
-- Compatible with existing 'postgres' database and 'maketrack' user

-- Note: This script is designed to work with an external database
-- where the database 'postgres' and user 'maketrack' already exist

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop tables if they exist (for clean setup)
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS ledger CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS attendance CASCADE;
DROP TABLE IF EXISTS stock_transactions CASCADE;
DROP TABLE IF EXISTS stock CASCADE;
DROP TABLE IF EXISTS invoices CASCADE;
DROP TABLE IF EXISTS production_plans CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS employees CASCADE;
DROP TABLE IF EXISTS expenses CASCADE;
DROP TABLE IF EXISTS suppliers CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Users table
CREATE TABLE users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Sessions table
CREATE TABLE sessions (
    sid VARCHAR NOT NULL PRIMARY KEY,
    sess JSON NOT NULL,
    expire TIMESTAMP(6) NOT NULL
);

-- Customers table
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    customer_code TEXT NOT NULL,
    name TEXT NOT NULL,
    contact_person TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Suppliers table
CREATE TABLE suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    supplier_code TEXT NOT NULL,
    name TEXT NOT NULL,
    contact_person TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Orders table
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    order_number TEXT NOT NULL,
    product_name TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    order_date DATE NOT NULL,
    delivery_date DATE,
    status TEXT NOT NULL DEFAULT 'planning' CHECK (status IN ('planning', 'in_progress', 'completed', 'delayed', 'cancelled')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Employees table
CREATE TABLE employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    employee_id TEXT NOT NULL,
    department TEXT NOT NULL,
    position TEXT NOT NULL,
    employee_type TEXT NOT NULL CHECK (employee_type IN ('full_time', 'part_time', 'contract')),
    salary_type TEXT NOT NULL CHECK (salary_type IN ('monthly', 'daily', 'hourly')),
    rate DECIMAL(10,2) NOT NULL,
    join_date DATE NOT NULL,
    phone TEXT,
    address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Production Plans table
CREATE TABLE production_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    stage_name TEXT NOT NULL,
    planned_start_date DATE NOT NULL,
    planned_end_date DATE NOT NULL,
    actual_start_date DATE,
    actual_end_date DATE,
    assigned_team TEXT,
    target_quantity INTEGER NOT NULL,
    completed_quantity INTEGER DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'delayed')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Expenses table
CREATE TABLE expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    category TEXT NOT NULL,
    description TEXT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    payment_method TEXT NOT NULL,
    receipt_number TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Stock table
CREATE TABLE stock (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    item_name TEXT NOT NULL,
    item_code TEXT NOT NULL,
    category TEXT NOT NULL,
    current_quantity INTEGER NOT NULL DEFAULT 0,
    unit TEXT NOT NULL,
    reorder_level INTEGER NOT NULL DEFAULT 10,
    unit_cost DECIMAL(10,2),
    supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
    location TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Stock Transactions table
CREATE TABLE stock_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    stock_id UUID NOT NULL REFERENCES stock(id) ON DELETE CASCADE,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('in', 'out', 'adjustment')),
    quantity INTEGER NOT NULL,
    unit_cost DECIMAL(10,2),
    total_cost DECIMAL(10,2),
    reference_number TEXT,
    notes TEXT,
    transaction_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Attendance table
CREATE TABLE attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    check_in TIMESTAMP WITH TIME ZONE,
    check_out TIMESTAMP WITH TIME ZONE,
    status TEXT NOT NULL DEFAULT 'present' CHECK (status IN ('present', 'absent', 'half_day', 'late')),
    work_hours TEXT DEFAULT '0',
    overtime TEXT DEFAULT '0',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(employee_id, date)
);

-- Payments table
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    payment_period TEXT NOT NULL,
    basic_amount DECIMAL(10,2) NOT NULL,
    overtime_amount DECIMAL(10,2) DEFAULT 0,
    bonus DECIMAL(10,2) DEFAULT 0,
    deductions DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(10,2) NOT NULL,
    payment_date DATE NOT NULL,
    payment_method TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Invoices table
CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    invoice_number TEXT NOT NULL,
    invoice_date DATE NOT NULL,
    due_date DATE NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL,
    tax_rate DECIMAL(5,2) DEFAULT 0,
    tax_amount DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(10,2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
    items JSONB NOT NULL,
    customer_name TEXT,
    customer_phone TEXT,
    customer_email TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Ledger table
CREATE TABLE ledger (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    party_name TEXT NOT NULL,
    party_type TEXT NOT NULL CHECK (party_type IN ('customer', 'supplier')),
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('debit', 'credit')),
    amount DECIMAL(10,2) NOT NULL,
    description TEXT NOT NULL,
    reference_number TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_customer_id ON orders(customer_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_order_date ON orders(order_date);

CREATE INDEX idx_employees_user_id ON employees(user_id);
CREATE INDEX idx_employees_employee_id ON employees(employee_id);
CREATE INDEX idx_employees_department ON employees(department);

CREATE INDEX idx_attendance_user_id ON attendance(user_id);
CREATE INDEX idx_attendance_employee_id ON attendance(employee_id);
CREATE INDEX idx_attendance_date ON attendance(date);

CREATE INDEX idx_expenses_user_id ON expenses(user_id);
CREATE INDEX idx_expenses_date ON expenses(date);
CREATE INDEX idx_expenses_category ON expenses(category);

CREATE INDEX idx_stock_user_id ON stock(user_id);
CREATE INDEX idx_stock_item_code ON stock(item_code);
CREATE INDEX idx_stock_category ON stock(category);

CREATE INDEX idx_customers_user_id ON customers(user_id);
CREATE INDEX idx_customers_customer_code ON customers(customer_code);

CREATE INDEX idx_suppliers_user_id ON suppliers(user_id);
CREATE INDEX idx_suppliers_supplier_code ON suppliers(supplier_code);

CREATE INDEX idx_invoices_user_id ON invoices(user_id);
CREATE INDEX idx_invoices_customer_id ON invoices(customer_id);
CREATE INDEX idx_invoices_status ON invoices(status);

CREATE INDEX idx_ledger_user_id ON ledger(user_id);
CREATE INDEX idx_ledger_party_name ON ledger(party_name);
CREATE INDEX idx_ledger_date ON ledger(date);

-- Insert sample data

-- Insert admin user (password: admin123)
INSERT INTO users (id, username, password) VALUES 
('admin-user', 'admin', '$2b$10$8K4XzJK8LZjqzGqV3K6JZ.XJVX9Qd8Y2gH4Nh.GsLz2sJ5QG7Nk6O');

-- Insert sample customers
INSERT INTO customers (user_id, customer_code, name, contact_person, phone, email, address) VALUES
('admin-user', 'CUST001', 'Global Fashion Ltd', 'John Smith', '+1-555-0123', 'john@globalfashion.com', '123 Fashion Street, New York, NY 10001'),
('admin-user', 'CUST002', 'European Garments Co', 'Maria Garcia', '+34-91-555-0456', 'maria@eurgarments.es', 'Calle de la Moda 45, 28001 Madrid, Spain'),
('admin-user', 'CUST003', 'Asian Textiles Inc', 'Hiroshi Tanaka', '+81-3-5555-0789', 'tanaka@asiantextiles.jp', '2-3-4 Shibuya, Tokyo 150-0002, Japan');

-- Insert sample suppliers
INSERT INTO suppliers (user_id, supplier_code, name, contact_person, phone, email, address) VALUES
('admin-user', 'SUP001', 'Cotton Mills Ltd', 'Robert Johnson', '+91-22-5555-1234', 'robert@cottonmills.in', 'Industrial Area Phase 1, Mumbai 400001'),
('admin-user', 'SUP002', 'Fabric Wholesalers', 'Priya Sharma', '+91-11-5555-5678', 'priya@fabricwholesale.in', 'Textile Market, Delhi 110006'),
('admin-user', 'SUP003', 'Thread & Button Co', 'Ahmed Ali', '+91-80-5555-9012', 'ahmed@threadbutton.in', 'Garment District, Bangalore 560001');

-- Insert sample employees
INSERT INTO employees (user_id, name, employee_id, department, position, employee_type, salary_type, rate, join_date, phone, address) VALUES
('admin-user', 'Rajesh Kumar', 'EMP001', 'production', 'Production Manager', 'full_time', 'monthly', 45000.00, '2023-01-15', '+91-9876543210', 'Sector 15, Noida'),
('admin-user', 'Priya Singh', 'EMP002', 'quality', 'Quality Inspector', 'full_time', 'monthly', 32000.00, '2023-02-01', '+91-9876543211', 'Lajpat Nagar, Delhi'),
('admin-user', 'Mohammed Hassan', 'EMP003', 'cutting', 'Cutting Operator', 'full_time', 'daily', 800.00, '2023-03-10', '+91-9876543212', 'Old City, Hyderabad'),
('admin-user', 'Sunita Devi', 'EMP004', 'sewing', 'Sewing Operator', 'full_time', 'daily', 750.00, '2023-04-05', '+91-9876543213', 'Sarita Vihar, Delhi'),
('admin-user', 'Vikram Yadav', 'EMP005', 'finishing', 'Finishing Specialist', 'full_time', 'hourly', 150.00, '2023-05-20', '+91-9876543214', 'Gurgaon, Haryana');

-- Insert sample orders
INSERT INTO orders (user_id, customer_id, order_number, product_name, quantity, unit_price, total_amount, order_date, delivery_date, status, notes) VALUES
('admin-user', (SELECT id FROM customers WHERE customer_code = 'CUST001'), 'ORD001', 'Cotton T-Shirts', 500, 12.50, 6250.00, '2025-01-15', '2025-02-15', 'in_progress', 'Rush order for spring collection'),
('admin-user', (SELECT id FROM customers WHERE customer_code = 'CUST002'), 'ORD002', 'Denim Jeans', 300, 25.00, 7500.00, '2025-01-20', '2025-03-01', 'planning', 'Premium quality denim required'),
('admin-user', (SELECT id FROM customers WHERE customer_code = 'CUST003'), 'ORD003', 'Summer Dresses', 200, 18.75, 3750.00, '2025-02-01', '2025-03-15', 'completed', 'Delivered ahead of schedule');

-- Insert sample stock items
INSERT INTO stock (user_id, item_name, item_code, category, current_quantity, unit, reorder_level, unit_cost, supplier_id, location, notes) VALUES
('admin-user', 'Cotton Fabric - White', 'FAB001', 'fabric', 850, 'meters', 100, 25.00, (SELECT id FROM suppliers WHERE supplier_code = 'SUP001'), 'Warehouse A-1', 'Premium quality cotton'),
('admin-user', 'Denim Fabric - Blue', 'FAB002', 'fabric', 450, 'meters', 50, 45.00, (SELECT id FROM suppliers WHERE supplier_code = 'SUP001'), 'Warehouse A-2', 'Heavy weight denim'),
('admin-user', 'Polyester Thread - Black', 'THR001', 'thread', 25, 'spools', 10, 8.50, (SELECT id FROM suppliers WHERE supplier_code = 'SUP003'), 'Storage B-1', 'High strength thread'),
('admin-user', 'Plastic Buttons - White', 'BTN001', 'accessories', 5000, 'pieces', 500, 0.15, (SELECT id FROM suppliers WHERE supplier_code = 'SUP003'), 'Storage B-2', '12mm diameter'),
('admin-user', 'Metal Zippers - 8 inch', 'ZIP001', 'accessories', 150, 'pieces', 25, 2.25, (SELECT id FROM suppliers WHERE supplier_code = 'SUP003'), 'Storage B-3', 'YKK brand zippers');

-- Insert sample expenses
INSERT INTO expenses (user_id, date, category, description, amount, payment_method, receipt_number, notes) VALUES
('admin-user', '2025-01-15', 'utilities', 'Electricity Bill - January', 12500.00, 'bank_transfer', 'EB001-2025', 'Factory power consumption'),
('admin-user', '2025-01-16', 'maintenance', 'Sewing Machine Repair', 3500.00, 'cash', 'MR001', 'Singer machine servicing'),
('admin-user', '2025-01-17', 'transport', 'Raw Material Transportation', 2800.00, 'cash', 'TR001', 'Cotton fabric delivery'),
('admin-user', '2025-01-18', 'office', 'Office Supplies Purchase', 1250.00, 'card', 'OS001', 'Stationery and printing'),
('admin-user', '2025-01-19', 'utilities', 'Internet & Phone Bill', 1800.00, 'bank_transfer', 'IP001-2025', 'Monthly communication expenses');

-- Insert sample attendance records
INSERT INTO attendance (user_id, employee_id, date, check_in, check_out, status, work_hours, overtime, notes) VALUES
('admin-user', (SELECT id FROM employees WHERE employee_id = 'EMP001'), '2025-01-15', '2025-01-15 09:00:00+05:30', '2025-01-15 18:30:00+05:30', 'present', '9.5', '1.5', 'Worked overtime on rush order'),
('admin-user', (SELECT id FROM employees WHERE employee_id = 'EMP002'), '2025-01-15', '2025-01-15 09:15:00+05:30', '2025-01-15 18:00:00+05:30', 'late', '8.75', '0', '15 minutes late'),
('admin-user', (SELECT id FROM employees WHERE employee_id = 'EMP003'), '2025-01-15', '2025-01-15 08:30:00+05:30', '2025-01-15 17:30:00+05:30', 'present', '9', '0', 'Regular shift'),
('admin-user', (SELECT id FROM employees WHERE employee_id = 'EMP004'), '2025-01-15', NULL, NULL, 'absent', '0', '0', 'Sick leave'),
('admin-user', (SELECT id FROM employees WHERE employee_id = 'EMP005'), '2025-01-15', '2025-01-15 10:00:00+05:30', '2025-01-15 14:00:00+05:30', 'half_day', '4', '0', 'Half day - personal work');

-- Insert sample invoices
INSERT INTO invoices (user_id, customer_id, invoice_number, invoice_date, due_date, subtotal, tax_rate, tax_amount, total_amount, status, items, customer_name, customer_phone, customer_email, notes) VALUES
('admin-user', (SELECT id FROM customers WHERE customer_code = 'CUST001'), 'INV001', '2025-01-20', '2025-02-19', 6250.00, 18.00, 1125.00, 7375.00, 'sent', '[{"description":"Cotton T-Shirts","quantity":500,"rate":12.50,"amount":6250.00}]', 'Global Fashion Ltd', '+1-555-0123', 'john@globalfashion.com', 'Payment terms: 30 days'),
('admin-user', (SELECT id FROM customers WHERE customer_code = 'CUST003'), 'INV002', '2025-02-01', '2025-03-03', 3750.00, 18.00, 675.00, 4425.00, 'paid', '[{"description":"Summer Dresses","quantity":200,"rate":18.75,"amount":3750.00}]', 'Asian Textiles Inc', '+81-3-5555-0789', 'tanaka@asiantextiles.jp', 'Paid in advance');

-- Insert sample production plans
INSERT INTO production_plans (user_id, order_id, stage_name, planned_start_date, planned_end_date, actual_start_date, assigned_team, target_quantity, completed_quantity, status, notes) VALUES
('admin-user', (SELECT id FROM orders WHERE order_number = 'ORD001'), 'Cutting', '2025-01-16', '2025-01-18', '2025-01-16', 'Cutting Team A', 500, 350, 'in_progress', 'On schedule'),
('admin-user', (SELECT id FROM orders WHERE order_number = 'ORD001'), 'Sewing', '2025-01-19', '2025-01-25', NULL, 'Sewing Team B', 500, 0, 'pending', 'Waiting for cutting completion'),
('admin-user', (SELECT id FROM orders WHERE order_number = 'ORD003'), 'Cutting', '2025-02-02', '2025-02-04', '2025-02-02', 'Cutting Team A', 200, 200, 'completed', 'Completed ahead of time'),
('admin-user', (SELECT id FROM orders WHERE order_number = 'ORD003'), 'Sewing', '2025-02-05', '2025-02-10', '2025-02-05', 'Sewing Team B', 200, 200, 'completed', 'High quality work'),
('admin-user', (SELECT id FROM orders WHERE order_number = 'ORD003'), 'Finishing', '2025-02-11', '2025-02-13', '2025-02-11', 'Finishing Team', 200, 200, 'completed', 'Ready for shipment');

-- Insert sample ledger entries
INSERT INTO ledger (user_id, date, party_name, party_type, transaction_type, amount, description, reference_number, notes) VALUES
('admin-user', '2025-01-20', 'Global Fashion Ltd', 'customer', 'debit', 7375.00, 'Invoice INV001 - Cotton T-Shirts', 'INV001', 'Payment due in 30 days'),
('admin-user', '2025-02-01', 'Asian Textiles Inc', 'customer', 'debit', 4425.00, 'Invoice INV002 - Summer Dresses', 'INV002', 'Advance payment received'),
('admin-user', '2025-02-01', 'Asian Textiles Inc', 'customer', 'credit', 4425.00, 'Payment received for INV002', 'PAY001', 'Full payment'),
('admin-user', '2025-01-15', 'Cotton Mills Ltd', 'supplier', 'credit', 21250.00, 'Cotton fabric purchase', 'PO001', 'Payment pending'),
('admin-user', '2025-01-25', 'Cotton Mills Ltd', 'supplier', 'debit', 21250.00, 'Payment made for cotton fabric', 'PAY002', 'Paid via bank transfer');

-- Create views for common queries

-- Active orders view
CREATE OR REPLACE VIEW active_orders AS
SELECT 
    o.*,
    c.name as customer_name,
    c.customer_code
FROM orders o
LEFT JOIN customers c ON o.customer_id = c.id
WHERE o.status IN ('planning', 'in_progress');

-- Low stock items view
CREATE OR REPLACE VIEW low_stock_items AS
SELECT 
    s.*,
    sup.name as supplier_name
FROM stock s
LEFT JOIN suppliers sup ON s.supplier_id = sup.id
WHERE s.current_quantity <= s.reorder_level;

-- Employee attendance summary view
CREATE OR REPLACE VIEW attendance_summary AS
SELECT 
    e.name,
    e.employee_id,
    e.department,
    COUNT(CASE WHEN a.status = 'present' THEN 1 END) as present_days,
    COUNT(CASE WHEN a.status = 'absent' THEN 1 END) as absent_days,
    COUNT(CASE WHEN a.status = 'late' THEN 1 END) as late_days,
    COUNT(CASE WHEN a.status = 'half_day' THEN 1 END) as half_days
FROM employees e
LEFT JOIN attendance a ON e.id = a.employee_id
WHERE a.date >= date_trunc('month', CURRENT_DATE)
GROUP BY e.id, e.name, e.employee_id, e.department;

-- Grant permissions to the existing maketrack user
-- Note: These grants may fail if permissions already exist, which is fine
DO $$
BEGIN
    EXECUTE 'GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO maketrack';
    EXECUTE 'GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO maketrack';
    EXECUTE 'GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO maketrack';
EXCEPTION WHEN OTHERS THEN
    NULL; -- Ignore permission errors as user may already have access
END
$$;