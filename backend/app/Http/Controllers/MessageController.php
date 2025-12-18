<?php

namespace App\Http\Controllers;

use App\Models\Message;
use App\Models\Post;
use Illuminate\Http\Request;
use Tymon\JWTAuth\Facades\JWTAuth;

class MessageController extends Controller
{
    // Get user's messages (inbox)
    public function index()
    {
        $user = JWTAuth::parseToken()->authenticate();

        $messages = Message::with(['post', 'sender', 'receiver'])
            ->where(function ($query) use ($user) {
                $query->where('sender_id', $user->id)
                      ->orWhere('receiver_id', $user->id);
            })
            ->active() // Only get non-expired messages
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($messages);
    }

    // Get messages for a specific post
    public function getPostMessages($postId)
    {
        $user = JWTAuth::parseToken()->authenticate();

        // Get the post first
        $post = Post::findOrFail($postId);
        
        // Verify user has access to this post conversation
        $hasAccess = false;
        
        // Case 1: User is the post creator
        if ($post->user_id === $user->id) {
            $hasAccess = true;
        }
        // Case 2: User is the assigned runner
        elseif ($post->runner_id === $user->id) {
            $hasAccess = true;
        }
        // Case 3: For pending posts, check if user has sent messages (potential runner)
        elseif ($post->status === 'pending') {
            $userHasMessages = Message::where('post_id', $postId)
                ->where(function ($query) use ($user) {
                    $query->where('sender_id', $user->id)
                          ->orWhere('receiver_id', $user->id);
                })
                ->exists();
            
            if ($userHasMessages) {
                $hasAccess = true;
            }
        }
        
        if (!$hasAccess) {
            return response()->json(['error' => 'Unauthorized to view messages for this post'], 403);
        }

        $messages = Message::with(['sender', 'receiver'])
            ->where('post_id', $postId)
            ->active()
            ->orderBy('created_at', 'asc')
            ->get();

        return response()->json($messages);
    }

    // Send a message
    public function store(Request $request)
    {
        $user = JWTAuth::parseToken()->authenticate();

        // Debug logging
        \Log::info('Message creation request', [
            'user_id' => $user->id,
            'post_id' => $request->input('post_id'),
            'receiver_id' => $request->input('receiver_id')
        ]);

        $validated = $request->validate([
            'post_id' => 'required|exists:posts,id',
            'receiver_id' => 'required|exists:users,id',
            'message' => 'required|string|max:1000',
        ]);

        // Get the post first
        $post = Post::findOrFail($validated['post_id']);
        
        \Log::info('Post found', [
            'post_id' => $post->id,
            'post_user_id' => $post->user_id,
            'post_runner_id' => $post->runner_id,
            'post_status' => $post->status,
            'current_user_id' => $user->id,
            'receiver_id' => $validated['receiver_id']
        ]);

        // Verify user has access to this post conversation
        $hasAccess = false;
        
        // Case 1: User is the post creator
        if ($post->user_id === $user->id) {
            $hasAccess = true;
        }
        // Case 2: User is the assigned runner
        elseif ($post->runner_id === $user->id) {
            $hasAccess = true;
        }
        // Case 3: User is a potential runner contacting about a pending post
        elseif ($post->status === 'pending' && $post->user_id !== $user->id) {
            $hasAccess = true;
        }
        
        if (!$hasAccess) {
            return response()->json(['error' => 'Unauthorized to message about this post'], 403);
        }

        // Verify receiver is valid for this conversation
        $validReceiver = false;
        
        // If sender is post creator, receiver should be the runner (if assigned)
        if ($post->user_id === $user->id && $post->runner_id && $validated['receiver_id'] === $post->runner_id) {
            $validReceiver = true;
        }
        // If sender is the assigned runner, receiver should be post creator
        elseif ($post->runner_id === $user->id && $validated['receiver_id'] === $post->user_id) {
            $validReceiver = true;
        }
        // If it's a pending post and sender is potential runner, receiver should be post creator
        elseif ($post->status === 'pending' && $post->user_id !== $user->id && $validated['receiver_id'] === $post->user_id) {
            $validReceiver = true;
        }
        // If sender is post creator, allow replying to any user who has messaged about this post (for any status)
        elseif ($post->user_id === $user->id) {
            // Check if the receiver has previously sent messages about this post
            $hasExistingConversation = Message::where('post_id', $post->id)
                ->where('sender_id', $validated['receiver_id'])
                ->where('receiver_id', $user->id)
                ->exists();
            
            if ($hasExistingConversation) {
                $validReceiver = true;
            }
        }
        
        if (!$validReceiver) {
            \Log::warning('Invalid receiver for conversation', [
                'post_id' => $post->id,
                'post_user_id' => $post->user_id,
                'post_runner_id' => $post->runner_id,
                'post_status' => $post->status,
                'sender_id' => $user->id,
                'receiver_id' => $validated['receiver_id']
            ]);
            return response()->json(['error' => 'Invalid receiver for this conversation'], 400);
        }

        $message = Message::create([
            'post_id' => $validated['post_id'],
            'sender_id' => $user->id,
            'receiver_id' => $validated['receiver_id'],
            'message' => $validated['message'],
            'expires_at' => now()->addHours(24), // Messages expire after 24 hours
        ]);

        $message->load(['sender', 'receiver', 'post']);

        return response()->json([
            'message' => 'Message sent successfully',
            'data' => $message
        ], 201);
    }

