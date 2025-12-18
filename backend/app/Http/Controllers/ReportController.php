<?php

namespace App\Http\Controllers;

use App\Models\Report;
use App\Models\Post;
use App\Models\Notification;
use Illuminate\Http\Request;
use Tymon\JWTAuth\Facades\JWTAuth;

class ReportController extends Controller
{
    // Create a new report
    public function store(Request $request)
    {
        $user = JWTAuth::parseToken()->authenticate();

        $validated = $request->validate([
            'post_id' => 'required|exists:posts,id',
            'reported_user_id' => 'required|exists:users,id',
            'type' => 'required|in:inappropriate_content,spam,harassment,fraud,other',
            'description' => 'nullable|string|max:1000',
        ]);

        // Check if user already reported this post
        $existingReport = Report::where('post_id', $validated['post_id'])
            ->where('reporter_id', $user->id)
            ->first();

        if ($existingReport) {
            return response()->json(['error' => 'You have already reported this post'], 400);
        }

        $report = Report::create([
            'post_id' => $validated['post_id'],
            'reporter_id' => $user->id,
            'reported_user_id' => $validated['reported_user_id'],
            'type' => $validated['type'],
            'description' => $validated['description'],
            'status' => 'pending',
        ]);

        // Mark the post as reported
        $post = Post::find($validated['post_id']);
        $post->is_reported = true;
        $post->save();

        return response()->json([
            'message' => 'Report submitted successfully',
            'report' => $report
        ], 201);
    }

    // Get all reports (admin only)
    public function index()
    {
        $admin = JWTAuth::parseToken()->authenticate();
        
        if (!$admin->is_admin) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $reports = Report::with(['post', 'reporter', 'reportedUser', 'reviewer'])
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($reports);
    }

    // Review a report (admin only)
    public function review(Request $request, $id)
    {
        $admin = JWTAuth::parseToken()->authenticate();
        
        if (!$admin->is_admin) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'status' => 'required|in:reviewed,resolved,dismissed',
            'action' => 'nullable|in:remove_post,warn_user,ban_user,no_action',
        ]);

        $report = Report::findOrFail($id);
        $report->status = $validated['status'];
        $report->reviewed_by = $admin->id;
        $report->reviewed_at = now();
        $report->save();

        // Handle actions based on admin decision
        if (isset($validated['action'])) {
            $post = $report->post;
            
            switch ($validated['action']) {
                case 'remove_post':
                    // Create notification for post owner before deleting
                    Notification::create([
                        'user_id' => $post->user_id,
                        'post_id' => $post->id,
                        'type' => 'post_removed',
                        'title' => 'Post Removed',
                        'message' => 'Your errand post has been removed due to a report. The post violated our community guidelines.',
                        'expires_at' => now()->addDays(7), // Keep notification for 7 days
                    ]);
                    
                    $post->delete();
                    break;
                case 'warn_user':
                    // Could implement warning system here
                    break;
                case 'ban_user':
                    // Could implement user banning here
                    break;
                case 'no_action':
                    // Reset report flag if no action taken
                    $post->is_reported = false;
                    $post->save();
                    break;
            }
        }

        return response()->json([
            'message' => 'Report reviewed successfully',
            'report' => $report
        ]);
    }

    // Get pending reports count (admin only)
    public function getPendingCount()
    {
        $admin = JWTAuth::parseToken()->authenticate();
        
        if (!$admin->is_admin) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $count = Report::where('status', 'pending')->count();

        return response()->json(['pending_reports' => $count]);
    }
} 