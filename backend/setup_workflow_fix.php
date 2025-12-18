<?php

/**
 * ErrandsExpress Workflow Fix Script
 * 
 * This script fixes the errand completion workflow by updating database records
 * to ensure proper status flow: pending → accepted → runner_completed → completed
 * 
 * Run this script once to fix any existing data issues.
 */

require_once __DIR__ . '/vendor/autoload.php';

// Load Laravel
$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

echo "🔧 ErrandsExpress Workflow Fix Script\n";
echo "=====================================\n\n";

try {
    DB::beginTransaction();

    echo "📊 Analyzing current database state...\n";

    // Check current status distribution
    $postStatuses = DB::table('posts')
        ->select('status', DB::raw('COUNT(*) as count'))
        ->groupBy('status')
        ->get();

    echo "Current post statuses:\n";
    foreach ($postStatuses as $status) {
        echo "  - {$status->status}: {$status->count}\n";
    }

    $transactionStatuses = DB::table('balance_transactions')
        ->select('status', 'type', DB::raw('COUNT(*) as count'))
        ->groupBy('status', 'type')
        ->get();

    echo "\nCurrent transaction statuses:\n";
    foreach ($transactionStatuses as $status) {
        echo "  - {$status->type} | {$status->status}: {$status->count}\n";
    }

    echo "\n🔧 Applying fixes...\n";

    // Fix 1: Convert customer_verified transactions to approved
    $fix1 = DB::table('balance_transactions')
        ->where('status', 'customer_verified')
        ->where('payment_verified', true)
        ->where('type', 'errand_payment')
        ->update([
            'status' => 'approved',
            'approved_at' => DB::raw('COALESCE(payment_verified_at, updated_at)'),
            'approved_by' => null // System auto-approval
        ]);

    echo "✅ Fix 1: Converted {$fix1} customer_verified transactions to approved\n";

    // Fix 2: Ensure payment_verified flag is set for approved transactions
    $fix2 = DB::table('balance_transactions')
        ->where('status', 'approved')
        ->where('type', 'errand_payment')
        ->where('payment_verified', false)
        ->update([
            'payment_verified' => true,
            'payment_verified_at' => DB::raw('COALESCE(payment_verified_at, approved_at, updated_at)')
        ]);

    echo "✅ Fix 2: Updated payment_verified flag for {$fix2} approved transactions\n";

    // Fix 3: Update posts that should be in runner_completed status
    $fix3Query = "
        UPDATE posts p
        INNER JOIN balance_transactions bt ON p.id = bt.post_id
        SET p.status = 'runner_completed',
            p.completed_at = COALESCE(p.completed_at, bt.approved_at, bt.updated_at)
        WHERE p.status = 'accepted'
          AND bt.status = 'approved'
          AND bt.type = 'errand_payment'
          AND bt.payment_verified = 1
          AND p.runner_id IS NOT NULL
    ";

    $fix3 = DB::affectingStatement($fix3Query);
    echo "✅ Fix 3: Updated {$fix3} posts to runner_completed status\n";

    // Fix 4: Ensure archived flag is set for completed posts
    $fix4 = DB::table('posts')
        ->where('status', 'completed')
        ->where('archived', false)
        ->update(['archived' => true]);

    echo "✅ Fix 4: Set archived flag for {$fix4} completed posts\n";

    // Fix 5: Check for any posts that might be stuck in wrong status
    $stuckPosts = DB::table('posts as p')
        ->leftJoin('balance_transactions as bt', function($join) {
            $join->on('p.id', '=', 'bt.post_id')
                 ->where('bt.type', '=', 'errand_payment');
        })
        ->select('p.id', 'p.status', 'p.runner_id', 'bt.status as payment_status', 'bt.payment_verified')
        ->whereNotNull('p.runner_id')
        ->where(function($query) {
            $query->where(function($q) {
                // Posts that should be runner_completed but aren't
                $q->where('p.status', 'accepted')
                  ->where('bt.status', 'approved')
                  ->where('bt.payment_verified', true);
            })->orWhere(function($q) {
                // Posts without payment transactions but have runners
                $q->whereNull('bt.id')
                  ->where('p.status', 'accepted');
            });
        })
        ->get();

    if ($stuckPosts->count() > 0) {
        echo "⚠️  Found {$stuckPosts->count()} potentially stuck posts:\n";
        foreach ($stuckPosts as $post) {
            echo "    Post #{$post->id}: status={$post->status}, payment_status={$post->payment_status}, verified={$post->payment_verified}\n";
        }
        echo "    These may need manual review.\n";
    }

    DB::commit();

    echo "\n✅ Workflow fix completed successfully!\n";
    echo "\n📊 Updated status distribution:\n";

    // Show updated statistics
    $updatedPostStatuses = DB::table('posts')
        ->select('status', DB::raw('COUNT(*) as count'))
        ->groupBy('status')
        ->get();

    echo "Post statuses after fix:\n";
    foreach ($updatedPostStatuses as $status) {
        echo "  - {$status->status}: {$status->count}\n";
    }

    $updatedTransactionStatuses = DB::table('balance_transactions')
        ->select('status', 'type', DB::raw('COUNT(*) as count'))
        ->groupBy('status', 'type')
        ->get();

    echo "\nTransaction statuses after fix:\n";
    foreach ($updatedTransactionStatuses as $status) {
        echo "  - {$status->type} | {$status->status}: {$status->count}\n";
    }

    echo "\n🎉 All fixes applied! The errand completion workflow should now work correctly.\n";
    echo "\nWorkflow summary:\n";
    echo "1. Runner submits payment amount\n";
    echo "2. Customer verifies payment (auto-approved)\n";
    echo "3. Runner can mark errand as complete (status: runner_completed)\n";
    echo "4. Customer confirms completion (status: completed, archived: true)\n";

} catch (Exception $e) {
    DB::rollBack();
    echo "❌ Error occurred: " . $e->getMessage() . "\n";
    echo "Stack trace:\n" . $e->getTraceAsString() . "\n";
    Log::error('Workflow fix script error', [
        'error' => $e->getMessage(),
        'trace' => $e->getTraceAsString()
    ]);
    exit(1);
}

echo "\n✨ Script completed successfully!\n";
?> 