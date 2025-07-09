# Quick Deployment Steps for Contabo VPS

## Step-by-Step Instructions

### 1. Connect to Your Server
```bash
ssh root@5.189.171.19
# Password: truepas1
```

### 2. Upload This Package
Upload the entire `deployment-package` folder to your server at `/var/www/opsease/`

**Using SCP (from your local machine):**
```bash
scp -r deployment-package/* root@5.189.171.19:/var/www/opsease/
```

**Using SFTP/FileZilla:**
- Connect to `5.189.171.19` with username `root` and password `truepas1`
- Upload all files to `/var/www/opsease/`

### 3. Run Setup Scripts (on server)
```bash
# Navigate to the application directory
cd /var/www/opsease

# Make scripts executable
chmod +x *.sh

# Run the quick deployment script
sudo ./quick-deploy.sh
```

### 4. Configure SSL Certificate
```bash
# Get free SSL certificate
sudo certbot --nginx -d maketrack.zaf-tech.io -d www.maketrack.zaf-tech.io
```

### 5. Set Up DNS
Configure your domain DNS to point to your server:
- **A Record**: `maketrack.zaf-tech.io` → `5.189.171.19`
- **A Record**: `www.maketrack.zaf-tech.io` → `5.189.171.19`

### 6. Verify Deployment
```bash
# Check application status
pm2 status

# Test health endpoint
curl http://localhost:5000/api/health

# Check website
curl -I https://maketrack.zaf-tech.io
```

## Your Application Will Be Available At:
**https://maketrack.zaf-tech.io**

## Useful Commands

### Application Management
```bash
pm2 status              # Check application status
pm2 logs opsease        # View application logs
pm2 restart opsease     # Restart application
pm2 monit              # Monitor resources
```

### System Management
```bash
systemctl status nginx postgresql  # Check services
ufw status                         # Check firewall
./backup-script.sh                 # Run backup
./update-app.sh                    # Update application
```

### Troubleshooting
```bash
# View logs
tail -f /var/log/opsease/combined.log
tail -f /var/log/nginx/error.log
journalctl -f

# Test database connection
psql -h localhost -U opsease_user -d opsease

# Check disk space
df -h

# Check memory usage
free -h
```

## Support
If you encounter any issues, refer to `CONTABO_DEPLOYMENT.md` for detailed troubleshooting steps.