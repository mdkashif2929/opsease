# OpsEase Deployment Guide

## Overview
This guide provides deployment instructions for OpsEase manufacturing operations management system using either Coolify (recommended) or manual Linux deployment.

## System Requirements

### Minimum Requirements
- **CPU**: 2 vCPU cores
- **RAM**: 4 GB
- **Storage**: 20 GB SSD
- **OS**: Ubuntu 20.04+ or CentOS 8+

### Recommended Requirements (Cloud VPS 20)
- **CPU**: 6 vCPU cores
- **RAM**: 12 GB
- **Storage**: 100 GB NVMe
- **OS**: Ubuntu 22.04 LTS

## Prerequisites

### Environment Variables Required
```bash
DATABASE_URL=postgresql://username:password@localhost:5432/opsease
SESSION_SECRET=your-secure-session-secret-key
NODE_ENV=production
PORT=5000
```

### Dependencies
- Node.js 18+ or 20+
- PostgreSQL 14+
- nginx (for reverse proxy)
- PM2 (for process management)

---

## Option 1: Coolify Deployment (Recommended)

Coolify is a modern, self-hosted platform that simplifies deployment with Docker containers.

### 1. Install Coolify

```bash
# Install Coolify on your server
curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash
```

### 2. Access Coolify Dashboard
- Open `http://your-server-ip:8000`
- Complete initial setup and create admin account

### 3. Create New Project
1. Click "New Project"
2. Name: "OpsEase"
3. Description: "Manufacturing Operations Management System"

### 4. Add Database Service
1. Go to "Services" → "Add Service"
2. Select "PostgreSQL"
3. Configuration:
   - Service name: `opsease-db`
   - Database name: `opsease`
   - Username: `opsease_user`
   - Password: Generate secure password
   - Port: `5432`
4. Deploy the database service

### 5. Deploy Application

**Option A: Using Git Repository (Public or Private)**
1. Click "New Resource" → "Git Repository"
2. Repository URL: 
   - **Public repo**: `https://github.com/yourusername/opsease.git`
   - **Private repo**: Use SSH key or access token authentication
3. Branch: `main`
4. Build configuration:
   - Build command: `npm run build`
   - Start command: `npm start`
   - Port: `5000`

**Option B: Direct File Upload (Recommended for this deployment)**
1. Click "New Resource" → "Docker Compose"
2. Upload the `docker-compose.yml` from the deployment package
3. Or manually upload application files to server and configure manually

### 6. Configure Environment Variables
In Coolify application settings, add:
```
DATABASE_URL=postgresql://opsease_user:your-password@opsease-db:5432/opsease
SESSION_SECRET=your-secure-session-secret-here
NODE_ENV=production
PORT=5000
```

### 7. Set Up Domain
1. Go to "Domains" in your application
2. Add your domain: `yourdomain.com`
3. Enable SSL certificate (automatic with Let's Encrypt)

### 8. Deploy
1. Click "Deploy"
2. Monitor deployment logs
3. Once deployed, run database migrations:
   ```bash
   # In Coolify terminal for your app
   npm run db:push
   ```

---

## Option 2: Manual Linux Deployment

### 1. Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PostgreSQL
sudo apt install postgresql postgresql-contrib -y

# Install nginx
sudo apt install nginx -y

# Install PM2 globally
sudo npm install -g pm2
```

### 2. Database Setup

```bash
# Switch to postgres user
sudo -u postgres psql

# Create database and user
CREATE DATABASE opsease;
CREATE USER opsease_user WITH PASSWORD 'your-secure-password';
GRANT ALL PRIVILEGES ON DATABASE opsease TO opsease_user;
GRANT ALL ON SCHEMA public TO opsease_user;
\q
```

### 3. Application Deployment

```bash
# Create application directory
sudo mkdir -p /var/www/opsease
sudo chown $USER:$USER /var/www/opsease

# Clone repository
cd /var/www/opsease
git clone https://github.com/yourusername/opsease.git .

# Install dependencies
npm install

# Create environment file
cat > .env << EOF
DATABASE_URL=postgresql://opsease_user:your-secure-password@localhost:5432/opsease
SESSION_SECRET=your-secure-session-secret-here
NODE_ENV=production
PORT=5000
EOF

# Build application
npm run build

# Run database migrations
npm run db:push
```

### 4. PM2 Process Management

```bash
# Create PM2 ecosystem file
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'opsease',
    script: './dist/index.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    error_file: '/var/log/opsease/error.log',
    out_file: '/var/log/opsease/access.log',
    log_file: '/var/log/opsease/combined.log'
  }]
}
EOF

