<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class BalanceTransaction extends Model
{
    use HasFactory;

    protected $fillable = [
        'runner_id',
        'post_id',
        'message_id',
        'customer_id',
        'original_amount',
        'service_fee',
        'platform_commission',
        'total_amount',
        'proof_of_purchase',
        'type',
        'status',
        'approved_at',
        'approved_by',
        'payment_method',
        'payment_verified',
        'payment_verified_at',
        'notes',
        'rejection_reason'
    ];

    protected $casts = [
        'original_amount' => 'decimal:2',
        'service_fee' => 'decimal:2',
        'platform_commission' => 'decimal:2',
        'total_amount' => 'decimal:2',
        'approved_at' => 'datetime',
        'payment_verified' => 'boolean',
        'payment_verified_at' => 'datetime',
    ];

    // Transaction types
    const TYPE_ERRAND_PAYMENT = 'errand_payment';
    const TYPE_BALANCE_PAYMENT = 'balance_payment';
    const TYPE_REFUND = 'refund';
    const TYPE_ADJUSTMENT = 'adjustment';

    // Transaction statuses
    const STATUS_PENDING = 'pending';
    const STATUS_CUSTOMER_VERIFIED = 'customer_verified';
    const STATUS_APPROVED = 'approved';
    const STATUS_REJECTED = 'rejected';
    const STATUS_CANCELLED = 'cancelled';

    // Payment methods
    const PAYMENT_GCASH = 'gcash';
    const PAYMENT_COD = 'cod';
    const PAYMENT_BANK_TRANSFER = 'bank_transfer';

    // Relationship with runner (user)
    public function runner()
    {
        return $this->belongsTo(User::class, 'runner_id');
    }

    // Relationship with customer (user)
    public function customer()
    {
        return $this->belongsTo(User::class, 'customer_id');
    }

    // Relationship with post
    public function post()
    {
        return $this->belongsTo(Post::class);
    }

    // Relationship with message
    public function message()
    {
        return $this->belongsTo(Message::class);
    }

    // Relationship with approver (admin user)
    public function approver()
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    /**
     * Create an errand payment transaction
     */
    public static function createErrandPayment($runnerId, $customerId, $postId, $originalAmount, $proofOfPurchase, $paymentMethod = 'gcash')
    {
        $serviceFee = RunnerBalance::calculateServiceFee($originalAmount);
        $runnerEarnings = RunnerBalance::calculateRunnerEarnings($originalAmount);
        $platformCommission = RunnerBalance::calculatePlatformCommission($originalAmount);
        $totalAmount = $originalAmount + $serviceFee;

        return self::create([
            'runner_id' => $runnerId,
            'customer_id' => $customerId,
            'post_id' => $postId,
            'original_amount' => $originalAmount,
            'service_fee' => $serviceFee,
            'platform_commission' => $platformCommission,
            'total_amount' => $totalAmount,
            'proof_of_purchase' => $proofOfPurchase,
            'type' => self::TYPE_ERRAND_PAYMENT,
            'status' => self::STATUS_PENDING,
            'payment_method' => $paymentMethod
        ]);
    }

    /**
     * Create a balance payment transaction
     */
    public static function createBalancePayment($runnerId, $amount, $proofOfPayment, $paymentMethod = 'gcash')
    {
        return self::create([
            'runner_id' => $runnerId,
            'original_amount' => $amount,
            'service_fee' => 0,
            'platform_commission' => 0,
            'total_amount' => $amount,
            'proof_of_purchase' => $proofOfPayment,
            'type' => self::TYPE_BALANCE_PAYMENT,
            'status' => self::STATUS_PENDING,
            'payment_method' => $paymentMethod
        ]);
    }

    /**
     * Verify payment by customer
     */
    public function verifyByCustomer($verified, $paymentMethod, $notes = null)
    {
        if ($this->type !== self::TYPE_ERRAND_PAYMENT) {
            throw new \Exception('Only errand payments can be verified by customers');
        }

        if ($verified) {
            // Auto-approve the payment when customer verifies it (no admin approval needed)
            $this->update([
                'status' => self::STATUS_APPROVED,
                'payment_verified' => true,
                'payment_verified_at' => now(),
                'approved_at' => now(),
                'approved_by' => null, // System auto-approval
                'payment_method' => $paymentMethod,
                'notes' => $notes
            ]);
        } else {
            $this->update([
                'status' => self::STATUS_REJECTED,
                'rejection_reason' => $notes ?? 'Customer rejected the payment amount'
            ]);
        }

        return $this;
    }

    /**
     * Approve transaction by admin
     */
    public function approveByAdmin($adminId, $notes = null)
    {
        $this->update([
            'status' => self::STATUS_APPROVED,
            'approved_at' => now(),
            'approved_by' => $adminId,
            'notes' => $notes
        ]);

        return $this;
    }

    /**
     * Reject transaction by admin
     */
    public function rejectByAdmin($adminId, $reason)
    {
        $this->update([
            'status' => self::STATUS_REJECTED,
            'approved_by' => $adminId,
            'rejection_reason' => $reason
        ]);

        return $this;
    }

    /**
     * Get status display text
     */
    public function getStatusDisplayAttribute()
    {
        switch ($this->status) {
            case self::STATUS_PENDING:
                return $this->type === self::TYPE_ERRAND_PAYMENT 
                    ? 'Pending Customer Verification' 
                    : 'Pending Admin Approval';
            case self::STATUS_CUSTOMER_VERIFIED:
                return 'Customer Verified - Auto-Approved (Legacy)';
            case self::STATUS_APPROVED:
                return 'Approved';
            case self::STATUS_REJECTED:
                return 'Rejected';
            case self::STATUS_CANCELLED:
                return 'Cancelled';
            default:
                return ucfirst($this->status);
        }
    }

    /**
     * Get payment method display text
     */
    public function getPaymentMethodDisplayAttribute()
    {
        switch ($this->payment_method) {
            case self::PAYMENT_GCASH:
                return 'GCash';
            case self::PAYMENT_COD:
                return 'Cash on Delivery';
            case self::PAYMENT_BANK_TRANSFER:
                return 'Bank Transfer';
            default:
                return ucfirst($this->payment_method);
        }
    }

    /**
     * Check if transaction can be modified
     */
    public function canBeModified()
    {
        return in_array($this->status, [self::STATUS_PENDING, self::STATUS_REJECTED]);
    }

    /**
     * Check if transaction is completed
     */
    public function isCompleted()
    {
        return $this->status === self::STATUS_APPROVED;
    }

    /**
     * Get transaction summary for display
     */
    public function getSummary()
    {
        return [
            'id' => $this->id,
            'type' => $this->type,
            'original_amount' => $this->original_amount,
            'service_fee' => $this->service_fee,
            'platform_commission' => $this->platform_commission,
            'total_amount' => $this->total_amount,
            'amount' => $this->total_amount, // Keep for backward compatibility
            'proof_of_purchase' => $this->proof_of_purchase,
            'status' => $this->status,
            'status_display' => $this->status_display,
            'payment_method' => $this->payment_method,
            'payment_method_display' => $this->payment_method_display,
            'payment_verified' => $this->payment_verified,
            'payment_verified_at' => $this->payment_verified_at,
            'notes' => $this->notes,
            'rejection_reason' => $this->rejection_reason,
            'created_at' => $this->created_at,
            'approved_at' => $this->approved_at,
            'can_modify' => $this->canBeModified(),
            'is_completed' => $this->isCompleted()
        ];
    }

    /**
     * Get runner earnings (85% of service fee)
     */
    public function getRunnerEarnings()
    {
        return RunnerBalance::calculateRunnerEarnings($this->original_amount);
    }
}
