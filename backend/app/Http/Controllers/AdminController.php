<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Post;
use App\Models\Report;
use App\Models\Notification;
use Illuminate\Http\Request;
use Tymon\JWTAuth\Facades\JWTAuth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;

class AdminController extends Controller
{
    // Admin login with specific credentials (no middleware on this)
    public function adminLogin(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required|string',
        ]);

        $user = User::where('email', $request->email)
            ->where('is_admin', true)
            ->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            return response()->json(['error' => 'Invalid admin credentials'], 401);
        }

        $token = JWTAuth::fromUser($user);

        return response()->json([
            'message' => 'Admin login successful',
            'user' => $user->makeHidden(['password']),
            'token' => $token,
        ], 200);
    }

    // Create admin user (for initial setup)
    public function createAdmin(Request $request)
    {
        $request->validate([
            'name' => 'required|string',
            'email' => 'required|email|unique:users',
            'password' => 'required|string|min:8',
        ]);

        $admin = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
            'is_admin' => true,
            'is_verified' => true,
        ]);

        return response()->json([
            'message' => 'Admin user created successfully',
            'admin' => $admin->makeHidden(['password'])
        ], 201);
    }

    // Get pending users for verification
    public function getPendingUsers()
    {
        try {
            // Get users who are not verified and not admin
            $pendingUsers = User::where('is_verified', false)
                ->where('is_admin', false)
                ->latest()
                ->get();
            
            \Log::info('Found ' . $pendingUsers->count() . ' pending users');
            
            return response()->json($pendingUsers);
        } catch (\Exception $e) {
            \Log::error('Error in getPendingUsers: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to fetch pending users', 'message' => $e->getMessage()], 500);
        }
    }

    // Get all users
    public function getAllUsers()
    {
        try {
            \Log::info('AdminController::getAllUsers called');
            $users = User::latest()->get();
            \Log::info('Found ' . $users->count() . ' users');
            return response()->json($users);
        } catch (\Exception $e) {
            \Log::error('Error in getAllUsers: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to fetch users', 'message' => $e->getMessage()], 500);
        }
    }

    // Verify or reject user
    public function verifyUser(Request $request, $userId)
    {
        try {
            $user = User::findOrFail($userId);
            $action = $request->get('action'); // 'approve' or 'reject'
            
            if ($action === 'approve') {
                $user->is_verified = true;
                $user->save();
                
                \Log::info('User approved: ' . $user->email);
                return response()->json(['message' => 'User approved successfully']);
            } elseif ($action === 'reject') {
                // For rejected users, we can either delete them or keep them unverified
                // Let's delete them for now
                $user->delete();
                
                \Log::info('User rejected and deleted: ' . $user->email);
                return response()->json(['message' => 'User rejected successfully']);
            }
            
            return response()->json(['error' => 'Invalid action'], 400);
        } catch (\Exception $e) {
            \Log::error('Error in verifyUser: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to verify user', 'message' => $e->getMessage()], 500);
        }
    }

    // Toggle user verification status
    public function toggleVerification($userId)
    {
        $user = User::findOrFail($userId);
        
        if ($user->is_admin) {
            return response()->json(['error' => 'Cannot modify admin users'], 403);
        }
        
        $user->is_verified = !$user->is_verified;
        $user->save();

        return response()->json([
            'message' => 'User verification status updated',
            'user' => $user
        ]);
    }

    // Delete user
    public function deleteUser($userId)
    {
        $user = User::findOrFail($userId);
        
        if ($user->is_admin) {
            return response()->json(['error' => 'Cannot delete admin users'], 403);
        }

        $user->delete();
        return response()->json(['message' => 'User deleted successfully']);
    }

    // Get all transactions
    public function getTransactions()
    {
        $transactions = Post::with(['user', 'runner'])
            ->whereNotNull('runner_id')
            ->latest()
            ->get();

        // Calculate totals
        $totalTransactions = $transactions->count();
        $completedTransactions = $transactions->where('status', 'completed')->count();
        
        // Get balance transactions for monetary totals
        $balanceTransactions = \App\Models\BalanceTransaction::with(['runner', 'post'])
            ->where('type', 'errand_payment')
            ->where('status', 'approved')
            ->get();
            
        $totalTransactionAmount = $balanceTransactions->sum('total_amount');
        $totalServiceFees = $balanceTransactions->sum('service_fee');
        $systemProfit = $balanceTransactions->sum('platform_commission'); // Platform gets 15% of service fees

        return response()->json([
            'transactions' => $transactions,
            'balance_transactions' => $balanceTransactions,
            'summary' => [
                'total_transactions' => $totalTransactions,
                'completed_transactions' => $completedTransactions,
                'total_transaction_amount' => round($totalTransactionAmount, 2),
                'total_service_fees' => round($totalServiceFees, 2),
                'system_profit' => round($systemProfit, 2),
                'completion_rate' => $totalTransactions > 0 ? round(($completedTransactions / $totalTransactions) * 100, 2) : 0
            ]
        ]);
    }

    // Get admin statistics
    public function getStats()
    {
        $stats = [
            'total_posts' => Post::count(),
            'completed_posts' => Post::whereIn('status', ['runner_completed', 'completed'])->count(),
            'pending_posts' => Post::where('status', 'pending')->count(),
            'verified_users' => User::where('is_verified', true)->where('is_admin', false)->count(),
            'total_users' => User::where('is_admin', false)->count(),
        ];
        
        return response()->json($stats);
    }


} 