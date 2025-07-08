#!/bin/bash

# Quick deployment script for Contabo VPS
# Run this script on your server after uploading the application files

set -e

echo "🚀 Starting OpsEase deployment on Contabo VPS..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Please run as root (use sudo)${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Running as root${NC}"

# Update system
echo -e "${GREEN}📦 Updating system packages...${NC}"
apt update && apt upgrade -y

# Install Node.js 20
echo -e "${GREEN}📦 Installing Node.js 20...${NC}"
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# Install PostgreSQL
echo -e "${GREEN}🗄️ Installing PostgreSQL...${NC}"
apt install -y postgresql postgresql-contrib

# Start PostgreSQL
systemctl start postgresql
systemctl enable postgresql

# Create database and user
echo -e "${GREEN}🗄️ Setting up database...${NC}"
sudo -u postgres psql << 'EOF'
CREATE DATABASE opsease;
CREATE USER opsease_user WITH PASSWORD 'OpsEase2025!SecureDB';
GRANT ALL PRIVILEGES ON DATABASE opsease TO opsease_user;
GRANT ALL ON SCHEMA public TO opsease_user;
ALTER USER opsease_user CREATEDB;
\q
EOF

# Configure PostgreSQL
echo "local   opsease         opsease_user                            md5" >> /etc/postgresql/15/main/pg_hba.conf
systemctl restart postgresql

# Install Nginx
echo -e "${GREEN}🌐 Installing Nginx...${NC}"
apt install -y nginx
systemctl start nginx
systemctl enable nginx

# Install PM2
echo -e "${GREEN}📊 Installing PM2...${NC}"
npm install -g pm2

# Create application directory
echo -e "${GREEN}📁 Setting up application directory...${NC}"
mkdir -p /var/www/opsease
cd /var/www/opsease

# Set permissions
chown -R www-data:www-data /var/www/opsease
chmod -R 755 /var/www/opsease

# Create environment file
echo -e "${GREEN}⚙️ Creating environment configuration...${NC}"
cat > .env << 'EOF'
DATABASE_URL=postgresql://opsease_user:OpsEase2025!SecureDB@localhost:5432/opsease
SESSION_SECRET=MakeTrack2025SecureSessionKey!RandomString123
NODE_ENV=production
PORT=5000
EOF

# Install dependencies and build (only if package.json exists)
if [ -f "package.json" ]; then
    echo -e "${GREEN}📦 Installing dependencies...${NC}"
    npm install --production
    
    echo -e "${GREEN}🏗️ Building application...${NC}"
    npm run build
    
    echo -e "${GREEN}🗄️ Running database migrations...${NC}"
    npm run db:push
fi

# Create log directory
mkdir -p /var/log/opsease
chown -R www-data:www-data /var/log/opsease

# Create PM2 ecosystem file
echo -e "${GREEN}📊 Configuring PM2...${NC}"
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'opsease',
    script: './dist/index.js',
    instances: 4,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    error_file: '/var/log/opsease/error.log',
    out_file: '/var/log/opsease/access.log',
    log_file: '/var/log/opsease/combined.log',
    time: true,
    max_memory_restart: '1G'
  }]
};
EOF

# Start application with PM2 (only if built)
if [ -f "dist/index.js" ]; then
    echo -e "${GREEN}🚀 Starting application...${NC}"
    pm2 start ecosystem.config.js
    pm2 save
    pm2 startup
fi

# Configure Nginx
echo -e "${GREEN}🌐 Configuring Nginx...${NC}"
cat > /etc/nginx/sites-available/maketrack.zaf-tech.io << 'EOF'
server {
    listen 80;
    server_name maketrack.zaf-tech.io www.maketrack.zaf-tech.io;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
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
        
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    location /api/health {
        access_log off;
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
    }
}
EOF

# Enable site
ln -sf /etc/nginx/sites-available/maketrack.zaf-tech.io /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
nginx -t && systemctl restart nginx

# Install Certbot for SSL
echo -e "${GREEN}🔒 Installing SSL certificate...${NC}"
apt install -y certbot python3-certbot-nginx

# Configure firewall
echo -e "${GREEN}🔥 Configuring firewall...${NC}"
ufw --force enable
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 'Nginx Full'

# Create backup script
echo -e "${GREEN}💾 Setting up backups...${NC}"
cat > /root/backup-opsease.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/root/backups"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

pg_dump -h localhost -U opsease_user opsease > $BACKUP_DIR/opsease_db_$DATE.sql
tar -czf $BACKUP_DIR/opsease_app_$DATE.tar.gz -C /var/www opsease
find $BACKUP_DIR -name "opsease_*" -mtime +7 -delete

echo "Backup completed: $DATE"
EOF

chmod +x /root/backup-opsease.sh
(crontab -l 2>/dev/null; echo "0 2 * * * /root/backup-opsease.sh") | crontab -

echo -e "${GREEN}✅ Deployment completed!${NC}"
echo ""
echo -e "${GREEN}Next steps:${NC}"
echo -e "${GREEN}1. Upload your application files to /var/www/opsease${NC}"
echo -e "${GREEN}2. Run: cd /var/www/opsease && npm install && npm run build && npm run db:push${NC}"
echo -e "${GREEN}3. Start application: pm2 restart opsease${NC}"
echo -e "${GREEN}4. Get SSL certificate: certbot --nginx -d maketrack.zaf-tech.io -d www.maketrack.zaf-tech.io${NC}"
echo -e "${GREEN}5. Make sure DNS points maketrack.zaf-tech.io to 5.189.171.19${NC}"
echo ""
echo -e "${GREEN}🌐 Your application will be available at: https://maketrack.zaf-tech.io${NC}"