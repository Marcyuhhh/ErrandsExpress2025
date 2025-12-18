<?php

namespace App\Http\Controllers;

use App\Models\Notification;
use Illuminate\Http\Request;
use Tymon\JWTAuth\Facades\JWTAuth;

class NotificationController extends Controller
{
    // Get user's notifications
    public function index()
    {
        $user = JWTAuth::parseToken()->authenticate();

        $notifications = Notification::with(['post'])
            ->where('user_id', $user->id)
            ->active() // Only get non-expired notifications
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($notifications);
    }

    // Get runner-specific notifications
    public function getRunnerNotifications()
    {
        $user = JWTAuth::parseToken()->authenticate();

        $notifications = Notification::with(['post'])
            ->where('user_id', $user->id)
            ->whereIn('type', ['task_assigned', 'task_completed', 'payment_received', 'task_cancelled', 'new_task_available'])
            ->active() // Only get non-expired notifications
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($notifications);
    }

    // Mark notification as read
    public function markAsRead($id)
    {
        $user = JWTAuth::parseToken()->authenticate();

        $notification = Notification::where('id', $id)
            ->where('user_id', $user->id)
            ->firstOrFail();

        $notification->is_read = true;
        $notification->save();

        return response()->json([
            'message' => 'Notification marked as read',
            'notification' => $notification
        ]);
    }

    // Mark all notifications as read
    public function markAllAsRead()
    {
        $user = JWTAuth::parseToken()->authenticate();

        Notification::where('user_id', $user->id)
            ->where('is_read', false)
            ->update(['is_read' => true]);

        return response()->json(['message' => 'All notifications marked as read']);
    }

    // Get unread notifications count
    public function getUnreadCount()
    {
        $user = JWTAuth::parseToken()->authenticate();

        $count = Notification::where('user_id', $user->id)
            ->unread()
            ->active()
            ->count();

        return response()->json(['unread_count' => $count]);
    }

    // Delete expired notifications (can be called via cron job)
    public function deleteExpired()
    {
        $deletedCount = Notification::where('expires_at', '<', now())->delete();

        return response()->json([
            'message' => 'Expired notifications deleted',
            'deleted_count' => $deletedCount
        ]);
    }
} 