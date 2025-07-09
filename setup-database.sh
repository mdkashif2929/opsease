#!/bin/bash

# Database setup script for OpsEase
# This script sets up the PostgreSQL database with schema and sample data

set -e

echo "🗄️ Setting up OpsEase database..."

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Database credentials
DB_USER="opsease_user"
DB_PASSWORD="OpsEase2025!SecureDB"
DB_NAME="opsease"

# Check if PostgreSQL is running
if ! systemctl is-active --quiet postgresql; then
    echo -e "${RED}PostgreSQL is not running. Starting it...${NC}"
    systemctl start postgresql
fi

# Check if database exists
if sudo -u postgres psql -lqt | cut -d \| -f 1 | grep -qw $DB_NAME; then
    echo -e "${YELLOW}Database '$DB_NAME' already exists.${NC}"
    read -p "Do you want to recreate it? This will delete all existing data. (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}Dropping existing database...${NC}"
        sudo -u postgres psql -c "DROP DATABASE IF EXISTS $DB_NAME;"
        sudo -u postgres psql -c "DROP USER IF EXISTS $DB_USER;"
    else
        echo -e "${GREEN}Keeping existing database.${NC}"
        exit 0
    fi
fi

# Create database and user
echo -e "${GREEN}Creating database and user...${NC}"
sudo -u postgres psql << EOF
CREATE DATABASE $DB_NAME;
CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;
ALTER USER $DB_USER CREATEDB;
\q
EOF

# Import schema and data
echo -e "${GREEN}Importing database schema and sample data...${NC}"
if [ -f "opsease_database.sql" ]; then
    sudo -u postgres psql -d $DB_NAME -f opsease_database.sql
    echo -e "${GREEN}✅ Database setup completed successfully!${NC}"
else
    echo -e "${RED}❌ opsease_database.sql file not found!${NC}"
    exit 1
fi

# Configure PostgreSQL for local connections
echo -e "${GREEN}Configuring PostgreSQL authentication...${NC}"
PG_VERSION=$(sudo -u postgres psql -c "SHOW server_version;" | head -3 | tail -1 | awk '{print $1}' | cut -d. -f1)
PG_HBA_FILE="/etc/postgresql/$PG_VERSION/main/pg_hba.conf"

# Add local connection for opsease_user if not exists
if ! grep -q "local.*$DB_NAME.*$DB_USER" "$PG_HBA_FILE"; then
    echo "local   $DB_NAME         $DB_USER                            md5" >> "$PG_HBA_FILE"
    systemctl restart postgresql
fi

# Test database connection
echo -e "${GREEN}Testing database connection...${NC}"
if PGPASSWORD=$DB_PASSWORD psql -h localhost -U $DB_USER -d $DB_NAME -c "SELECT COUNT(*) FROM users;" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Database connection test successful!${NC}"
else
    echo -e "${RED}❌ Database connection test failed!${NC}"
    exit 1
fi

# Show database information
echo -e "${GREEN}📊 Database Information:${NC}"
echo "Database Name: $DB_NAME"
echo "Username: $DB_USER"
echo "Host: localhost"
echo "Port: 5432"
echo ""

echo -e "${GREEN}📋 Sample Data Included:${NC}"
PGPASSWORD=$DB_PASSWORD psql -h localhost -U $DB_USER -d $DB_NAME << EOF
SELECT 'Users: ' || COUNT(*) FROM users;
SELECT 'Customers: ' || COUNT(*) FROM customers;
SELECT 'Suppliers: ' || COUNT(*) FROM suppliers;
SELECT 'Employees: ' || COUNT(*) FROM employees;
SELECT 'Orders: ' || COUNT(*) FROM orders;
SELECT 'Stock Items: ' || COUNT(*) FROM stock;
SELECT 'Attendance Records: ' || COUNT(*) FROM attendance;
\q
EOF

echo ""
echo -e "${GREEN}🔑 Default Login Credentials:${NC}"
echo "Username: admin"
echo "Password: admin123"
echo ""
echo -e "${GREEN}✅ Database setup completed! You can now start the application.${NC}"