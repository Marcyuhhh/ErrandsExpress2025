# ErrandsExpress Complete Setup & Migration Guide

## 🎯 Overview

This guide provides step-by-step instructions for setting up ErrandsExpress application with the corrected workflow. Follow these instructions for a perfect migration whether you're:

- Setting up a fresh installation
- Migrating from an existing installation
- Fixing workflow issues

## 📋 Prerequisites

### System Requirements
- **PHP**: 8.1 or higher
- **Node.js**: 16.x or higher
- **MySQL**: 8.0 or higher (or MariaDB 10.3+)
- **Composer**: Latest version
- **Git**: For version control

### Windows Specific
- XAMPP, WAMP, or Laragon (recommended)
- PowerShell or Command Prompt with Administrator privileges

### macOS/Linux Specific
- Apache/Nginx web server
- MySQL server
- Terminal access

## 🚀 Step 1: Environment Setup

### 1.1 Download and Extract
```bash
# If you have the zip file
# Extract ErrandsExpressFinal-main to your desired location
# Example: C:\xampp\htdocs\errands-express (Windows)
#          /var/www/html/errands-express (Linux)
```

### 1.2 Navigate to Project
```bash
cd path/to/ErrandsExpressFinal-main
```

## 🔧 Step 2: Backend Setup (Laravel)

### 2.1 Navigate to Backend
```bash
cd backend
```

### 2.2 Install PHP Dependencies
```bash
composer install
```

If you encounter errors:
```bash
# Update Composer first
composer self-update

# Clear cache and try again
composer clear-cache
composer install --no-cache
```

### 2.3 Environment Configuration
```bash
# Copy environment file
cp .env.example .env
```

Edit `.env` file with your database credentials:
```env
APP_NAME="ErrandsExpress"
APP_ENV=local
APP_KEY=
APP_DEBUG=true
APP_URL=http://localhost:8000

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=errands_express
DB_USERNAME=root
DB_PASSWORD=your_mysql_password

# JWT Configuration
JWT_SECRET=

# Mail Configuration (Optional for testing)
MAIL_MAILER=smtp
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=your_email@gmail.com
MAIL_PASSWORD=your_app_password
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS=your_email@gmail.com
MAIL_FROM_NAME="${APP_NAME}"
```

### 2.4 Generate Application Key
```bash
php artisan key:generate
```

### 2.5 Generate JWT Secret
```bash
php artisan jwt:secret
```

### 2.6 Create Database
Create a new MySQL database:
```sql
CREATE DATABASE errands_express CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

## 📊 Step 3: Database Migration (CRITICAL)

### 3.1 Choose Your Migration Path

#### Option A: Fresh Installation (Recommended)
```bash
# Run the updated migration with workflow fixes
php artisan migrate:fresh

# If you have seed data
php artisan db:seed
```

#### Option B: Existing Installation with Data
```bash
# First backup your database!
mysqldump -u root -p errands_express > backup_$(date +%Y%m%d_%H%M%S).sql

# Run the workflow fix script
php setup_workflow_fix.php

# OR run the batch file (Windows)
fix_workflow.bat
```

#### Option C: Reset Everything
```bash
# This will destroy all data and recreate everything
php artisan migrate:fresh

# Import your SQL dump if you have one
mysql -u root -p errands_express < errands.sql

# Then run the workflow fix
php setup_workflow_fix.php
```

### 3.2 Verify Migration Success
```bash
# Check if all tables were created
php artisan migrate:status
```

You should see all migrations marked as "Ran".

## ⚛️ Step 4: Frontend Setup (React)

### 4.1 Navigate to Frontend
```bash
cd ../frontend
```

### 4.2 Install Node Dependencies
```bash
npm install
```

If you encounter errors:
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and package-lock.json
rm -rf node_modules package-lock.json

# Install again
npm install
```

### 4.3 Environment Configuration
Create `.env` file in frontend directory:
```env
REACT_APP_API_URL=http://localhost:8000/api
REACT_APP_BASE_URL=http://localhost:8000
```

## 🎯 Step 5: Starting the Application

### 5.1 Start Backend Server
```bash
# In backend directory
cd backend
php artisan serve

# Server will start at http://localhost:8000
```

### 5.2 Start Frontend Development Server
```bash
# In frontend directory (new terminal)
cd frontend
npm start

# Frontend will start at http://localhost:3000
```

## ✅ Step 6: Verification & Testing

