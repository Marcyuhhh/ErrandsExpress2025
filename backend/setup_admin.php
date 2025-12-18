<?php

require_once 'vendor/autoload.php';

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Bootstrap\LoadEnvironmentVariables;
use Illuminate\Foundation\Bootstrap\LoadConfiguration;
use Illuminate\Foundation\Bootstrap\HandleExceptions;
use Illuminate\Foundation\Bootstrap\RegisterFacades;
use Illuminate\Foundation\Bootstrap\RegisterProviders;
use Illuminate\Foundation\Bootstrap\BootProviders;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

// Create Laravel app instance
$app = new Application(realpath(__DIR__));

// Bootstrap the application
$app->bootstrapWith([
    LoadEnvironmentVariables::class,
    LoadConfiguration::class,
    HandleExceptions::class,
    RegisterFacades::class,
    RegisterProviders::class,
    BootProviders::class,
]);

echo "Setting up Errands Express Admin User...\n";

try {
    // Check if admin already exists
    $existingAdmin = User::where('email', 'admin@errandsexpress.com')->first();
    
    if ($existingAdmin) {
        echo "Admin user already exists!\n";
        echo "Email: admin@errandsexpress.com\n";
        echo "You can use this account to access the admin panel.\n";
    } else {
        // Create admin user
        $admin = User::create([
            'name' => 'System Administrator',
            'firstname' => 'System',
            'lastname' => 'Administrator',
            'email' => 'admin@errandsexpress.com',
            'password' => Hash::make('admin123456'), // Default password
            'birthdate' => '1990-01-01',
            'school_id_no' => 'ADMIN001',
            'is_admin' => true,
            'is_verified' => true,
        ]);

        echo "✅ Admin user created successfully!\n";
        echo "Email: admin@errandsexpress.com\n";
        echo "Password: admin123456\n";
        echo "Please change the password after first login.\n";
    }

    echo "\nSetup completed successfully!\n";
    echo "You can now start the application and login as admin.\n";
    
} catch (Exception $e) {
    echo "❌ Error creating admin user: " . $e->getMessage() . "\n";
    echo "Make sure the database is properly configured and migrated.\n";
} 