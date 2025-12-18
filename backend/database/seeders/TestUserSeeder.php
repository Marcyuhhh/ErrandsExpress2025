<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

class TestUserSeeder extends Seeder
{
    public function run()
    {
        // Create a test user if it doesn't exist
        $user = User::firstOrCreate(
            ['email' => 'test@example.com'],
            [
                'name' => 'Test User',
                'firstname' => 'Test',
                'lastname' => 'User',
                'middle_initial' => '',
                'email' => 'test@example.com',
                'password' => Hash::make('password123'),
                'birthdate' => '1990-01-15',
                'school_id_no' => 'TEST123',
                'profile_picture' => null,
                'verification_image' => 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
                'is_verified' => true, // Make user verified so they can login
                'is_admin' => false,
            ]
        );

        echo "Test user created/updated: " . $user->email . "\n";
        echo "Password: password123\n";
    }
} 