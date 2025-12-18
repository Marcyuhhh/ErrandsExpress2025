<?php

// 1. Load Composer Autoloader
require __DIR__ . '/vendor/autoload.php';

// 2. Load the actual Laravel App (The correct Laravel 11 way)
$app = require_once __DIR__ . '/bootstrap/app.php';

// 3. Bootstrap the Console Kernel (This loads your Database, .env, and Facades)
$kernel = $app->make(\Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

// 4. Now we can safely use Models
use App\Models\User;
use Illuminate\Support\Facades\Hash;

echo "Setting up Errands Express Admin User...\n";

try {
    // Check if admin already exists
    $existingAdmin = User::where('email', 'admin@errandsexpress.com')->first();
    
    if ($existingAdmin) {
        echo "⚠️  Admin user already exists!\n";
        echo "   Email: admin@errandsexpress.com\n";
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
        echo "   Email: admin@errandsexpress.com\n";
        echo "   Password: admin123456\n";
    }

} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
    // We don't exit with error code 1 here to avoid stopping the deployment if this fails
}