<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\RunnerBalance;
use App\Models\Notification;
use App\Models\User;

class SendBalanceNotifications extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'balance:send-notifications';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Send balance payment notifications to runners based on 5-day payment schedule';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Checking runner balances for notifications...');

        // Get all runner balances that have outstanding amounts
        $balances = RunnerBalance::with('runner')
            ->where('current_balance', '>', 0)
            ->whereNotNull('balance_started_at')
            ->get();

        $remindersSent = 0;
        $warningsSent = 0;
        $overdueSent = 0;

        foreach ($balances as $balance) {
            $daysElapsed = $balance->balance_started_at->diffInDays(now());

            // Send reminder notification (before 5 days - at 4 days)
            if ($balance->needsReminder()) {
                $this->sendReminderNotification($balance);
                $balance->update(['reminder_sent' => true]);
                $remindersSent++;
                $this->info("Reminder sent to {$balance->runner->firstname} {$balance->runner->lastname}");
            }

            // Send payment due notification (exactly at 5 days)
            if ($balance->paymentDue() && !$balance->reminder_sent) {
                $this->sendPaymentDueNotification($balance);
                $balance->update(['reminder_sent' => true]);
                $remindersSent++;
                $this->info("Payment due notification sent to {$balance->runner->firstname} {$balance->runner->lastname}");
            }

            // Send warning notification (after 5 days - overdue)
            if ($balance->needsWarning()) {
                $this->sendWarningNotification($balance);
                $balance->update(['warning_sent' => true]);
                $warningsSent++;
                $this->warn("Warning sent to {$balance->runner->firstname} {$balance->runner->lastname} - OVERDUE");
            }

            // Send critical overdue notification (after 7+ days)
            if ($daysElapsed > 7 && $balance->warning_sent) {
                $this->sendOverdueNotification($balance);
                $overdueSent++;
                $this->error("Critical overdue notification sent to {$balance->runner->firstname} {$balance->runner->lastname}");
            }
        }

        $this->info("Notifications sent: {$remindersSent} reminders, {$warningsSent} warnings, {$overdueSent} overdue notices");
        
        return Command::SUCCESS;
    }

    /**
     * Send reminder notification (4 days)
     */
    private function sendReminderNotification(RunnerBalance $balance)
    {
        Notification::create([
            'user_id' => $balance->runner_id,
            'type' => 'balance_payment_reminder',
            'title' => '💰 Payment Reminder',
            'message' => "Your errands balance of ₱" . number_format($balance->current_balance, 2) . " is due for payment tomorrow (5-day limit). Please pay through GCash to avoid penalties.",
            'expires_at' => now()->addDays(7),
        ]);
    }

    /**
     * Send payment due notification (5 days)
     */
    private function sendPaymentDueNotification(RunnerBalance $balance)
    {
        Notification::create([
            'user_id' => $balance->runner_id,
            'type' => 'balance_payment_due',
            'title' => '⏰ Payment Due Today',
            'message' => "Your errands balance of ₱" . number_format($balance->current_balance, 2) . " is due for payment TODAY (5-day limit reached). Please pay immediately through GCash.",
            'expires_at' => now()->addDays(7),
        ]);
    }

    /**
     * Send warning notification (6+ days - overdue)
     */
    private function sendWarningNotification(RunnerBalance $balance)
    {
        $daysOverdue = $balance->balance_started_at->diffInDays(now()) - 5;
        
        Notification::create([
            'user_id' => $balance->runner_id,
            'type' => 'balance_payment_warning',
            'title' => '⚠️ PAYMENT OVERDUE',
            'message' => "WARNING: Your errands balance of ₱" . number_format($balance->current_balance, 2) . " is now {$daysOverdue} day(s) OVERDUE. Pay immediately to avoid account restrictions.",
            'expires_at' => now()->addDays(7),
        ]);
    }

    /**
     * Send critical overdue notification (7+ days)
     */
    private function sendOverdueNotification(RunnerBalance $balance)
    {
        $daysOverdue = $balance->balance_started_at->diffInDays(now()) - 5;
        
        Notification::create([
            'user_id' => $balance->runner_id,
            'type' => 'balance_payment_critical',
            'title' => '🚨 CRITICAL: Payment Required',
            'message' => "URGENT: Your errands balance of ₱" . number_format($balance->current_balance, 2) . " is {$daysOverdue} days OVERDUE. Your account may be restricted until payment is made. Pay NOW through GCash.",
            'expires_at' => now()->addDays(10),
        ]);
    }
}
