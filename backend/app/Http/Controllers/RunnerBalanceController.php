<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;
use Tymon\JWTAuth\Facades\JWTAuth;
use App\Models\RunnerBalance;
use App\Models\BalanceTransaction;
use App\Models\Post;
use App\Models\User;
use App\Models\Message;
use App\Models\Notification;

class RunnerBalanceController extends Controller
{
    /**
     * RUNNER: Add payment amount for completed errand
     * This creates a transaction that customers must verify
     */
    public function addPaymentAmount(Request $request, $postId)
    {
        try {
            Log::info('=== ERRAND PAYMENT SUBMISSION STARTED ===', [
                'postId' => $postId,
                'request_data' => $request->all(),
                'user_authenticated' => auth()->check(),
                'jwt_user' => JWTAuth::parseToken()->authenticate() ? 'yes' : 'no'
            ]);

            // Authenticate runner
            $runner = JWTAuth::parseToken()->authenticate();
            if (!$runner) {
                Log::error('Authentication failed in payment submission');
                return response()->json(['error' => 'Authentication required'], 401);
            }

            Log::info('Runner authenticated', ['runner_id' => $runner->id]);

            // Validate input
            $validator = Validator::make($request->all(), [
                'original_amount' => 'required|numeric|min:1|max:50000',
                'proof_of_purchase' => 'required|string|max:15728640', // ~15MB for base64 encoded 10MB images
                'payment_method' => 'sometimes|in:gcash,cod,bank_transfer'
            ]);

            if ($validator->fails()) {
                Log::error('Validation failed', ['errors' => $validator->errors()]);
                return response()->json([
                    'error' => 'Invalid input data',
                    'details' => $validator->errors()
                ], 422);
            }

            Log::info('Validation passed');

            // Find and validate post
            $post = Post::with('user')->find($postId);
            if (!$post) {
                Log::error('Post not found', ['postId' => $postId]);
                return response()->json(['error' => 'Errand not found'], 404);
            }

            Log::info('Post found', ['post_id' => $post->id, 'status' => $post->status, 'runner_id' => $post->runner_id]);

            if ($post->runner_id !== $runner->id) {
                Log::error('Runner not assigned to post', ['post_runner_id' => $post->runner_id, 'current_runner_id' => $runner->id]);
                return response()->json(['error' => 'You are not assigned to this errand'], 403);
            }

            if ($post->status !== 'accepted') {
                Log::error('Post status invalid', ['status' => $post->status]);
                return response()->json(['error' => 'Errand must be accepted to add payment'], 400);
            }

            Log::info('Post validation passed');

            // Check for existing payment
            $existingTransaction = BalanceTransaction::where('runner_id', $runner->id)
                ->where('post_id', $postId)
                ->where('type', BalanceTransaction::TYPE_ERRAND_PAYMENT)
                ->first();

            Log::info('Existing transaction check', ['existing' => $existingTransaction ? 'yes' : 'no']);

            if ($existingTransaction && !$existingTransaction->canBeModified()) {
                Log::error('Payment already processed', ['transaction_id' => $existingTransaction->id]);
                return response()->json([
                    'error' => 'Payment already processed for this errand',
                    'transaction' => $existingTransaction->getSummary()
                ], 409);
            }

            Log::info('About to start database transaction');

            DB::beginTransaction();

            // Remove old transaction if exists and can be modified
            if ($existingTransaction && $existingTransaction->canBeModified()) {
                Log::info('Removing old transaction', ['transaction_id' => $existingTransaction->id]);
                $existingTransaction->delete();
            }

            Log::info('About to create new payment transaction');

            // Create new payment transaction
            $transaction = BalanceTransaction::createErrandPayment(
                $runner->id,
                $post->user_id,
                $postId,
                $request->original_amount,
                $request->proof_of_purchase,
                $request->payment_method ?? 'gcash'
            );

            Log::info('Transaction created successfully', ['transaction_id' => $transaction->id]);

            // Send notification to customer
            $this->notifyCustomerOfPayment($post, $transaction);

            // Send message to customer with payment details
            $this->sendPaymentMessage($post, $transaction, $runner);

            DB::commit();

            Log::info('Errand payment submitted successfully', [
                'transaction_id' => $transaction->id,
                'amount' => $transaction->total_amount
            ]);

            return response()->json([
                'message' => 'Payment submitted successfully. Waiting for customer verification.',
                'transaction' => $transaction->getSummary()
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error submitting errand payment', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'file' => $e->getFile(),
                'line' => $e->getLine()
            ]);
            return response()->json(['error' => 'Failed to submit payment: ' . $e->getMessage()], 500);
        }
    }

