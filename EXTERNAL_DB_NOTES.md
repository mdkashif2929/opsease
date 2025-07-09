# External Database Configuration for OpsEase

## Database Details
- **Host**: maketrack.zaf-tech.io
- **Username**: maketrack
- **Database**: postgres
- **Password**: 1L1kETuRt13$!
- **Port**: 5432

## Changes Made

### 1. Environment Configuration
Updated `.env.example` to use external database:
```bash
DATABASE_URL=postgresql://maketrack:1L1kETuRt13$!@maketrack.zaf-tech.io:5432/postgres
```

### 2. Deployment Scripts Updated
- **`quick-deploy-external-db.sh`**: New deployment script for external database
- **`quick-deploy.sh`**: Modified to test external database instead of setting up local PostgreSQL
- **`CONTABO_DEPLOYMENT.md`**: Updated to remove local PostgreSQL installation steps

### 3. Local Database Removal
- No PostgreSQL server installation required on your VPS
- Only PostgreSQL client needed for database connections
- Removed all local database setup steps from deployment process

## Deployment Instructions

### Option 1: Use New External DB Script (Recommended)
```bash
cd /var/www/opsease
./quick-deploy-external-db.sh
```

### Option 2: Manual Steps
1. Install PostgreSQL client: `apt install postgresql-client`
2. Test connection: `PGPASSWORD="1L1kETuRt13$!" psql -h maketrack.zaf-tech.io -U maketrack -d postgres -c "SELECT version();"`
3. Configure environment with external database URL
4. Deploy application without local database setup

## Database Schema Setup
The deployment script will automatically import the database schema to your external database. The SQL file has been modified to work with the existing `postgres` database and `maketrack` user.

## Benefits of External Database
1. **Reduced Server Resources**: No PostgreSQL server running on your VPS
2. **Better Performance**: Dedicated database server
3. **Easier Maintenance**: Database managed externally  
4. **Backup Management**: External database backup responsibility
5. **Scalability**: Database can be scaled independently

## Connection Testing
```bash
# Test from your VPS
PGPASSWORD="1L1kETuRt13$!" psql -h maketrack.zaf-tech.io -U maketrack -d postgres

# Test from your application
curl http://localhost:5000/api/health
```

## Security Notes
- Database password is included in environment file
- Ensure VPS has secure access to external database
- Network connectivity required between VPS and database server
- Consider using environment variable injection for production secrets