    // Mark message as read
    public function markAsRead($id)
    {
        $user = JWTAuth::parseToken()->authenticate();

        $message = Message::where('id', $id)
            ->where('receiver_id', $user->id)
            ->firstOrFail();

        $message->is_read = true;
        $message->save();

        return response()->json([
            'message' => 'Message marked as read',
            'data' => $message
        ]);
    }

    // Get unread messages count
    public function getUnreadCount()
    {
        $user = JWTAuth::parseToken()->authenticate();

        $count = Message::where('receiver_id', $user->id)
            ->unread()
            ->active()
            ->count();

        return response()->json(['unread_count' => $count]);
    }

    // Get user conversations (exclude archived posts)
    public function getConversations()
    {
        $user = JWTAuth::parseToken()->authenticate();

        $conversations = Message::with(['post.user', 'post.runner', 'sender', 'receiver'])
            ->where(function ($query) use ($user) {
                $query->where('sender_id', $user->id)
                      ->orWhere('receiver_id', $user->id);
            })
            ->whereHas('post', function ($query) {
                $query->where('archived', false); // Exclude archived posts
            })
            ->active()
            ->get()
            ->groupBy('post_id')
            ->map(function ($messages) use ($user) {
                return [
                    'post' => $messages->first()->post,
                    'latest_message' => $messages->sortByDesc('created_at')->first(),
                    'unread_count' => $messages->where('is_read', false)->where('receiver_id', $user->id)->count(),
                ];
            })
            ->values();

        return response()->json($conversations);
    }

    // Get runner-specific conversations (include accepted errands and pending posts with messages, exclude archived)
    public function getRunnerConversations()
    {
        $user = JWTAuth::parseToken()->authenticate();

        $conversations = Message::with(['post.user', 'sender', 'receiver'])
            ->whereHas('post', function ($query) use ($user) {
                $query->where(function ($subQuery) use ($user) {
                    // Include posts where user is the assigned runner
                    $subQuery->where('runner_id', $user->id)
                             ->whereIn('status', ['accepted', 'runner_completed', 'confirmed']);
                })
                ->orWhere(function ($subQuery) use ($user) {
                    // Include pending posts where user has sent messages (potential runner conversations)
                    $subQuery->where('status', 'pending')
                             ->where('user_id', '!=', $user->id); // Not user's own posts
                })
                ->where('archived', false); // Exclude archived posts
            })
            // Only include conversations where the runner has participated
            ->where(function ($query) use ($user) {
                $query->where('sender_id', $user->id)
                      ->orWhere('receiver_id', $user->id);
            })
            ->active()
            ->get()
            ->groupBy('post_id')
            ->map(function ($messages) use ($user) {
                return [
                    'post' => $messages->first()->post,
                    'latest_message' => $messages->sortByDesc('created_at')->first(),
                    'unread_count' => $messages->where('is_read', false)->where('receiver_id', $user->id)->count(),
                ];
            })
            ->values();

        return response()->json($conversations);
    }

    // Delete expired messages (can be called via cron job)
    public function deleteExpired()
    {
        $deletedCount = Message::where('expires_at', '<', now())->delete();

        return response()->json([
            'message' => 'Expired messages deleted',
            'deleted_count' => $deletedCount
        ]);
    }
} 