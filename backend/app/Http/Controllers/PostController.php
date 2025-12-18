<?php

namespace App\Http\Controllers;

use App\Models\Post;
use App\Models\User;
use App\Models\Notification;
use App\Models\Message;
use Illuminate\Http\Request;
use Tymon\JWTAuth\Facades\JWTAuth;

class PostController extends Controller
{
    // Get all posts with user information, newest first
    public function index()
    {
        $posts = Post::with(['user', 'runner'])
            ->orderBy('created_at', 'desc')
            ->get();
            
        return response()->json($posts);
    }

    // Get posts for runner mode (exclude user's own posts)
    public function getRunnerPosts()
    {
        $user = JWTAuth::parseToken()->authenticate();
        
        $posts = Post::with(['user'])
            ->where('status', 'pending')
            ->where('user_id', '!=', $user->id) // Exclude user's own posts
            ->orderBy('created_at', 'desc')
            ->get();
            
        return response()->json($posts);
    }

    // Create a new post with proper user authentication
    public function store(Request $request)
    {
        $user = JWTAuth::parseToken()->authenticate();

        try {
            $validated = $request->validate([
                'content' => 'required|string',
                'deadline_date' => 'required|date_format:Y-m-d',
                'deadline_time' => 'required|date_format:H:i:s',
                'destination' => 'required|string',
                'image_url' => 'nullable|string|max:4294967295', // Max size for LONGTEXT
            ]);

            // Additional validation for base64 image
            if ($validated['image_url']) {
                // Check if it's a valid base64 image
                if (!preg_match('/^data:image\/(jpeg|jpg|png|gif|webp);base64,/', $validated['image_url'])) {
                    return response()->json([
                        'error' => 'Invalid image format',
                        'message' => 'Image must be a valid base64 encoded image'
                    ], 422);
                }

                // Check size of base64 string (approximate file size)
                $imageSize = strlen($validated['image_url']);
                if ($imageSize > 10 * 1024 * 1024) { // 10MB limit
                    return response()->json([
                        'error' => 'Image too large',
                        'message' => 'Image size should be less than 10MB after compression'
                    ], 422);
                }
            }

            // Add the authenticated user's ID to the post
            $validated['user_id'] = $user->id;

            $post = Post::create($validated);

            // Load the user relationship for the response
            $post->load('user');

            return response()->json([
                'message' => 'Post created successfully',
                'post' => $post
            ], 201);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'error' => 'Validation failed',
                'errors' => $e->errors(),
                'received_data' => $request->all()
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to create post',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    // Delete a post by ID (only by the creator)
    public function destroy($id)
    {
        $user = JWTAuth::parseToken()->authenticate();
        $post = Post::findOrFail($id);

        // Check if the user is the creator of the post
        if ($post->user_id !== $user->id) {
            return response()->json(['error' => 'Unauthorized to delete this post'], 403);
        }

        $post->delete();

        return response()->json(['message' => 'Post deleted successfully']);
    }

    // Mark a post as accepted by a runner
    public function accept(Request $request, $id)
    {
        $runner = JWTAuth::parseToken()->authenticate();
        $post = Post::findOrFail($id);

        // Check if the runner is not the creator of the post
        if ($post->user_id === $runner->id) {
            return response()->json(['error' => 'You cannot cater your own post'], 403);
        }

        // Check if post is still pending
        if ($post->status !== 'pending') {
            return response()->json(['error' => 'Post is not available'], 400);
        }

        $post->status = 'accepted';
        $post->runner_id = $runner->id;
        $post->in_inbox = true;
        $post->save();

        // Create notification for the post creator
        Notification::create([
            'user_id' => $post->user_id,
            'post_id' => $post->id,
            'type' => 'post_catered',
            'title' => 'Your Post Was Catered!',
            'message' => $runner->firstname . ' ' . $runner->lastname . ' has accepted your errand request.',
            'expires_at' => now()->addHours(24), // Expire after 24 hours
        ]);

        // Create initial message thread
        Message::create([
            'post_id' => $post->id,
            'sender_id' => $runner->id,
            'receiver_id' => $post->user_id,
            'message' => 'Hi! I have accepted your errand request. Let me know if you have any questions.',
            'expires_at' => now()->addHours(24),
        ]);

        $post->load(['user', 'runner']);

        return response()->json([
            'message' => 'Post accepted successfully',
            'post' => $post
        ]);
    }

    // Mark a post as completed by the runner
    public function complete($id)
    {
        $runner = JWTAuth::parseToken()->authenticate();
        $post = Post::findOrFail($id);

        // Check if the user is the assigned runner
        if ($post->runner_id !== $runner->id) {
            return response()->json(['error' => 'Unauthorized to complete this post'], 403);
        }

        // Check if payment has been verified by customer
        $paymentTransaction = \App\Models\BalanceTransaction::where('runner_id', $runner->id)
            ->where('post_id', $post->id)
            ->where('type', 'errand_payment')
            ->first();

        if (!$paymentTransaction) {
            return response()->json([
                'error' => 'Payment amount must be provided before completing the errand',
                'message' => 'Please provide the payment amount and proof of purchase first.'
            ], 400);
        }

        if (!$paymentTransaction->payment_verified) {
            return response()->json([
                'error' => 'Payment must be verified by customer before completion',
                'message' => 'The customer must verify the payment amount before you can mark this errand as completed.'
            ], 400);
        }

        // NEW REQUIREMENT: Check if payment has been approved by admin
        if ($paymentTransaction->status !== 'approved') {
            return response()->json([
                'error' => 'Payment must be approved by admin before completion',
                'message' => 'The admin must approve the payment before you can mark this errand as completed.'
            ], 400);
        }

        $post->status = 'runner_completed';
        $post->completed_at = now();
        $post->save();

        // Create notification for the post creator
        Notification::create([
            'user_id' => $post->user_id,
            'post_id' => $post->id,
            'type' => 'post_completed',
            'title' => 'Errand Completed!',
            'message' => 'Your errand has been marked as completed by the runner.',
            'expires_at' => now()->addHours(24),
        ]);

        $post->load(['user', 'runner']);

        return response()->json([
            'message' => 'Post marked as completed',
            'post' => $post
        ]);
    }

    // Confirm completion by the customer (final step - archives the errand instead of deleting)
    public function confirmComplete($id)
    {
        $customer = JWTAuth::parseToken()->authenticate();
        $post = Post::findOrFail($id);

        // Check if the user is the creator of the post
        if ($post->user_id !== $customer->id) {
            return response()->json(['error' => 'Unauthorized to confirm completion for this post'], 403);
        }

        // Check if post is in runner_completed status
        if ($post->status !== 'runner_completed') {
            return response()->json(['error' => 'Post is not ready for completion confirmation'], 400);
        }

        // Before archiving, ensure all necessary operations are completed
        if ($post->runner_id) {
            $runner = User::find($post->runner_id);
            if ($runner) {
                // Award 1 point to the runner for completing the errand
                $runner->increment('points', 1);
                
                // Create final notification for runner about successful completion
                Notification::create([
                    'user_id' => $post->runner_id,
                    'post_id' => $post->id,
                    'type' => 'errand_completed_confirmed',
                    'title' => 'Errand Completed & Confirmed! ✅',
                    'message' => 'Customer has confirmed the errand completion. You earned 1 point!',
                    'expires_at' => now()->addDays(7),
                ]);
            }
        }

        // Store post data for the response
        $postData = [
            'id' => $post->id,
            'content' => $post->content,
            'destination' => $post->destination,
            'runner_name' => $post->runner ? ($post->runner->firstname . ' ' . $post->runner->lastname) : 'Unknown'
        ];

        // The payment should already be approved by admin at this point
        $approvedTransaction = \App\Models\BalanceTransaction::where('post_id', $post->id)
            ->where('type', 'errand_payment')
            ->where('status', 'approved')
            ->first();

        if (!$approvedTransaction) {
            // This shouldn't happen if the flow is followed correctly
            \Log::warning('Customer confirming completion but no approved transaction found', [
                'post_id' => $post->id,
                'customer_id' => $customer->id
            ]);
        }

        // Archive the errand instead of deleting it (so it can be counted in stats)
        $post->update([
            'status' => 'completed',
            'archived' => true,
            'confirmed_at' => now()
        ]);

        return response()->json([
            'message' => 'Errand completion confirmed and errand archived successfully',
            'post_data' => $postData,
            'process_completed' => true
        ]);
    }

    // Get user's own posts (exclude archived ones from display)
    public function getUserPosts()
    {
        $user = JWTAuth::parseToken()->authenticate();
        
        $posts = Post::with(['user', 'runner'])
            ->where('user_id', $user->id)
            ->where('archived', false) // Exclude archived posts from home page display
            ->orderBy('created_at', 'desc')
            ->get();
            
        return response()->json($posts);
    }

    // Get posts assigned to user as runner (exclude archived ones from display)
    public function getRunnerAcceptedPosts()
    {
        $user = JWTAuth::parseToken()->authenticate();
        
        $posts = Post::with(['user'])
            ->where('runner_id', $user->id)
            ->where('archived', false) // Exclude archived posts from home page display
            ->orderBy('created_at', 'desc')
            ->get();
            
        return response()->json($posts);
    }

    // Get user stats (for customer dashboard)
    public function getUserStats()
    {
        $user = JWTAuth::parseToken()->authenticate();
        
        // Count completed errands by counting archived posts where user was the customer
        $completedAsCustomer = Post::where('user_id', $user->id)
            ->where('archived', true)
            ->where('status', 'completed')
            ->count();
            
        // Note: We don't use errand_completed_confirmed notifications for customer stats
        // because those notifications are sent to runners, not customers
        
        \Log::info('Customer stats calculated', [
            'user_id' => $user->id,
            'completed_as_customer' => $completedAsCustomer,
            'points' => $user->points ?? 0
        ]);
        
        return response()->json([
            'completed_errands' => $completedAsCustomer,
            'points' => $user->points ?? 0
        ]);
    }

    // Get runner stats (for runner dashboard)
    public function getRunnerStats()
    {
        $user = JWTAuth::parseToken()->authenticate();
        
        // Count completed errands by counting archived posts where user was the runner
        $completedAsRunner = Post::where('runner_id', $user->id)
            ->where('archived', true)
            ->where('status', 'completed')
            ->count();
            
        // Alternative count by counting notifications of completion confirmation (backup method)
        $completedByNotifications = \App\Models\Notification::where('user_id', $user->id)
            ->where('type', 'errand_completed_confirmed')
            ->count();
            
        // Use the higher count to ensure accuracy (archived posts should be primary method)
        $completedCount = max($completedAsRunner, $completedByNotifications);
            
        \Log::info('Runner stats calculated', [
            'user_id' => $user->id,
            'completed_as_runner' => $completedAsRunner,
            'completed_by_notifications' => $completedByNotifications,
            'final_completed_count' => $completedCount,
            'points' => $user->points ?? 0
        ]);
            
        return response()->json([
            'completed_errands' => $completedCount,
            'points' => $user->points ?? 0
        ]);
    }
}