# Create log directory
sudo mkdir -p /var/log/opsease
sudo chown $USER:$USER /var/log/opsease

# Start application with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 5. Nginx Configuration

```bash
# Create nginx configuration
sudo tee /etc/nginx/sites-available/opsease << EOF
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

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
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

# Enable site
sudo ln -s /etc/nginx/sites-available/opsease /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 6. SSL Certificate (Optional but Recommended)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Get SSL certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Auto-renewal
sudo systemctl enable certbot.timer
```

### 7. Firewall Configuration

```bash
# Configure UFW
sudo ufw enable
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw status
```

---

## Post-Deployment Setup

### 1. Create Initial Admin User
Access your application and create the first admin user through the authentication system.

### 2. Database Backup Script

```bash
# Create backup script
cat > /home/$USER/backup-opsease.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/home/$USER/backups"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

# Database backup
pg_dump -h localhost -U opsease_user opsease > $BACKUP_DIR/opsease_db_$DATE.sql

# Keep only last 7 days of backups
find $BACKUP_DIR -name "opsease_db_*.sql" -mtime +7 -delete

echo "Backup completed: opsease_db_$DATE.sql"
EOF

chmod +x /home/$USER/backup-opsease.sh

# Add to crontab for daily backups
(crontab -l 2>/dev/null; echo "0 2 * * * /home/$USER/backup-opsease.sh") | crontab -
```

### 3. Monitoring and Logs

```bash
# View application logs
pm2 logs opsease

# Monitor system resources
pm2 monit

# Check nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

---

## Maintenance Commands

### Update Application
```bash
cd /var/www/opsease
git pull origin main
npm install
npm run build
npm run db:push
pm2 restart opsease
```

### Database Operations
```bash
# Manual database migration
npm run db:push

# View database tables
psql -h localhost -U opsease_user -d opsease -c "\dt"
```

### PM2 Management
```bash
# Restart application
pm2 restart opsease

# Stop application
pm2 stop opsease

# View process status
pm2 status

# View logs
pm2 logs opsease --lines 100
```

---

## Troubleshooting

### Common Issues

1. **Application won't start**
   - Check environment variables in `.env`
   - Verify database connection
   - Check PM2 logs: `pm2 logs opsease`

2. **Database connection errors**
   - Verify PostgreSQL is running: `sudo systemctl status postgresql`
   - Check database credentials and permissions
   - Test connection: `psql -h localhost -U opsease_user -d opsease`

3. **Nginx 502 errors**
   - Check if application is running: `pm2 status`
   - Verify port 5000 is accessible: `netstat -tlnp | grep 5000`
   - Check nginx configuration: `sudo nginx -t`

4. **SSL certificate issues**
   - Renew certificate: `sudo certbot renew`
   - Check certificate status: `sudo certbot certificates`

### Performance Optimization

1. **Database optimization**
   ```sql
   -- Add indexes for frequently queried columns
   CREATE INDEX idx_orders_user_id ON orders(user_id);
   CREATE INDEX idx_attendance_date ON attendance(date);
   CREATE INDEX idx_expenses_date ON expenses(date);
   ```

2. **Application optimization**
   - Enable gzip compression in nginx
   - Set up static file caching
   - Monitor memory usage with PM2

---

## Security Best Practices

1. **Regular Updates**
   - Keep system packages updated
   - Update Node.js and npm regularly
   - Monitor security advisories

2. **Database Security**
   - Use strong passwords
   - Restrict database access to localhost
   - Regular backups

3. **Application Security**
   - Use HTTPS in production
   - Set secure session secrets
   - Implement rate limiting if needed

4. **Server Security**
   - Use SSH keys instead of passwords
   - Configure firewall properly
   - Regular security audits

---

## Support

For deployment issues or questions:
1. Check application logs first
2. Review this deployment guide
3. Consult the main README.md file
4. Check system resource usage

Remember to replace placeholders like `yourdomain.com`, `your-secure-password`, and repository URLs with your actual values.