    /**
     * CUSTOMER: Verify payment amount submitted by runner
     */
    public function verifyPayment(Request $request, $postId)
    {
        try {
            $customer = JWTAuth::parseToken()->authenticate();
            
            // Validate input
            $validator = Validator::make($request->all(), [
                'verified' => 'required|boolean',
                'payment_method' => 'required_if:verified,true|in:gcash,cod,bank_transfer',
                'notes' => 'sometimes|string|max:500'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'error' => 'Invalid input data',
                    'details' => $validator->errors()
                ], 422);
            }

            // Find post and validate ownership
            $post = Post::find($postId);
            if (!$post || $post->user_id !== $customer->id) {
                return response()->json(['error' => 'Errand not found or unauthorized'], 404);
            }

            // Find pending payment transaction
            $transaction = BalanceTransaction::where('post_id', $postId)
                ->where('type', BalanceTransaction::TYPE_ERRAND_PAYMENT)
                ->where('status', BalanceTransaction::STATUS_PENDING)
                ->first();

            if (!$transaction) {
                return response()->json(['error' => 'No pending payment found for this errand'], 404);
            }

            DB::beginTransaction();

            // Process verification
            $transaction->verifyByCustomer(
                $request->verified,
                $request->payment_method ?? 'gcash',
                $request->notes
            );

            if ($request->verified) {
                // Calculate commission split
                $platformCommission = $transaction->platform_commission;
                $runnerEarnings = $transaction->getRunnerEarnings();
                
                // Update or create runner balance record
                $runnerBalance = \App\Models\RunnerBalance::firstOrCreate(
                    ['runner_id' => $transaction->runner_id],
                    [
                        'current_balance' => 0,
                        'total_earned' => 0,
                        'total_paid' => 0,
                        'status' => 'active'
                    ]
                );
                
                // Add platform commission to the balance (this is what runner owes - 15%)
                $runnerBalance->addCommissionDebt($platformCommission, 'Platform commission from errand #' . $postId);
                
                // Add runner earnings to total earned (this is runner's profit - 85%)
                $runnerBalance->addEarnings($runnerEarnings, 'Runner profit from errand #' . $postId);
                
                // Notify runner of verification and automatic approval
                Notification::create([
                    'user_id' => $transaction->runner_id,
                    'post_id' => $postId,
                    'type' => 'payment_approved',
                    'title' => 'Payment Approved ✅',
                    'message' => 'Customer verified and approved your payment! You earned ₱' . number_format($runnerEarnings, 2) . ' profit. Platform commission of ₱' . number_format($platformCommission, 2) . ' added to your balance (pay within 5 days). You can now complete the errand.',
                    'expires_at' => now()->addDays(3),
                ]);

                $message = 'Payment verified and approved successfully! Runner can now complete the errand. Platform commission added to runner balance.';
            } else {
                // Notify runner of rejection
                Notification::create([
                    'user_id' => $transaction->runner_id,
                    'post_id' => $postId,
                    'type' => 'payment_rejected',
                    'title' => 'Payment Rejected ❌',
                    'message' => 'Customer rejected your payment amount. Please discuss and resubmit.',
                    'expires_at' => now()->addDays(3),
                ]);

                $message = 'Payment rejected. Runner has been notified to resubmit.';
            }

            DB::commit();

            return response()->json([
                'message' => $message,
                'transaction' => $transaction->getSummary()
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error verifying payment', [
                'error' => $e->getMessage(),
                'post_id' => $postId
            ]);
            return response()->json(['error' => 'Failed to verify payment'], 500);
        }
    }

    // Balance payment methods removed - 15% fee is now automatically deducted

    /**
     * RUNNER: Submit balance payment with proof
     */
    public function submitBalancePayment(Request $request)
    {
        try {
            $runner = JWTAuth::parseToken()->authenticate();
            
            // Get runner's current balance
            $balance = RunnerBalance::where('runner_id', $runner->id)->first();
            
            if (!$balance || $balance->current_balance <= 0) {
                return response()->json(['error' => 'No outstanding balance to pay'], 400);
            }

            // Validate input
            $validator = Validator::make($request->all(), [
                'proof_of_payment' => 'required|string|max:10485760', // 10MB for base64 images
                'payment_method' => 'sometimes|in:gcash,bank_transfer',
                'notes' => 'sometimes|string|max:500'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'error' => 'Invalid input data',
                    'details' => $validator->errors()
                ], 422);
            }

            // Note: No need to check for pending payments since they are auto-processed now

            DB::beginTransaction();

            // Create balance payment transaction and auto-approve it
            $transaction = BalanceTransaction::createBalancePayment(
                $runner->id,
                $balance->current_balance,
                $request->proof_of_payment,
                $request->payment_method ?? 'gcash'
            );

            // Add notes if provided
            if ($request->notes) {
                $transaction->update(['notes' => $request->notes]);
            }

            // Keep transaction pending for admin approval
            // (Transaction is already created with STATUS_PENDING by default)

            // Notify runner that payment is submitted and awaiting approval
            Notification::create([
                'user_id' => $runner->id,
                'type' => 'balance_payment_submitted',
                'title' => 'Balance Payment Submitted ✅',
                'message' => 'Your balance payment of ₱' . number_format($transaction->total_amount, 2) . ' has been submitted and is awaiting admin approval.',
                'expires_at' => now()->addDays(7),
            ]);

            // Notify admin of new balance payment
            $this->notifyAdminOfBalancePayment($transaction, $runner);

            DB::commit();

            Log::info('Balance payment processed automatically', [
                'runner_id' => $runner->id,
                'transaction_id' => $transaction->id,
                'amount' => $transaction->total_amount
            ]);

            return response()->json([
                'message' => 'Balance payment submitted successfully! Please wait for admin approval.',
                'transaction' => $transaction->getSummary(),
                'gcash_info' => \App\Models\SystemSetting::getGCashInfo()
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error submitting balance payment', [
                'error' => $e->getMessage(),
                'runner_id' => $runner->id ?? null
            ]);
            return response()->json(['error' => 'Failed to submit balance payment: ' . $e->getMessage()], 500);
        }
    }

    /**
     * ADMIN: Approve balance payment
     */
    public function approveBalancePayment(Request $request, $transactionId)
    {
        try {
            $admin = JWTAuth::parseToken()->authenticate();
            
            if (!$admin->is_admin) {
                return response()->json(['error' => 'Admin access required'], 403);
            }

            $validator = Validator::make($request->all(), [
                'confirmed' => 'required|boolean',
                'notes' => 'sometimes|string|max:500'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'error' => 'Invalid input data',
                    'details' => $validator->errors()
                ], 422);
            }

            if (!$request->confirmed) {
                return response()->json(['error' => 'Balance payment approval requires confirmation'], 400);
            }

            $transaction = BalanceTransaction::with(['runner'])->findOrFail($transactionId);

            if ($transaction->type !== BalanceTransaction::TYPE_BALANCE_PAYMENT || 
                $transaction->status !== BalanceTransaction::STATUS_PENDING) {
                return response()->json(['error' => 'Invalid transaction for approval'], 400);
            }

            DB::beginTransaction();

            // Approve transaction
            $transaction->approveByAdmin($admin->id, $request->notes);

            // Get runner's balance and process payment
            $balance = RunnerBalance::where('runner_id', $transaction->runner_id)->first();
            if ($balance) {
                $balance->processPayment($transaction->total_amount);
            }

            // Notify runner of approval
            Notification::create([
                'user_id' => $transaction->runner_id,
                'type' => 'balance_payment_approved',
                'title' => 'Balance Payment Approved ✅',
                'message' => 'Your balance payment of ₱' . number_format($transaction->total_amount, 2) . ' has been approved. Your balance has been reset to ₱0.00.',
                'expires_at' => now()->addDays(7),
            ]);

            DB::commit();

            Log::info('Balance payment approved successfully', [
                'transaction_id' => $transactionId,
                'admin_id' => $admin->id,
                'runner_id' => $transaction->runner_id,
                'amount' => $transaction->total_amount
            ]);

            return response()->json([
                'message' => 'Balance payment approved successfully',
                'transaction' => $transaction->getSummary()
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error approving balance payment', [
                'error' => $e->getMessage(),
                'transaction_id' => $transactionId
            ]);
            return response()->json(['error' => 'Failed to approve balance payment'], 500);
        }
    }

    /**
     * ADMIN: Reject balance payment
     */
    public function rejectBalancePayment(Request $request, $transactionId)
    {
        try {
            $admin = JWTAuth::parseToken()->authenticate();
            
            if (!$admin->is_admin) {
                return response()->json(['error' => 'Admin access required'], 403);
            }

            $validator = Validator::make($request->all(), [
                'reason' => 'required|string|max:500'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'error' => 'Invalid input data',
                    'details' => $validator->errors()
                ], 422);
            }

            $transaction = BalanceTransaction::with(['runner'])->findOrFail($transactionId);

            if ($transaction->type !== BalanceTransaction::TYPE_BALANCE_PAYMENT || 
                $transaction->status !== BalanceTransaction::STATUS_PENDING) {
                return response()->json(['error' => 'Invalid transaction for rejection'], 400);
            }

            DB::beginTransaction();

            // Reject transaction
            $transaction->rejectByAdmin($admin->id, $request->reason);

            // Notify runner of rejection
            Notification::create([
                'user_id' => $transaction->runner_id,
                'type' => 'balance_payment_rejected',
                'title' => 'Balance Payment Rejected ❌',
                'message' => 'Your balance payment of ₱' . number_format($transaction->total_amount, 2) . ' has been rejected. Reason: ' . $request->reason,
                'expires_at' => now()->addDays(7),
            ]);

            DB::commit();

            Log::info('Balance payment rejected', [
                'transaction_id' => $transactionId,
                'admin_id' => $admin->id,
                'runner_id' => $transaction->runner_id,
                'reason' => $request->reason
            ]);

            return response()->json([
                'message' => 'Balance payment rejected',
                'transaction' => $transaction->getSummary()
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error rejecting balance payment', [
                'error' => $e->getMessage(),
                'transaction_id' => $transactionId
            ]);
            return response()->json(['error' => 'Failed to reject balance payment'], 500);
        }
    }

    /**
     * Get runner's current balance and status
     */
    public function getBalance()
    {
        try {
            $runner = JWTAuth::parseToken()->authenticate();
            
            $balance = RunnerBalance::where('runner_id', $runner->id)->first();
            
            if (!$balance) {
                return response()->json([
                    'balance' => 0,
                    'status' => 'active',
                    'payment_status' => [
                        'status' => 'clear',
                        'message' => 'No outstanding balance',
                        'urgency' => 'none'
                    ],
                    'total_earned' => 0,
                    'total_paid' => 0
                ]);
            }

            return response()->json([
                'balance' => $balance->current_balance,
                'status' => $balance->status,
                'payment_status' => $balance->getPaymentStatus(),
                'total_earned' => $balance->total_earned,
                'total_paid' => $balance->total_paid,
                'balance_started_at' => $balance->balance_started_at,
                'last_payment_date' => $balance->last_payment_date
            ]);

        } catch (\Exception $e) {
            Log::error('Error getting balance', ['error' => $e->getMessage()]);
            return response()->json(['error' => 'Failed to get balance'], 500);
        }
    }

    /**
     * Get transaction history
     */
    public function getTransactions()
    {
        try {
            $runner = JWTAuth::parseToken()->authenticate();
            
            $transactions = BalanceTransaction::with(['post', 'customer', 'approver'])
                ->where('runner_id', $runner->id)
                ->orderBy('created_at', 'desc')
                ->get()
                ->map(function ($transaction) {
                    return array_merge($transaction->getSummary(), [
                        'post_title' => $transaction->post ? $transaction->post->title : null,
                        'customer_name' => $transaction->customer ? 
                            $transaction->customer->firstname . ' ' . $transaction->customer->lastname : null,
                        'approved_by' => $transaction->approver ? 
                            $transaction->approver->firstname . ' ' . $transaction->approver->lastname : null
                    ]);
                });

            return response()->json($transactions);

        } catch (\Exception $e) {
            Log::error('Error getting transactions', ['error' => $e->getMessage()]);
            return response()->json(['error' => 'Failed to get transactions'], 500);
        }
    }

    /**
     * Get post transactions (for customer/runner verification)
     */
    public function getPostTransactions($postId)
    {
        try {
            $user = JWTAuth::parseToken()->authenticate();
            
            $post = Post::find($postId);
            if (!$post) {
                return response()->json(['error' => 'Errand not found'], 404);
            }
            
            // Check authorization
            if ($post->user_id !== $user->id && $post->runner_id !== $user->id) {
                return response()->json(['error' => 'Unauthorized to view transactions'], 403);
            }
            
            $transactions = BalanceTransaction::with(['runner', 'customer'])
                ->where('post_id', $postId)
                ->orderBy('created_at', 'desc')
                ->get()
                ->map(function ($transaction) {
                    return $transaction->getSummary();
                });

            return response()->json($transactions);

        } catch (\Exception $e) {
            Log::error('Error getting post transactions', [
                'error' => $e->getMessage(),
                'post_id' => $postId
            ]);
            return response()->json(['error' => 'Failed to get transactions'], 500);
        }
    }

    /**
     * ADMIN: Get all pending balance payments
     */
    public function getPendingBalancePayments()
    {
        try {
            $admin = JWTAuth::parseToken()->authenticate();
            
            if (!$admin->is_admin) {
                return response()->json(['error' => 'Admin access required'], 403);
            }

            $pendingPayments = BalanceTransaction::with(['runner'])
                ->where('type', BalanceTransaction::TYPE_BALANCE_PAYMENT)
                ->where('status', BalanceTransaction::STATUS_PENDING)
                ->orderBy('created_at', 'desc')
                ->get()
                ->map(function ($transaction) {
                    return array_merge($transaction->getSummary(), [
                        'runner_name' => $transaction->runner->firstname . ' ' . $transaction->runner->lastname,
                        'runner_email' => $transaction->runner->email
                    ]);
                });

            return response()->json($pendingPayments);

        } catch (\Exception $e) {
            Log::error('Error getting pending payments', ['error' => $e->getMessage()]);
            return response()->json(['error' => 'Failed to get pending payments'], 500);
        }
    }

    /**
     * ADMIN: Get all runner balances
     */
    public function getAllRunnerBalances()
    {
        try {
            $admin = JWTAuth::parseToken()->authenticate();
            
            if (!$admin->is_admin) {
                return response()->json(['error' => 'Admin access required'], 403);
            }

            $balances = RunnerBalance::with(['runner'])
                ->where('current_balance', '>', 0)
                ->orderBy('current_balance', 'desc')
                ->get()
                ->map(function ($balance) {
                    return [
                        'id' => $balance->id,
                        'runner_name' => $balance->runner->firstname . ' ' . $balance->runner->lastname,
                        'runner_email' => $balance->runner->email,
                        'current_balance' => $balance->current_balance,
                        'total_earned' => $balance->total_earned,
                        'total_paid' => $balance->total_paid,
                        'status' => $balance->status,
                        'payment_status' => $balance->getPaymentStatus(),
                        'balance_started_at' => $balance->balance_started_at,
                        'last_payment_date' => $balance->last_payment_date
                    ];
                });

            return response()->json($balances);

        } catch (\Exception $e) {
            Log::error('Error getting runner balances', ['error' => $e->getMessage()]);
            return response()->json(['error' => 'Failed to get runner balances'], 500);
        }
    }

    /**
     * Private helper methods
     */
    private function notifyCustomerOfPayment($post, $transaction)
    {
        Notification::create([
            'user_id' => $post->user_id,
            'post_id' => $post->id,
            'type' => 'payment_verification_required',
            'title' => 'Payment Verification Required',
            'message' => 'Runner has submitted payment amount of ₱' . number_format($transaction->total_amount, 2) . '. Please verify.',
            'expires_at' => now()->addDays(3),
        ]);
    }

    private function sendPaymentMessage($post, $transaction, $runner)
    {
        $message = "💰 PAYMENT VERIFICATION REQUIRED\n\n" .
                  "📄 PAYMENT BREAKDOWN\n" .
                  "Errand Cost: ₱" . number_format($transaction->original_amount, 2) . "\n" .
                  "Service Fee: ₱" . number_format($transaction->service_fee, 2) . "\n" .
                  "Total Amount: ₱" . number_format($transaction->total_amount, 2) . "\n\n" .
                  "📸 PROOF OF PURCHASE\n" .
                  "Receipt/Photo: Attached\n\n" .
                  "⚠️ Please verify this payment amount in your inbox to proceed.";

        Message::create([
            'post_id' => $post->id,
            'sender_id' => $runner->id,
            'receiver_id' => $post->user_id,
            'message' => $message,
            'expires_at' => now()->addDays(3),
        ]);
    }

    /**
     * ADMIN: Get pending errand payments that need admin approval
     */
    public function getPendingErrandPayments()
    {
        try {
            $admin = JWTAuth::parseToken()->authenticate();
            
            if (!$admin->is_admin) {
                return response()->json(['error' => 'Admin access required'], 403);
            }

            // Note: Since payments are now auto-approved, there should be no customer_verified payments
            // This endpoint is kept for legacy payments that might still exist
            $pendingPayments = BalanceTransaction::with(['runner', 'customer', 'post'])
                ->where('type', BalanceTransaction::TYPE_ERRAND_PAYMENT)
                ->where('status', BalanceTransaction::STATUS_CUSTOMER_VERIFIED)
                ->orderBy('created_at', 'desc')
                ->get()
                ->map(function ($transaction) {
                    return array_merge($transaction->getSummary(), [
                        'runner_name' => $transaction->runner->firstname . ' ' . $transaction->runner->lastname,
                        'runner_email' => $transaction->runner->email,
                        'customer_name' => $transaction->customer->firstname . ' ' . $transaction->customer->lastname,
                        'customer_email' => $transaction->customer->email,
                        'post_title' => $transaction->post->content ?? 'Errand #' . $transaction->post_id,
                        'post_destination' => $transaction->post->destination ?? 'Unknown',
                    ]);
                });

            return response()->json($pendingPayments);

        } catch (\Exception $e) {
            Log::error('Error getting pending errand payments', ['error' => $e->getMessage()]);
            return response()->json(['error' => 'Failed to get pending errand payments'], 500);
        }
    }

    /**
     * ADMIN: Approve errand payment
     */
    public function approveErrandPayment(Request $request, $transactionId)
    {
        try {
            $admin = JWTAuth::parseToken()->authenticate();
            
            if (!$admin->is_admin) {
                return response()->json(['error' => 'Admin access required'], 403);
            }

            $validator = Validator::make($request->all(), [
                'confirmed' => 'required|boolean',
                'notes' => 'sometimes|string|max:500'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'error' => 'Invalid input data',
                    'details' => $validator->errors()
                ], 422);
            }

            if (!$request->confirmed) {
                return response()->json(['error' => 'Payment approval requires confirmation'], 400);
            }

            $transaction = BalanceTransaction::with(['runner', 'customer', 'post'])->findOrFail($transactionId);

            if ($transaction->type !== BalanceTransaction::TYPE_ERRAND_PAYMENT || 
                $transaction->status !== BalanceTransaction::STATUS_CUSTOMER_VERIFIED) {
                return response()->json(['error' => 'Invalid transaction for approval - payments are now auto-approved'], 400);
            }

            DB::beginTransaction();

            // Approve transaction
            $transaction->approveByAdmin($admin->id, $request->notes);

            // NOTE: Runner earnings (85% of service fee) were already added during customer verification
            // Platform commission (15% of service fee) goes to admin, not to runner balance

            // NOTE: Admin approval is no longer the final step in the new process flow
            // The errand will be completed and deleted when customer confirms completion
            // For now, just update the transaction status and notify parties
            $post = $transaction->post;
            if ($post) {
                // Don't change post status here - let customer confirmation handle final completion
                // This is part of the new process flow where customer confirmation is the final step
                $post->confirmed_at = now();
                $post->save();
            }

            // Notify runner of approval
            Notification::create([
                'user_id' => $transaction->runner_id,
                'post_id' => $transaction->post_id,
                'type' => 'payment_approved',
                'title' => 'Errand Payment Approved ✅',
                'message' => 'Your errand payment has been approved by admin. The errand is now complete.',
                'expires_at' => now()->addDays(7),
            ]);

            // Notify customer of approval
            Notification::create([
                'user_id' => $transaction->customer_id,
                'post_id' => $transaction->post_id,
                'type' => 'payment_approved',
                'title' => 'Errand Payment Approved ✅',
                'message' => 'The payment for your errand has been approved by admin. The errand is now complete.',
                'expires_at' => now()->addDays(7),
            ]);

            DB::commit();

            return response()->json([
                'message' => 'Errand payment approved successfully',
                'transaction' => $transaction->getSummary(),
                'runner_name' => $transaction->runner->firstname . ' ' . $transaction->runner->lastname,
                'customer_name' => $transaction->customer->firstname . ' ' . $transaction->customer->lastname,
                'amount_approved' => $transaction->total_amount
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error approving errand payment', [
                'error' => $e->getMessage(),
                'transaction_id' => $transactionId
            ]);
            return response()->json(['error' => 'Failed to approve errand payment'], 500);
        }
    }

    /**
     * ADMIN: Reject errand payment
     */
    public function rejectErrandPayment(Request $request, $transactionId)
    {
        try {
            $admin = JWTAuth::parseToken()->authenticate();
            
            if (!$admin->is_admin) {
                return response()->json(['error' => 'Admin access required'], 403);
            }

            $validator = Validator::make($request->all(), [
                'reason' => 'required|string|max:500'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'error' => 'Invalid input data',
                    'details' => $validator->errors()
                ], 422);
            }

            $transaction = BalanceTransaction::with(['runner', 'customer', 'post'])->findOrFail($transactionId);

            if ($transaction->type !== BalanceTransaction::TYPE_ERRAND_PAYMENT || 
                $transaction->status !== BalanceTransaction::STATUS_CUSTOMER_VERIFIED) {
                return response()->json(['error' => 'Invalid transaction for rejection - payments are now auto-approved'], 400);
            }

            DB::beginTransaction();

            // Reject transaction
            $transaction->rejectByAdmin($admin->id, $request->reason);

            // Notify runner of rejection
            Notification::create([
                'user_id' => $transaction->runner_id,
                'post_id' => $transaction->post_id,
                'type' => 'payment_rejected',
                'title' => 'Errand Payment Rejected ❌',
                'message' => 'Your errand payment was rejected by admin. Reason: ' . $request->reason,
                'expires_at' => now()->addDays(7),
            ]);

            // Notify customer of rejection
            Notification::create([
                'user_id' => $transaction->customer_id,
                'post_id' => $transaction->post_id,
                'type' => 'payment_rejected',
                'title' => 'Errand Payment Rejected ❌',
                'message' => 'The payment for your errand was rejected by admin. Reason: ' . $request->reason,
                'expires_at' => now()->addDays(7),
            ]);

            DB::commit();

            return response()->json([
                'message' => 'Errand payment rejected successfully',
                'transaction' => $transaction->getSummary(),
                'runner_name' => $transaction->runner->firstname . ' ' . $transaction->runner->lastname,
                'customer_name' => $transaction->customer->firstname . ' ' . $transaction->customer->lastname,
                'rejection_reason' => $request->reason
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error rejecting errand payment', [
                'error' => $e->getMessage(),
                'transaction_id' => $transactionId
            ]);
            return response()->json(['error' => 'Failed to reject errand payment'], 500);
        }
    }

    /**
     * Notify admin of new balance payment
     */
    private function notifyAdminOfBalancePayment($transaction, $runner)
    {
        // Find all admin users and notify them
        $admins = User::where('is_admin', true)->get();
        
        foreach ($admins as $admin) {
            Notification::create([
                'user_id' => $admin->id,
                'type' => 'balance_payment_submitted',
                'title' => 'New Balance Payment Submitted',
                'message' => 'Runner ' . $runner->firstname . ' ' . $runner->lastname . ' submitted a balance payment of ₱' . number_format($transaction->total_amount, 2) . '. Please review and approve.',
                'expires_at' => now()->addDays(3),
            ]);
        }
    }
}
