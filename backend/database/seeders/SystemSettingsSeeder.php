<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\SystemSetting;

class SystemSettingsSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $settings = [
            [
                'key' => 'gcash_number',
                'value' => '09123456783',
                'description' => 'GCash phone number for balance payments',
                'type' => 'string',
            ],
            [
                'key' => 'gcash_account_name',
                'value' => 'Errands Express System',
                'description' => 'GCash account name for balance payments',
                'type' => 'string',
            ],
        ];

        foreach ($settings as $setting) {
            SystemSetting::updateOrCreate(
                ['key' => $setting['key']],
                $setting
            );
        }
    }
} 