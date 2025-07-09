# Final Deployment Checklist

## ✅ Pre-Deployment Checklist

### Server Access
- [ ] Can connect to server: `ssh root@5.189.171.19`
- [ ] Server has internet connection
- [ ] Server has sufficient disk space (>5GB free)

### DNS Configuration
- [ ] Domain `maketrack.zaf-tech.io` points to `5.189.171.19`
- [ ] WWW subdomain configured
- [ ] DNS propagation completed (check with `nslookup maketrack.zaf-tech.io`)

### Files Uploaded
- [ ] All deployment files uploaded to `/var/www/opsease/`
- [ ] Scripts are executable (`chmod +x *.sh`)

## 🚀 Deployment Steps

### Step 1: Initial Server Setup
```bash
cd /var/www/opsease
sudo ./server-setup.sh
```
- [ ] System packages updated
- [ ] Node.js 20 installed
- [ ] PostgreSQL installed and configured
- [ ] Nginx installed
- [ ] PM2 installed
- [ ] Firewall configured

### Step 2: Application Deployment
```bash
sudo ./quick-deploy.sh
```
- [ ] Dependencies installed
- [ ] Application built successfully
- [ ] Database migrations completed
- [ ] PM2 process started
- [ ] Nginx configured

### Step 3: SSL Certificate
```bash
sudo certbot --nginx -d maketrack.zaf-tech.io -d www.maketrack.zaf-tech.io
```
- [ ] SSL certificate obtained
- [ ] HTTPS redirection working
- [ ] Certificate auto-renewal setup

## 🔍 Post-Deployment Verification

### Application Health
- [ ] PM2 status shows running: `pm2 status`
- [ ] Health endpoint responds: `curl http://localhost:5000/api/health`
- [ ] No errors in logs: `pm2 logs opsease`

### Web Access
- [ ] HTTP access works: `curl -I http://maketrack.zaf-tech.io`
- [ ] HTTPS access works: `curl -I https://maketrack.zaf-tech.io`
- [ ] Website loads in browser
- [ ] Authentication system works

### Database
- [ ] Database accessible: `psql -h localhost -U opsease_user -d opsease -c "SELECT version();"`
- [ ] Tables created successfully
- [ ] No connection errors

### Security
- [ ] Firewall active: `ufw status`
- [ ] Only necessary ports open (22, 80, 443)
- [ ] Fail2ban active: `systemctl status fail2ban`

### Backups
- [ ] Backup script executable: `./backup-script.sh`
- [ ] Cron job scheduled for daily backups
- [ ] Backup directory accessible: `ls -la /root/backups/`

## 🎯 Final Application Setup

### Login and Configuration
- [ ] Access https://maketrack.zaf-tech.io
- [ ] Create admin user account
- [ ] Set up company information
- [ ] Configure initial employees
- [ ] Test all major features:
  - [ ] Orders management
  - [ ] Employee management
  - [ ] Attendance tracking
  - [ ] Expense tracking
  - [ ] Stock management
  - [ ] Invoice generation
  - [ ] Customer management

## 📞 Contact Information

**Application URL**: https://maketrack.zaf-tech.io
**Server IP**: 5.189.171.19
**Database**: PostgreSQL on localhost:5432

## 🆘 If Something Goes Wrong

### Common Issues and Solutions

1. **Application won't start**
   ```bash
   pm2 logs opsease
   npm run build
   pm2 restart opsease
   ```

2. **Database connection issues**
   ```bash
   systemctl status postgresql
   psql -h localhost -U opsease_user -d opsease
   ```

3. **Website not accessible**
   ```bash
   systemctl status nginx
   nginx -t
   ufw status
   ```

4. **SSL certificate problems**
   ```bash
   certbot certificates
   certbot renew
   ```

### Emergency Rollback
If deployment fails completely:
```bash
# Stop services
pm2 stop all
systemctl stop nginx

# Restore from backup (if exists)
./backup-script.sh

# Restart services
systemctl start nginx
pm2 restart all
```

---

**✅ Deployment Complete!**

Your OpsEase manufacturing management system is now live at:
**https://maketrack.zaf-tech.io**