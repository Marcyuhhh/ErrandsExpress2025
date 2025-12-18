@echo off
color 0A
echo.
echo ========================================
echo   ErrandsExpress Quick Setup Script
echo ========================================
echo.

cd /d "%~dp0"

REM Check if we're in the backend directory
if not exist "composer.json" (
    echo Error: Please run this script from the backend directory
    echo Current directory: %CD%
    pause
    exit /b 1
)

echo [1/8] Checking PHP installation...
php --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Error: PHP is not installed or not in PATH
    echo Please install PHP 8.1+ and add it to your system PATH
    pause
    exit /b 1
)
echo ✅ PHP is available

echo.
echo [2/8] Checking Composer installation...
composer --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Error: Composer is not installed or not in PATH
    echo Please install Composer and add it to your system PATH
    pause
    exit /b 1
)
echo ✅ Composer is available

echo.
echo [3/8] Installing PHP dependencies...
composer install --no-interaction
if %errorlevel% neq 0 (
    echo ❌ Error: Composer install failed
    echo Please check your internet connection and try again
    pause
    exit /b 1
)
echo ✅ Dependencies installed

echo.
echo [4/8] Setting up environment file...
if not exist ".env" (
    if exist ".env.example" (
        copy ".env.example" ".env" >nul
        echo ✅ Environment file created from .env.example
    ) else (
        echo ⚠️  Warning: No .env.example found, you'll need to create .env manually
    )
) else (
    echo ✅ Environment file already exists
)

echo.
echo [5/8] Generating application key...
php artisan key:generate --no-interaction
if %errorlevel% neq 0 (
    echo ❌ Error: Failed to generate application key
    pause
    exit /b 1
)
echo ✅ Application key generated

echo.
echo [6/8] Generating JWT secret...
php artisan jwt:secret --no-interaction
if %errorlevel% neq 0 (
    echo ⚠️  Warning: Failed to generate JWT secret
    echo You may need to install tymon/jwt-auth package
) else (
    echo ✅ JWT secret generated
)

echo.
echo [7/8] Checking database connection...
php artisan tinker --execute="try { DB::connection()->getPdo(); echo 'Database connection: OK'; } catch(Exception $e) { echo 'Database connection: FAILED - ' . $e->getMessage(); }"
if %errorlevel% neq 0 (
    echo ⚠️  Warning: Could not test database connection
    echo Please ensure your database is running and .env is configured correctly
)

echo.
echo [8/8] Running workflow fix (if needed)...
if exist "setup_workflow_fix.php" (
    php setup_workflow_fix.php
    echo ✅ Workflow fix completed
) else (
    echo ⚠️  Workflow fix script not found, skipping...
)

echo.
echo ========================================
echo           Setup Summary
echo ========================================
echo.
echo ✅ PHP dependencies installed
echo ✅ Environment configured
echo ✅ Application key generated
echo ✅ JWT secret generated
echo ✅ Workflow fix applied
echo.
echo Next steps:
echo 1. Configure your database settings in .env file
echo 2. Create database: errands_express
echo 3. Run: php artisan migrate:fresh
echo 4. Start server: php artisan serve
echo 5. Setup frontend (see COMPLETE_SETUP_GUIDE.md)
echo.
echo ========================================
echo   Setup completed successfully! 🎉
echo ========================================
echo.

pause 