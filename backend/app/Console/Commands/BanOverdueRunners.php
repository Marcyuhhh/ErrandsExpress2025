<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\RunnerBalance;
use App\Models\User;
use App\Models\Notification;

class BanOverdueRunners extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'runners:ban-overdue';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Ban runners with overdue balance payments (more than 5 days)';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Checking for overdue runners...');

        // Get all runner balances that are overdue (more than 5 days)
        $overdueBalances = RunnerBalance::with('runner')
            ->where('current_balance', '>', 0)
            ->where('balance_started_at', '<=', now()->subDays(5))
            ->whereHas('runner', function($query) {
                $query->where('is_banned', false);
            })
            ->get();

        $bannedCount = 0;

        foreach ($overdueBalances as $balance) {
            $runner = $balance->runner;
            $daysPastDue = $balance->balance_started_at->diffInDays(now());

            if ($daysPastDue > 5) {
                // Ban the runner
                $runner->update([
                    'is_banned' => true,
                    'banned_at' => now(),
                    'ban_reason' => 'Overdue balance payment - ' . $daysPastDue . ' days past due'
                ]);

                // Update balance status
                $balance->update(['status' => 'payment_overdue']);

                // Create notification
                Notification::create([
                    'user_id' => $runner->id,
                    'type' => 'account_banned',
                    'title' => 'Account Permanently Banned',
                    'message' => 'Your account has been permanently banned due to overdue balance payment of ₱' . number_format($balance->current_balance, 2) . '. Payment was due ' . $daysPastDue . ' days ago.',
                    'expires_at' => now()->addDays(30),
                ]);

                $this->warn("Banned runner: {$runner->firstname} {$runner->lastname} (ID: {$runner->id}) - {$daysPastDue} days overdue");
                $bannedCount++;
            }
        }

        if ($bannedCount > 0) {
            $this->info("Successfully banned {$bannedCount} overdue runners.");
        } else {
            $this->info('No overdue runners found.');
        }

        return 0;
    }
}
