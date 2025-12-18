<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\RunnerBalance;
use App\Models\Notification;

class CheckBalanceReminders extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'balance:check-reminders';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Check and send balance payment reminders to runners';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Checking runner balance reminders...');
        
        $balances = RunnerBalance::with('runner')
            ->where('current_balance', '>', 0)
            ->whereNotNull('balance_started_at')
            ->get();

        $reminderCount = 0;
        $paymentDueCount = 0;
        $warningCount = 0;
        $bannedCount = 0;

        foreach ($balances as $balance) {
            $daysSinceStart = $balance->balance_started_at->diffInDays(now());
            
            // Day 4: Send reminder before 5 days
            if ($balance->needsReminder()) {
                $this->sendNotification($balance, 'reminder');
                $balance->update(['reminder_sent' => true]);
                $reminderCount++;
            }
            
            // Day 5: Payment due notification
            elseif ($balance->paymentDue() && !$balance->warning_sent) {
                $this->sendNotification($balance, 'payment_due');
                $paymentDueCount++;
            }
            
            // Day 6+: Warning for overdue payment
            elseif ($balance->needsWarning()) {
                $this->sendNotification($balance, 'warning');
                $balance->update(['warning_sent' => true]);
                $warningCount++;
            }
            
            // Day 8+: Ban runner for excessive overdue
            elseif ($daysSinceStart > 7) {
                $this->banRunner($balance);
                $bannedCount++;
            }
        }

        $this->info("Reminders sent: {$reminderCount}, Payment due: {$paymentDueCount}, Warnings: {$warningCount}, Banned: {$bannedCount}");
        return 0;
    }

    private function sendNotification($balance, $type)
    {
        $messages = [
            'reminder' => [
                'title' => 'Payment Reminder',
                'message' => 'Your errands balance of ₱' . number_format($balance->current_balance, 2) . ' will be due in 1 day. Please pay within 24 hours to avoid penalties.'
            ],
            'payment_due' => [
                'title' => 'Payment Due Today - 5 Days Reached',
                'message' => 'Your errands balance of ₱' . number_format($balance->current_balance, 2) . ' is due today (5 days). Please pay immediately to avoid your account being marked as overdue.'
            ],
            'warning' => [
                'title' => 'Payment Overdue - Warning',
                'message' => 'Your errands balance of ₱' . number_format($balance->current_balance, 2) . ' is now overdue (exceeded 5 days). Please pay immediately to avoid account suspension.'
            ]
        ];

        $notification = $messages[$type];

        Notification::create([
            'user_id' => $balance->runner_id,
            'type' => 'balance_' . $type,
            'title' => $notification['title'],
            'message' => $notification['message'],
            'expires_at' => now()->addDays(7),
        ]);

        $this->info("Sent {$type} to runner: {$balance->runner->firstname} {$balance->runner->lastname}");
    }

    private function banRunner($balance)
    {
        $runner = $balance->runner;
        $daysPastDue = $balance->balance_started_at->diffInDays(now());

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
    }
}
