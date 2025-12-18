<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class RunnerBalance extends Model
{
    use HasFactory;

    protected $fillable = [
        'runner_id',
        'current_balance',
        'total_earned',
        'total_paid',
        'last_payment_date',
        'balance_started_at',
        'status',
        'reminder_sent',
        'warning_sent'
    ];

    protected $casts = [
        'current_balance' => 'decimal:2',
        'total_earned' => 'decimal:2',
        'total_paid' => 'decimal:2',
        'last_payment_date' => 'datetime',
        'balance_started_at' => 'datetime',
        'reminder_sent' => 'boolean',
        'warning_sent' => 'boolean'
    ];

    // Relationship with runner (user)
    public function runner()
    {
        return $this->belongsTo(User::class, 'runner_id');
    }

    // Relationship with balance transactions
    public function transactions()
    {
        return $this->hasMany(BalanceTransaction::class, 'runner_id', 'runner_id');
    }

    /**
     * Service fee calculation as per specifications:
     * - If amount ≤ 150: Service fee = 20 pesos
     * - If amount > 150: Service fee = 20% of total amount
     */
    public static function calculateServiceFee($amount)
    {
        $amount = floatval($amount);
        
        if ($amount <= 0) {
            return 0;
        }
        
        // Apply the exact specification
        if ($amount <= 150) {
            return 20; // ₱20 service fee for amounts ≤ ₱150
        } else {
            return round($amount * 0.20, 2); // 20% of amount for amounts > ₱150
        }
    }

    /**
     * Calculate runner earnings from service fee (85% of service fee)
     * NOTE: This amount goes to the runner's earnings (NOT added to errands balance)
     */
    public static function calculateRunnerEarnings($amount)
    {
        $serviceFee = self::calculateServiceFee($amount);
        return round($serviceFee * 0.85, 2); // Runner gets 85% of service fee
    }

    /**
     * Calculate platform commission (15% of service fee)
     * NOTE: This amount goes to the errands balance that runner must pay
     */
    public static function calculatePlatformCommission($amount)
    {
        $serviceFee = self::calculateServiceFee($amount);
        return round($serviceFee * 0.15, 2); // Platform gets 15% of service fee (added to errands balance)
    }

    /**
     * Add commission debt to runner balance (15% that runner owes to system)
     */
    public function addCommissionDebt($amount, $description = 'Platform commission')
    {
        $this->current_balance += $amount;
        // NOTE: Do NOT add to total_earned - this is debt, not earnings
        
        // Set balance start date if this is first debt
        if (!$this->balance_started_at) {
            $this->balance_started_at = now();
        }
        
        $this->save();
        
        return $this;
    }

    /**
     * Add actual earnings to runner (85% profit from service fees)
     * This tracks the runner's real profit, not debt
     */
    public function addEarnings($amount, $description = 'Runner profit from errand')
    {
        // Only update total_earned, not current_balance (debt)
        $this->total_earned += $amount;
        $this->save();
        
        return $this;
    }

    /**
     * Process payment and clear balance
     */
    public function processPayment($amount)
    {
        if ($amount > $this->current_balance) {
            throw new \Exception('Payment amount exceeds current balance');
        }
        
        $this->current_balance -= $amount;
        $this->total_paid += $amount;
        $this->last_payment_date = now();
        
        // Reset balance tracking if fully paid
        if ($this->current_balance <= 0) {
            $this->current_balance = 0;
            $this->balance_started_at = null;
            $this->status = 'active';
            $this->reminder_sent = false;
            $this->warning_sent = false;
        }
        
        $this->save();
        
        return $this;
    }

    // Check if balance is overdue (more than 5 days)
    public function isOverdue()
    {
        if (!$this->balance_started_at || $this->current_balance <= 0) {
            return false;
        }

        return $this->balance_started_at->diffInDays(now()) > 5;
    }

    // Check if needs reminder (4 days - before 5 days)
    public function needsReminder()
    {
        if (!$this->balance_started_at || $this->reminder_sent || $this->current_balance <= 0) {
            return false;
        }

        return $this->balance_started_at->diffInDays(now()) >= 4;
    }

    // Check if payment is due (exactly 5 days)
    public function paymentDue()
    {
        if (!$this->balance_started_at || $this->current_balance <= 0) {
            return false;
        }

        return $this->balance_started_at->diffInDays(now()) >= 5;
    }

    // Check if needs warning (more than 5 days - exceeded deadline)
    public function needsWarning()
    {
        if (!$this->balance_started_at || $this->warning_sent || $this->current_balance <= 0) {
            return false;
        }

        return $this->balance_started_at->diffInDays(now()) > 5;
    }

    /**
     * Get payment status with clear messaging
     */
    public function getPaymentStatus()
    {
        if ($this->current_balance <= 0) {
            return [
                'status' => 'clear',
                'message' => 'No outstanding balance',
                'urgency' => 'none'
            ];
        }

        $daysElapsed = $this->balance_started_at ? $this->balance_started_at->diffInDays(now()) : 0;

        if ($daysElapsed <= 3) {
            return [
                'status' => 'active',
                'message' => 'Balance accumulating - payment due in ' . (5 - $daysElapsed) . ' days',
                'urgency' => 'low'
            ];
        } elseif ($daysElapsed == 4) {
            return [
                'status' => 'reminder',
                'message' => 'Payment reminder - balance due tomorrow (5-day limit)',
                'urgency' => 'medium'
            ];
        } elseif ($daysElapsed == 5) {
            return [
                'status' => 'due',
                'message' => 'Payment due TODAY (5-day limit reached)',
                'urgency' => 'high'
            ];
        } else {
            $daysOverdue = $daysElapsed - 5;
            return [
                'status' => 'overdue',
                'message' => 'Balance overdue by ' . $daysOverdue . ' day(s) - immediate payment required',
                'urgency' => 'critical'
            ];
        }
    }
}
