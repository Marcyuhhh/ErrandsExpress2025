<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\UserController;
use App\Http\Controllers\PostController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\MessageController;
use App\Http\Controllers\AdminController;
use App\Http\Controllers\RunnerBalanceController;

// Public routes
Route::post('register', [UserController::class, 'register']);
Route::post('login', [UserController::class, 'login']);
Route::get('/check-auth', [UserController::class, 'checkAuth']); // Test route

// Test route
Route::get('/test', function() {
    return response()->json(['message' => 'API is working', 'timestamp' => now()]);
});

// Temporary test route for payment without auth (remove in production)
Route::post('/test-payment/{postId}', [RunnerBalanceController::class, 'addPaymentAmount']);

// CORS test route
Route::any('/cors-test', function() {
    return response()->json([
        'message' => 'CORS test successful',
        'method' => request()->method(),
        'origin' => request()->header('Origin'),
        'headers' => request()->headers->all()
    ]);
});

// System settings routes (public for GCash info only)
Route::get('/system/gcash-info', [\App\Http\Controllers\SystemSettingController::class, 'getGCashInfo']);

// Admin public routes (no auth required)
Route::post('/admin/login', [AdminController::class, 'adminLogin']);
Route::post('/admin/create', [AdminController::class, 'createAdmin']); // For initial setup

// Temporary test route without auth
Route::get('/admin/users/pending-test', [AdminController::class, 'getPendingUsers']);

// Protected routes (require authentication)
Route::middleware(['auth:api', 'check.banned'])->group(function () {
    // User routes
    Route::get('/dashboard', [UserController::class, 'dashboard']);
    Route::post('/logout', [UserController::class, 'logout']);
    Route::put('/profile', [UserController::class, 'updateProfile']);
    Route::put('/password', [UserController::class, 'updatePassword']);
    Route::get('/users/{id}', [UserController::class, 'getUserById']);

    // Posts routes
    Route::get('/posts', [PostController::class, 'index']);
    Route::get('/posts/user', [PostController::class, 'getUserPosts']);
    Route::get('/posts/runner', [PostController::class, 'getRunnerPosts']);
    Route::get('/posts/runner/accepted', [PostController::class, 'getRunnerAcceptedPosts']);
    Route::post('/posts', [PostController::class, 'store']);
    Route::delete('/posts/{id}', [PostController::class, 'destroy']);
    Route::patch('/posts/{id}/accept', [PostController::class, 'accept']);
    Route::patch('/posts/{id}/complete', [PostController::class, 'complete']);
    Route::patch('/posts/{id}/confirm-complete', [PostController::class, 'confirmComplete']);

    // User stats routes
    Route::get('/stats/user', [PostController::class, 'getUserStats']);
    Route::get('/stats/runner', [PostController::class, 'getRunnerStats']);

    // Reports routes
    Route::post('/reports', [ReportController::class, 'store']);
    Route::get('/reports', [ReportController::class, 'index']); // Admin only
    Route::patch('/reports/{id}/review', [ReportController::class, 'review']); // Admin only
    Route::get('/reports/pending-count', [ReportController::class, 'getPendingCount']); // Admin only

    // Notifications routes
    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::get('/notifications/runner', [NotificationController::class, 'getRunnerNotifications']);
    Route::patch('/notifications/{id}/read', [NotificationController::class, 'markAsRead']);
    Route::patch('/notifications/read-all', [NotificationController::class, 'markAllAsRead']);
    Route::get('/notifications/unread-count', [NotificationController::class, 'getUnreadCount']);

    // Messages routes (Inbox)
    Route::get('/messages', [MessageController::class, 'index']);
    Route::get('/messages/conversations', [MessageController::class, 'getConversations']);
    Route::get('/messages/runner/conversations', [MessageController::class, 'getRunnerConversations']);
    Route::get('/messages/post/{postId}', [MessageController::class, 'getPostMessages']);
    Route::post('/messages', [MessageController::class, 'store']);
    Route::patch('/messages/{id}/read', [MessageController::class, 'markAsRead']);
    Route::get('/messages/unread-count', [MessageController::class, 'getUnreadCount']);

    // Enhanced Payment System Routes
    
    // Runner Balance Management
    Route::prefix('balance')->group(function () {
        Route::get('/', [RunnerBalanceController::class, 'getBalance']);
        Route::get('/transactions', [RunnerBalanceController::class, 'getTransactions']);
        Route::post('/pay', [RunnerBalanceController::class, 'submitBalancePayment']);
    });

    // Errand Payment Management
    Route::prefix('posts/{postId}')->group(function () {
        Route::post('/payment', [RunnerBalanceController::class, 'addPaymentAmount']);
        Route::patch('/verify-payment', [RunnerBalanceController::class, 'verifyPayment']);
        Route::get('/transactions', [RunnerBalanceController::class, 'getPostTransactions']);
    });

    // Cleanup routes (can be called via cron jobs)
    Route::delete('/cleanup/notifications', [NotificationController::class, 'deleteExpired']);
    Route::delete('/cleanup/messages', [MessageController::class, 'deleteExpired']);
});

// Admin-only routes (require both auth and admin)
Route::middleware(['auth:api', 'check.banned', 'admin'])->prefix('admin')->group(function () {
    // Admin user management routes
    Route::get('/users', [AdminController::class, 'getAllUsers']);
    Route::get('/users/pending', [AdminController::class, 'getPendingUsers']);
    Route::patch('/users/{id}/verify', [AdminController::class, 'verifyUser']);
    Route::patch('/users/{id}/toggle-verification', [AdminController::class, 'toggleVerification']);
    Route::delete('/users/{id}', [AdminController::class, 'deleteUser']);
    
    // Admin transaction and stats routes
    Route::get('/transactions', [AdminController::class, 'getTransactions']);
    Route::get('/stats', [AdminController::class, 'getStats']);

    // Enhanced Admin Balance Management Routes
    Route::prefix('balances')->group(function () {
        Route::get('/', [RunnerBalanceController::class, 'getAllRunnerBalances']);
        Route::get('/pending-payments', [RunnerBalanceController::class, 'getPendingBalancePayments']);
        Route::patch('/payment/{transactionId}/approve', [RunnerBalanceController::class, 'approveBalancePayment']);
        Route::patch('/payment/{transactionId}/reject', [RunnerBalanceController::class, 'rejectBalancePayment']);
    });

    // Admin Errand Payment Management Routes
    Route::prefix('errand-payments')->group(function () {
        Route::get('/pending', [RunnerBalanceController::class, 'getPendingErrandPayments']);
        Route::patch('/{transactionId}/approve', [RunnerBalanceController::class, 'approveErrandPayment']);
        Route::patch('/{transactionId}/reject', [RunnerBalanceController::class, 'rejectErrandPayment']);
    });

    // System settings routes (admin only)
    Route::put('/system/gcash-settings', [\App\Http\Controllers\SystemSettingController::class, 'updateGCashSettings']);
});

