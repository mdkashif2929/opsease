# OpsEase Deployment Guide for Contabo VPS

## Server Details
- **IP Address**: 5.189.171.19
- **Domain**: maketrack.zaf-tech.io
- **Server**: Contabo Cloud VPS 20 (6 vCPU, 12GB RAM, 100GB NVMe)
- **OS**: Ubuntu 22.04 LTS (recommended)

## Step 1: Connect to Your Server

```bash
# Connect via SSH
ssh root@5.189.171.19
# Enter password: truepas1
```

## Step 2: Initial Server Setup

```bash
# Update system packages
apt update && apt upgrade -y

# Install essential packages
apt install -y curl wget git unzip software-properties-common

# Create a new user for better security (optional but recommended)
adduser opsease
usermod -aG sudo opsease
# Set a strong password for the opsease user
```

## Step 3: Install Node.js 20

```bash
# Install Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
apt-get install -y nodejs

# Verify installation
node --version
npm --version
```

## Step 4: Install PostgreSQL Client (External Database)

**Using External PostgreSQL Database:**
- **Host**: maketrack.zaf-tech.io
- **Username**: maketrack
- **Database**: postgres  
- **Password**: 1L1kETuRt13$!
- **Port**: 5432

```bash
# Install PostgreSQL client only (no server needed)
apt install -y postgresql-client

# Test connection to external database
PGPASSWORD="1L1kETuRt13$!" psql -h maketrack.zaf-tech.io -U maketrack -d postgres -c "SELECT version();"
```

**Note**: No local PostgreSQL server installation required since using external database.

## Step 5: Install Nginx

```bash
# Install Nginx
apt install -y nginx

# Start and enable Nginx
systemctl start nginx
systemctl enable nginx
```

## Step 6: Install PM2

```bash
# Install PM2 globally
npm install -g pm2

# Set up PM2 startup script
pm2 startup
# Follow the instructions provided by the command above
```

## Step 7: Deploy the Application

```bash
# Create application directory
mkdir -p /var/www/opsease
cd /var/www/opsease

# Clone the repository (you'll need to upload your code)
# For now, we'll create the structure manually

# Create package.json and other files
# You'll need to upload the built application files
```

## Step 8: Upload Application Files

You have several options to upload your application:

### Option A: Using SCP (from your local machine)
```bash
# From your local machine where you have the OpsEase code
scp -r . root@5.189.171.19:/var/www/opsease/
```

### Option B: Using Git Repository

**Repository Privacy Options:**
- **Public Repository**: Can be cloned directly without authentication
- **Private Repository**: Requires SSH key or personal access token

**For Public Repository:**
```bash
# On the server
cd /var/www/opsease
git clone https://github.com/yourusername/opsease.git .
```

**For Private Repository:**
```bash
# Option 1: Using SSH (recommended)
# First, add your server's SSH key to your Git provider
ssh-keygen -t rsa -b 4096 -C "your_email@example.com"
cat ~/.ssh/id_rsa.pub  # Add this to your GitHub/GitLab
git clone git@github.com:yourusername/opsease.git .

# Option 2: Using Personal Access Token
git clone https://username:personal_access_token@github.com/yourusername/opsease.git .
```

### Option C: Manual upload via SFTP
Use an SFTP client like FileZilla to upload files.

## Step 9: Configure Application

```bash
# Navigate to application directory
cd /var/www/opsease

# Install dependencies
npm install --production

# Create environment file
cat > .env << 'EOF'
DATABASE_URL=postgresql://maketrack:1L1kETuRt13$!@maketrack.zaf-tech.io:5432/postgres
SESSION_SECRET=MakeTrack2025SecureSessionKey!RandomString123
NODE_ENV=production
PORT=5000
EOF

# Set proper permissions
chown -R www-data:www-data /var/www/opsease
chmod -R 755 /var/www/opsease

# Build the application
npm run build

# Run database migrations
npm run db:push
```

## Step 10: Configure PM2

