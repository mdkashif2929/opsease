#!/bin/bash

# OpsEase Quick Deployment Script for External Database
# This script deploys OpsEase using an external PostgreSQL database

set -e

echo "🚀 Starting OpsEase deployment with external database..."

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Please run as root${NC}"
    exit 1
fi

# Update system
echo -e "${GREEN}📦 Updating system packages...${NC}"
apt update && apt upgrade -y

# Install essential packages
echo -e "${GREEN}📦 Installing essential packages...${NC}"
apt install -y curl wget git unzip software-properties-common htop ufw fail2ban

# Install Node.js 20
echo -e "${GREEN}📦 Installing Node.js 20...${NC}"
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# Install Nginx
echo -e "${GREEN}🌐 Installing Nginx...${NC}"
apt install -y nginx
systemctl start nginx
systemctl enable nginx

# Install PM2
echo -e "${GREEN}📊 Installing PM2...${NC}"
npm install -g pm2

# Install Certbot for SSL
echo -e "${GREEN}🔒 Installing Certbot...${NC}"
apt install -y certbot python3-certbot-nginx

# Install PostgreSQL client only (for database connections)
echo -e "${GREEN}🗄️ Installing PostgreSQL client...${NC}"
apt install -y postgresql-client

# Configure firewall
echo -e "${GREEN}🔥 Configuring firewall...${NC}"
ufw --force enable
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 'Nginx Full'

# Create application directory
APP_DIR="/var/www/opsease"
echo -e "${GREEN}📁 Setting up application directory...${NC}"
mkdir -p $APP_DIR
chown -R www-data:www-data $APP_DIR

# Create environment file
echo -e "${GREEN}⚙️ Creating environment configuration...${NC}"
cat > $APP_DIR/.env << 'EOF'
# Database Configuration - External PostgreSQL
DATABASE_URL=postgresql://maketrack:1L1kETuRt13$!@maketrack.zaf-tech.io:5432/postgres

# Session Configuration
SESSION_SECRET=OpsEase2025SecureSessionKey!$(date +%s)

# Application Configuration
NODE_ENV=production
PORT=5000

# External Database Credentials (for reference)
# Host: maketrack.zaf-tech.io
# Username: maketrack
# Database: postgres
# Password: 1L1kETuRt13$!
# Port: 5432
EOF

# Test external database connection
echo -e "${GREEN}🔍 Testing external database connection...${NC}"
if PGPASSWORD="1L1kETuRt13$!" psql -h maketrack.zaf-tech.io -U maketrack -d postgres -c "SELECT version();" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ External database connection successful!${NC}"
else
    echo -e "${RED}❌ External database connection failed!${NC}"
    echo -e "${YELLOW}Please check your database credentials and network connectivity.${NC}"
    exit 1
fi

# Install dependencies and build
echo -e "${GREEN}📦 Installing application dependencies...${NC}"
cd $APP_DIR
npm install --production

echo -e "${GREEN}🏗️ Building application...${NC}"
if npm run build; then
    echo -e "${GREEN}✅ Standard build successful${NC}"
else
    echo -e "${YELLOW}⚠️ Standard build failed, trying alternative build...${NC}"
    chmod +x build-fix.sh
    ./build-fix.sh
fi

# Import database schema to external database
echo -e "${GREEN}🗄️ Setting up database schema on external database...${NC}"
if [ -f "opsease_external_database.sql" ]; then
    PGPASSWORD="1L1kETuRt13$!" psql -h maketrack.zaf-tech.io -U maketrack -d postgres -f opsease_external_database.sql
    echo -e "${GREEN}✅ Database schema imported successfully!${NC}"
elif [ -f "opsease_database.sql" ]; then
    # Modify the original SQL file to work with external database
    sed 's/CREATE USER opsease_user.*/-- User already exists/g' opsease_database.sql > temp_schema.sql
    sed -i 's/GRANT ALL PRIVILEGES ON DATABASE opsease TO opsease_user.*/-- Permissions handled externally/g' temp_schema.sql
    sed -i 's/\\c opsease/-- Database already selected/g' temp_schema.sql
    
    PGPASSWORD="1L1kETuRt13$!" psql -h maketrack.zaf-tech.io -U maketrack -d postgres -f temp_schema.sql
    rm temp_schema.sql
    echo -e "${GREEN}✅ Database schema imported successfully!${NC}"
else
    echo -e "${YELLOW}⚠️ Database schema file not found. Running migrations instead...${NC}"
    npm run db:push
fi

# Create PM2 ecosystem file
echo -e "${GREEN}📊 Creating PM2 configuration...${NC}"
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'opsease',
    script: 'dist/index.js',
    cwd: '/var/www/opsease',
    instances: 1,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    log_file: '/var/log/opsease/combined.log',
    out_file: '/var/log/opsease/out.log',
    error_file: '/var/log/opsease/error.log',
    time: true,
    merge_logs: true,
    max_restarts: 5,
    restart_delay: 1000
  }]
};
EOF

# Create log directory
mkdir -p /var/log/opsease
chown -R www-data:www-data /var/log/opsease

# Start application with PM2
echo -e "${GREEN}🚀 Starting application...${NC}"
pm2 start ecosystem.config.js
pm2 save
pm2 startup

# Configure Nginx
echo -e "${GREEN}🌐 Configuring Nginx...${NC}"
cat > /etc/nginx/sites-available/maketrack.zaf-tech.io << 'EOF'
server {
    listen 80;
    server_name maketrack.zaf-tech.io www.maketrack.zaf-tech.io;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    # Static files
    location /assets {
        root /var/www/opsease/dist/public;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # API and application
    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Health check endpoint
    location /api/health {
        access_log off;
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
    }
}
EOF

# Enable the site
ln -sf /etc/nginx/sites-available/maketrack.zaf-tech.io /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
nginx -t

# Restart Nginx
systemctl restart nginx

# Set timezone to IST
echo -e "${GREEN}🕐 Setting timezone to Asia/Kolkata...${NC}"
timedatectl set-timezone Asia/Kolkata

# Health check
echo -e "${GREEN}🏥 Performing health check...${NC}"
sleep 5
if curl -f http://localhost:5000/api/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Application is running successfully!${NC}"
else
    echo -e "${RED}❌ Health check failed. Checking logs...${NC}"
    pm2 logs opsease --lines 20
fi

# Final status
echo -e "${GREEN}📊 Deployment Summary:${NC}"
echo "Application URL: http://maketrack.zaf-tech.io"
echo "Database: External PostgreSQL at maketrack.zaf-tech.io"
echo "Application Directory: $APP_DIR"
echo "PM2 Status: $(pm2 list | grep opsease | awk '{print $12}')"
echo ""
echo -e "${GREEN}🔧 Useful Commands:${NC}"
echo "pm2 status              # Check application status"
echo "pm2 logs opsease        # View application logs"
echo "pm2 restart opsease     # Restart application"
echo "systemctl status nginx  # Check Nginx status"
echo ""
echo -e "${GREEN}🔒 Next Steps:${NC}"
echo "1. Configure SSL certificate: sudo certbot --nginx -d maketrack.zaf-tech.io"
echo "2. Point your domain DNS to this server's IP"
echo "3. Access your application at https://maketrack.zaf-tech.io"
echo ""
echo -e "${GREEN}🔑 Default Login Credentials:${NC}"
echo "Username: admin"
echo "Password: admin123"
echo ""
echo -e "${GREEN}✅ OpsEase deployment completed successfully!${NC}"