<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Notification;
use App\Models\Message;
use Carbon\Carbon;

class CleanupExpiredData extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'cleanup:expired';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Cleanup expired notifications and messages after 24 hours';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Starting cleanup of expired data...');

        // Clean up expired notifications
        $expiredNotifications = Notification::where('expires_at', '<', Carbon::now())->count();
        Notification::where('expires_at', '<', Carbon::now())->delete();
        $this->info("Deleted {$expiredNotifications} expired notifications");

        // Clean up expired messages
        $expiredMessages = Message::where('expires_at', '<', Carbon::now())->count();
        Message::where('expires_at', '<', Carbon::now())->delete();
        $this->info("Deleted {$expiredMessages} expired messages");

        // Clean up completed post messages/notifications after 24 hours
        $completedPosts = \App\Models\Post::where('status', 'completed')
            ->where('completed_at', '<', Carbon::now()->subHours(24))
            ->pluck('id');

        if ($completedPosts->count() > 0) {
            $completedNotifications = Notification::whereIn('post_id', $completedPosts)->count();
            Notification::whereIn('post_id', $completedPosts)->delete();
            
            $completedMessages = Message::whereIn('post_id', $completedPosts)->count();
            Message::whereIn('post_id', $completedPosts)->delete();
            
            $this->info("Deleted {$completedNotifications} notifications and {$completedMessages} messages for completed posts");
        }

        $this->info('Cleanup completed successfully!');
    }
} 