```bash
# Create PM2 ecosystem file
cat > /var/www/opsease/ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'opsease',
    script: './dist/index.js',
    instances: 4, // Use 4 instances for your 6-core server
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

# Create log directory
mkdir -p /var/log/opsease
chown -R www-data:www-data /var/log/opsease

# Start the application
cd /var/www/opsease
pm2 start ecosystem.config.js
pm2 save
```

## Step 11: Configure Nginx

```bash
# Create Nginx configuration for your domain
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
ln -s /etc/nginx/sites-available/maketrack.zaf-tech.io /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
nginx -t

# Restart Nginx
systemctl restart nginx
```

## Step 12: Configure SSL Certificate

```bash
# Install Certbot
apt install -y certbot python3-certbot-nginx

# Get SSL certificate for your domain
certbot --nginx -d maketrack.zaf-tech.io -d www.maketrack.zaf-tech.io

# Test automatic renewal
certbot renew --dry-run

# Set up auto-renewal
systemctl enable certbot.timer
```

## Step 13: Configure Firewall

```bash
# Install and configure UFW
ufw --force enable
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 'Nginx Full'
ufw allow 80
ufw allow 443

# Show status
ufw status verbose
```

## Step 14: Set Up Backups

```bash
# Create backup script
cat > /root/backup-opsease.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/root/backups"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

# Database backup
pg_dump -h localhost -U opsease_user opsease > $BACKUP_DIR/opsease_db_$DATE.sql

# Application backup
tar -czf $BACKUP_DIR/opsease_app_$DATE.tar.gz -C /var/www opsease

# Keep only last 7 days of backups
find $BACKUP_DIR -name "opsease_*" -mtime +7 -delete

echo "Backup completed: $DATE"
EOF

chmod +x /root/backup-opsease.sh

# Add to crontab for daily backups at 2 AM
(crontab -l 2>/dev/null; echo "0 2 * * * /root/backup-opsease.sh") | crontab -
```

## Step 15: Verify Deployment

```bash
# Check if application is running
pm2 status

# Check application logs
pm2 logs opsease --lines 50

# Test health endpoint
curl http://localhost:5000/api/health

# Check if domain is accessible
curl -I http://maketrack.zaf-tech.io

# Check SSL certificate
curl -I https://maketrack.zaf-tech.io
```

## Post-Deployment Configuration

### Domain DNS Setup
Make sure your domain `maketrack.zaf-tech.io` points to your server IP `5.189.171.19`:

```
A Record: maketrack.zaf-tech.io → 5.189.171.19
A Record: www.maketrack.zaf-tech.io → 5.189.171.19
```

### Initial Application Setup
1. Visit `https://maketrack.zaf-tech.io`
2. Create your first admin user
3. Set up your company information
4. Configure initial employees, customers, etc.

## Monitoring and Maintenance

### View Logs
```bash
# Application logs
pm2 logs opsease

# Nginx logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log

# System logs
journalctl -f
```

### Update Application
```bash
cd /var/www/opsease
git pull origin main  # if using git
npm install --production
npm run build
npm run db:push
pm2 restart opsease
```

### Monitor Resources
```bash
# PM2 monitoring
pm2 monit

# System resources
htop
df -h
free -h
```

## Troubleshooting

### Application won't start
1. Check environment variables in `.env`
2. Verify database connection: `psql -h localhost -U opsease_user -d opsease`
3. Check PM2 logs: `pm2 logs opsease`

### Domain not accessible
1. Verify DNS settings point to your server IP
2. Check Nginx configuration: `nginx -t`
3. Check firewall: `ufw status`

### SSL certificate issues
1. Renew certificate: `certbot renew`
2. Check certificate status: `certbot certificates`

## Security Recommendations

1. **Change default SSH port** (optional)
2. **Use SSH keys instead of passwords**
3. **Regular system updates**: `apt update && apt upgrade`
4. **Monitor failed login attempts**
5. **Regular backups**: Already configured for daily backups

Your OpsEase application should now be fully deployed and accessible at `https://maketrack.zaf-tech.io`!