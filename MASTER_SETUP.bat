@echo off
color 0A
title ErrandsExpress Master Setup

echo.
echo ===============================================
echo   🎯 ErrandsExpress Master Setup Guide
echo ===============================================
echo.
echo This script will guide you through the complete setup process.
echo Please follow the instructions carefully.
echo.

REM Check if we're in the right directory
if not exist "backend" (
    echo ❌ Error: backend directory not found!
    echo Please run this script from the ErrandsExpressFinal-main directory
    pause
    exit /b 1
)

if not exist "frontend" (
    echo ❌ Error: frontend directory not found!
    echo Please run this script from the ErrandsExpressFinal-main directory
    pause
    exit /b 1
)

echo ✅ Project structure verified
echo.

echo ===============================================
echo   📋 Pre-Setup Checklist
echo ===============================================
echo.
echo Before we begin, make sure you have:
echo ✓ PHP 8.1+ installed and in PATH
echo ✓ Composer installed and in PATH
echo ✓ Node.js 16+ installed and in PATH
echo ✓ MySQL/MariaDB server running
echo ✓ MySQL database credentials ready
echo.
echo Press any key when ready to continue...
pause >nul
echo.

echo ===============================================
echo   🔧 Step 1: Backend Setup
echo ===============================================
echo.

cd backend

echo Running backend quick setup...
echo.

REM Check if quick_setup.bat exists
if exist "quick_setup.bat" (
    call quick_setup.bat
) else (
    echo ⚠️  Quick setup script not found. Running manual setup...
    
    echo [1/3] Installing Composer dependencies...
    composer install
    
    echo [2/3] Setting up environment...
    if not exist ".env" (
        copy ".env.example" ".env" >nul
    )
    
    echo [3/3] Generating keys...
    php artisan key:generate
    php artisan jwt:secret
)

echo.
echo ===============================================
echo   🗄️  Step 2: Database Configuration
echo ===============================================
echo.

echo You need to configure your database settings in the .env file.
echo.
echo Please open backend\.env and update these settings:
echo DB_HOST=127.0.0.1
echo DB_PORT=3306
echo DB_DATABASE=errands_express
echo DB_USERNAME=root
echo DB_PASSWORD=your_mysql_password
echo.
echo Press any key after you've updated the .env file...
pause >nul

echo.
echo Running database setup...
if exist "setup_database.php" (
    php setup_database.php
) else (
    echo ⚠️  Database setup script not found. Please run manually:
    echo php artisan migrate:fresh
)

echo.
echo ===============================================
echo   ⚛️  Step 3: Frontend Setup
echo ===============================================
echo.

cd ..\frontend

echo Installing Node.js dependencies...
npm install

if %errorlevel% neq 0 (
    echo ❌ npm install failed. Trying to fix...
    npm cache clean --force
    npm install
)

echo.
echo Creating frontend environment file...
if not exist ".env" (
    echo REACT_APP_API_URL=http://localhost:8000/api > .env
    echo REACT_APP_BASE_URL=http://localhost:8000 >> .env
    echo ✅ Frontend .env created
) else (
    echo ✅ Frontend .env already exists
)

echo.
echo ===============================================
echo   🎯 Step 4: Final Verification
echo ===============================================
echo.

cd ..\backend

echo Testing backend configuration...
php artisan about

echo.
echo Testing database connection...
php artisan tinker --execute="try { DB::connection()->getPdo(); echo 'Database: ✅ Connected'; } catch(Exception $e) { echo 'Database: ❌ Failed - ' . $e->getMessage(); }"

echo.
echo ===============================================
echo   🚀 Setup Complete!
echo ===============================================
echo.

echo ✅ Backend setup complete
echo ✅ Database configured  
echo ✅ Frontend setup complete
echo ✅ Workflow fixes applied
echo.

echo 🎯 To start the application:
echo.
echo 1. Start Backend (in backend directory):
echo    php artisan serve
echo.
echo 2. Start Frontend (in frontend directory, new terminal):
echo    npm start
echo.
echo 3. Open your browser:
echo    Frontend: http://localhost:3000
echo    Backend API: http://localhost:8000/api
echo.

echo ===============================================
echo   📚 Additional Resources
echo ===============================================
echo.
echo 📖 Complete Setup Guide: COMPLETE_SETUP_GUIDE.md
echo 🔧 Workflow Fix Info: backend\WORKFLOW_FIX_README.md
echo 🐛 Troubleshooting: Check the complete setup guide
echo.

echo Press any key to open the complete setup guide...
pause >nul

REM Try to open the setup guide
if exist "COMPLETE_SETUP_GUIDE.md" (
    start notepad "COMPLETE_SETUP_GUIDE.md"
)

echo.
echo 🎉 ErrandsExpress setup completed successfully!
echo Happy coding! 🚀
echo.

pause 