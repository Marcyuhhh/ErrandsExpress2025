<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

class AdminSeeder extends Seeder
{
    public function run()
    {
        // Create admin user
        User::firstOrCreate(
            ['email' => 'admin@errandsexpress.com'],
            [
                'name' => 'System Administrator',
                'firstname' => 'System',
                'lastname' => 'Administrator',
                'password' => Hash::make('admin123'),
                'is_admin' => true,
                'is_verified' => true,
                'birthdate' => '1990-01-01',
                'school_id_no' => 'ADMIN001',
            ]
        );

        echo "Admin user created with email: admin@errandsexpress.com and password: admin123\n";
    }
} 