### 6.1 Test Backend API
```bash
# Test if API is working
curl http://localhost:8000/api/health

# Or visit in browser: http://localhost:8000/api
```

### 6.2 Test Frontend
Visit `http://localhost:3000` and verify:
- [ ] Application loads without errors
- [ ] Registration works
- [ ] Login works
- [ ] Can create errands
- [ ] Can accept errands
- [ ] Payment workflow works
- [ ] Completion workflow works

### 6.3 Test Complete Workflow
1. **Create Account** → Register new customer and runner
2. **Create Errand** → Customer posts new errand
3. **Accept Errand** → Runner accepts the errand
4. **Submit Payment** → Runner submits payment amount
5. **Verify Payment** → Customer verifies payment (auto-approved)
6. **Complete Errand** → Runner marks as complete
7. **Confirm Completion** → Customer confirms completion

## 🔧 Step 7: Production Deployment (Optional)

### 7.1 Environment Updates
Update `.env` for production:
```env
APP_ENV=production
APP_DEBUG=false
APP_URL=https://yourdomain.com

# Use production database credentials
DB_HOST=your_production_db_host
DB_DATABASE=your_production_db_name
DB_USERNAME=your_production_db_user
DB_PASSWORD=your_production_db_password
```

### 7.2 Optimize for Production
```bash
# Cache configuration
php artisan config:cache

# Cache routes
php artisan route:cache

# Cache views
php artisan view:cache

# Install production dependencies only
composer install --optimize-autoloader --no-dev
```

### 7.3 Frontend Production Build
```bash
cd frontend
npm run build
```

## 🛠️ Troubleshooting

### Common Issues & Solutions

#### 1. Migration Fails
```bash
# Check database connection
php artisan tinker
>>> DB::connection()->getPdo();

# If connection fails, check .env database settings
```

#### 2. JWT Secret Issues
```bash
# Regenerate JWT secret
php artisan jwt:secret --force
```

#### 3. Permission Issues (Linux/macOS)
```bash
# Set proper permissions
sudo chown -R www-data:www-data storage
sudo chown -R www-data:www-data bootstrap/cache
chmod -R 775 storage
chmod -R 775 bootstrap/cache
```

#### 4. CORS Issues
Add to `config/cors.php`:
```php
'paths' => ['api/*', 'sanctum/csrf-cookie'],
'allowed_origins' => ['http://localhost:3000'],
'allowed_methods' => ['*'],
'allowed_headers' => ['*'],
```

#### 5. Workflow Still Not Working
```bash
# Run the workflow fix again
cd backend
php setup_workflow_fix.php

# Check the output for any errors
```

#### 6. Frontend Build Issues
```bash
# Clear React cache
rm -rf node_modules/.cache
npm start
```

## 📁 File Structure Verification

Your project should look like this:
```
ErrandsExpressFinal-main/
├── backend/
│   ├── app/
│   ├── config/
│   ├── database/
│   │   └── migrations/
│   │       └── 2025_01_01_000000_full_complete_errand_migration.php ✅
│   ├── setup_workflow_fix.php ✅
│   ├── fix_workflow.bat ✅
│   ├── WORKFLOW_FIX_README.md ✅
│   ├── .env
│   └── composer.json
├── frontend/
│   ├── src/
│   ├── public/
│   ├── .env
│   └── package.json
├── errands.sql (optional)
└── COMPLETE_SETUP_GUIDE.md ✅
```

## 🔐 Security Checklist

- [ ] Change default database credentials
- [ ] Set strong JWT secret
- [ ] Update APP_KEY
- [ ] Configure proper file permissions
- [ ] Enable HTTPS in production
- [ ] Set up proper backup strategy
- [ ] Configure firewall rules

## 📞 Support

If you encounter issues:

1. **Check logs**: `backend/storage/logs/laravel.log`
2. **Browser console**: Check for JavaScript errors
3. **Database**: Verify connection and data integrity
4. **Network**: Check API endpoints are accessible

### Quick Health Check Commands
```bash
# Backend health
cd backend && php artisan about

# Database health
php artisan migrate:status

# Frontend health
cd frontend && npm run build

# Workflow health
php setup_workflow_fix.php
```

## 🎉 Success Indicators

✅ **Migration Complete** when you see:
- All tables created successfully
- No migration errors
- Workflow fix script shows "✅ All fixes applied!"
- Frontend loads without errors
- Complete errand workflow works end-to-end

---

**🎯 You're all set!** Your ErrandsExpress application should now be running perfectly with the corrected workflow. 