<?php

/**
 * ErrandsExpress Database Setup Script
 * 
 * This script helps set up the database and run migrations safely
 */

require_once __DIR__ . '/vendor/autoload.php';

// Load Laravel
$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Artisan;

echo "🗄️  ErrandsExpress Database Setup\n";
echo "==================================\n\n";

// Check if .env exists
if (!file_exists('.env')) {
    echo "❌ Error: .env file not found!\n";
    echo "Please copy .env.example to .env and configure your database settings.\n";
    exit(1);
}

// Load environment variables
$dotenv = Dotenv\Dotenv::createImmutable(__DIR__);
$dotenv->load();

$dbHost = $_ENV['DB_HOST'] ?? '127.0.0.1';
$dbPort = $_ENV['DB_PORT'] ?? '3306';
$dbDatabase = $_ENV['DB_DATABASE'] ?? 'errands_express';
$dbUsername = $_ENV['DB_USERNAME'] ?? 'root';
$dbPassword = $_ENV['DB_PASSWORD'] ?? '';

echo "📋 Database Configuration:\n";
echo "  Host: {$dbHost}:{$dbPort}\n";
echo "  Database: {$dbDatabase}\n";
echo "  Username: {$dbUsername}\n";
echo "  Password: " . (empty($dbPassword) ? 'None' : str_repeat('*', strlen($dbPassword))) . "\n\n";

try {
    echo "🔍 Step 1: Testing MySQL connection...\n";
    
    // Test connection without database
    $pdo = new PDO("mysql:host={$dbHost};port={$dbPort}", $dbUsername, $dbPassword);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    echo "✅ MySQL connection successful!\n\n";

    echo "🗄️  Step 2: Checking/Creating database...\n";
    
    // Check if database exists
    $result = $pdo->query("SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = '{$dbDatabase}'");
    $databaseExists = $result->rowCount() > 0;
    
    if ($databaseExists) {
        echo "✅ Database '{$dbDatabase}' already exists.\n";
        
        // Ask user what to do
        echo "\nWhat would you like to do?\n";
        echo "1. Use existing database (may have data conflicts)\n";
        echo "2. Drop and recreate database (DESTROYS ALL DATA)\n";
        echo "3. Exit and backup manually\n";
        echo "Choose option (1-3): ";
        
        $handle = fopen("php://stdin", "r");
        $choice = trim(fgets($handle));
        fclose($handle);
        
        switch ($choice) {
            case '1':
                echo "Using existing database...\n";
                break;
            case '2':
                echo "⚠️  WARNING: This will DESTROY ALL DATA in '{$dbDatabase}'!\n";
                echo "Type 'YES' to confirm: ";
                $handle = fopen("php://stdin", "r");
                $confirm = trim(fgets($handle));
                fclose($handle);
                
                if ($confirm === 'YES') {
                    $pdo->exec("DROP DATABASE IF EXISTS `{$dbDatabase}`");
                    $pdo->exec("CREATE DATABASE `{$dbDatabase}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
                    echo "✅ Database recreated successfully!\n";
                } else {
                    echo "❌ Operation cancelled.\n";
                    exit(1);
                }
                break;
            case '3':
                echo "Please backup your database manually and run this script again.\n";
                echo "Backup command: mysqldump -u {$dbUsername} -p {$dbDatabase} > backup.sql\n";
                exit(0);
            default:
                echo "❌ Invalid choice. Exiting.\n";
                exit(1);
        }
    } else {
        // Create database
        $pdo->exec("CREATE DATABASE `{$dbDatabase}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
        echo "✅ Database '{$dbDatabase}' created successfully!\n";
    }

    echo "\n🔧 Step 3: Testing Laravel database connection...\n";
    
    // Test Laravel connection
    DB::connection()->getPdo();
    echo "✅ Laravel database connection successful!\n\n";

    echo "📊 Step 4: Running migrations...\n";
    
    // Check current migration status
    try {
        $migrationStatus = Artisan::call('migrate:status');
        echo "Current migration status:\n";
        echo Artisan::output();
    } catch (Exception $e) {
        echo "No migrations table found (fresh installation).\n";
    }

    echo "\nMigration options:\n";
    echo "1. Fresh migration (recommended for new setups)\n";
    echo "2. Regular migration (for existing setups)\n";
    echo "3. Skip migrations\n";
    echo "Choose option (1-3): ";
    
    $handle = fopen("php://stdin", "r");
    $migrationChoice = trim(fgets($handle));
    fclose($handle);
    
    switch ($migrationChoice) {
        case '1':
            echo "Running fresh migration...\n";
            Artisan::call('migrate:fresh', ['--force' => true]);
            echo Artisan::output();
            echo "✅ Fresh migration completed!\n";
            break;
        case '2':
            echo "Running regular migration...\n";
            Artisan::call('migrate', ['--force' => true]);
            echo Artisan::output();
            echo "✅ Migration completed!\n";
            break;
        case '3':
            echo "Skipping migrations...\n";
            break;
        default:
            echo "❌ Invalid choice. Skipping migrations.\n";
    }

    echo "\n🔧 Step 5: Running workflow fix...\n";
    
    // Run workflow fix if it exists
    if (file_exists('setup_workflow_fix.php')) {
        include 'setup_workflow_fix.php';
    } else {
        echo "⚠️  Workflow fix script not found, skipping...\n";
    }

    echo "\n📊 Step 6: Final verification...\n";
    
    // Check tables
    $tables = DB::select('SHOW TABLES');
    $tableCount = count($tables);
    echo "✅ Found {$tableCount} tables in database.\n";
    
    if ($tableCount > 0) {
        echo "Tables created:\n";
        foreach ($tables as $table) {
            $tableName = array_values((array) $table)[0];
            echo "  - {$tableName}\n";
        }
    }

    // Check migration status
    echo "\n📋 Final migration status:\n";
    Artisan::call('migrate:status');
    echo Artisan::output();

    echo "\n🎉 Database setup completed successfully!\n";
    echo "========================================\n\n";
    
    echo "✅ Next steps:\n";
    echo "1. Start the backend server: php artisan serve\n";
    echo "2. Setup the frontend (see COMPLETE_SETUP_GUIDE.md)\n";
    echo "3. Test the complete workflow\n\n";

} catch (PDOException $e) {
    echo "❌ Database connection failed!\n";
    echo "Error: " . $e->getMessage() . "\n\n";
    
    echo "Common solutions:\n";
    echo "1. Make sure MySQL/MariaDB is running\n";
    echo "2. Check your database credentials in .env file\n";
    echo "3. Ensure the database user has proper permissions\n";
    echo "4. Try connecting manually: mysql -u {$dbUsername} -p\n\n";
    
    exit(1);
} catch (Exception $e) {
    echo "❌ An error occurred!\n";
    echo "Error: " . $e->getMessage() . "\n";
    echo "Stack trace:\n" . $e->getTraceAsString() . "\n\n";
    exit(1);
}

echo "✨ Database setup script completed!\n";
?> 