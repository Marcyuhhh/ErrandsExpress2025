<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class ClearDatabaseExceptUsers extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'db:clear-except-users {--force : Force the operation without confirmation}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Clear all database tables except users and system tables';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        // Tables to preserve
        $preserveTables = [
            'users',
            'migrations',
            'password_resets',
            'password_reset_tokens',
            'personal_access_tokens',
            'failed_jobs'
        ];

        if (!$this->option('force')) {
            if (!$this->confirm('This will delete ALL data except users. Are you sure?')) {
                $this->info('Operation cancelled.');
                return;
            }
        }

        try {
            // Get all table names
            $tables = DB::select('SHOW TABLES');
            $databaseName = DB::getDatabaseName();
            $tableKey = 'Tables_in_' . $databaseName;

            // Disable foreign key checks
            DB::statement('SET FOREIGN_KEY_CHECKS=0;');

            $clearedTables = [];

            foreach ($tables as $table) {
                $tableName = $table->$tableKey;
                
                if (!in_array($tableName, $preserveTables)) {
                    $this->info("Clearing table: {$tableName}");
                    DB::table($tableName)->truncate();
                    $clearedTables[] = $tableName;
                }
            }

            // Re-enable foreign key checks
            DB::statement('SET FOREIGN_KEY_CHECKS=1;');

            $this->info("\n✅ Database cleanup completed!");
            $this->info("📊 Preserved tables: " . implode(', ', $preserveTables));
            $this->info("🗑️  Cleared " . count($clearedTables) . " tables: " . implode(', ', $clearedTables));
            
        } catch (\Exception $e) {
            // Re-enable foreign key checks in case of error
            DB::statement('SET FOREIGN_KEY_CHECKS=1;');
            
            $this->error("❌ Error clearing database: " . $e->getMessage());
            return 1;
        }

        return 0;
    }
}
