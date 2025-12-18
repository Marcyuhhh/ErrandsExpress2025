@echo off
echo Running ErrandsExpress Workflow Fix...
echo ====================================

cd /d "%~dp0"

REM Check if PHP is available
php --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Error: PHP is not installed or not in PATH
    echo Please install PHP or add it to your system PATH
    pause
    exit /b 1
)

REM Run the workflow fix script
echo Starting fix script...
php setup_workflow_fix.php

if %errorlevel% equ 0 (
    echo.
    echo ====================================
    echo ✅ Workflow fix completed successfully!
    echo ====================================
    echo.
    echo Your ErrandsExpress application should now work correctly.
    echo The errand completion workflow has been fixed.
    echo.
) else (
    echo.
    echo ====================================
    echo ❌ Workflow fix failed!
    echo ====================================
    echo.
    echo Please check the error messages above and try again.
    echo If the problem persists, contact support.
    echo.
)

pause 