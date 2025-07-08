#!/bin/bash

# OpsEase Deployment Script
# This script builds and deploys the OpsEase application

set -e

echo "🚀 Starting OpsEase deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}Error: package.json not found. Please run this script from the project root.${NC}"
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}Error: Node.js is not installed. Please install Node.js 18 or higher.${NC}"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt "18" ]; then
    echo -e "${RED}Error: Node.js version 18 or higher is required. Current version: $(node --version)${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Node.js version check passed${NC}"

# Check if environment variables are set
if [ -z "$DATABASE_URL" ]; then
    echo -e "${YELLOW}Warning: DATABASE_URL environment variable is not set${NC}"
fi

if [ -z "$SESSION_SECRET" ]; then
    echo -e "${YELLOW}Warning: SESSION_SECRET environment variable is not set${NC}"
fi

# Install dependencies
echo -e "${GREEN}📦 Installing dependencies...${NC}"
npm ci --only=production

# Build the application
echo -e "${GREEN}🏗️ Building application...${NC}"
npm run build

# Check if build was successful
if [ ! -f "dist/index.js" ]; then
    echo -e "${RED}Error: Build failed. dist/index.js not found.${NC}"
    exit 1
fi

if [ ! -d "dist/public" ]; then
    echo -e "${RED}Error: Build failed. dist/public directory not found.${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Build completed successfully${NC}"

# Run database migrations
echo -e "${GREEN}🗄️ Running database migrations...${NC}"
npm run db:push

# Create log directory if it doesn't exist
sudo mkdir -p /var/log/opsease
sudo chown $USER:$USER /var/log/opsease

# Check if PM2 is installed
if command -v pm2 &> /dev/null; then
    echo -e "${GREEN}🔄 Managing application with PM2...${NC}"
    
    # Stop existing process if running
    pm2 stop opsease 2>/dev/null || true
    
    # Start/restart the application
    pm2 start ecosystem.config.js --env production
    pm2 save
    
    echo -e "${GREEN}✓ Application started with PM2${NC}"
    echo -e "${GREEN}📊 View logs: pm2 logs opsease${NC}"
    echo -e "${GREEN}📈 View monitoring: pm2 monit${NC}"
else
    echo -e "${YELLOW}Warning: PM2 not found. Starting application directly...${NC}"
    echo -e "${YELLOW}For production, it's recommended to install PM2: npm install -g pm2${NC}"
    npm start
fi

# Test health endpoint
echo -e "${GREEN}🏥 Testing health endpoint...${NC}"
sleep 3
if curl -f http://localhost:5000/api/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Health check passed${NC}"
else
    echo -e "${RED}❌ Health check failed${NC}"
    exit 1
fi

echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
echo -e "${GREEN}🌐 Application is running at: http://localhost:5000${NC}"
echo ""
echo -e "${GREEN}Next steps:${NC}"
echo -e "${GREEN}1. Configure nginx reverse proxy if needed${NC}"
echo -e "${GREEN}2. Set up SSL certificate${NC}"
echo -e "${GREEN}3. Configure domain name${NC}"
echo -e "${GREEN}4. Set up monitoring and backups${NC}"