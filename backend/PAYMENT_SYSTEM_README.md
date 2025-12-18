# Errands Express Payment System

## Overview

The Errands Express payment system implements an automated commission-based model where the platform earns revenue through service fees while runners keep the majority of the profit.

## Service Fee Calculation

### Rules
- **Amount ≤ ₱150**: Fixed ₱20 service fee
- **Amount > ₱150**: 20% of total amount

### Examples

#### Example 1: ₱50 Errand
- Original amount: ₱50
- Service fee: ₱20 (fixed)
- Total customer payment: ₱70
- Runner earnings (85%): ₱17
- Platform commission (15%): ₱3 (added to errands balance)

#### Example 2: ₱200 Errand
- Original amount: ₱200
- Service fee: ₱40 (20% of ₱200)
- Total customer payment: ₱240
- Runner earnings (85%): ₱34
- Platform commission (15%): ₱6 (added to errands balance)

#### Example 3: ₱300 Errand
- Original amount: ₱300
- Service fee: ₱60 (20% of ₱300)
- Total customer payment: ₱360
- Runner earnings (85%): ₱51
- Platform commission (15%): ₱9 (added to errands balance)

## Commission Split

### Runner Earnings (85%)
- This amount goes directly to the runner's profit
- **NOT** added to the errands balance (debt)
- Represents the runner's share of the service fee

### Platform Commission (15%)
- This amount is added to the runner's **errands balance** (debt)
- Must be paid by the runner within 5 days
- Represents the platform's revenue

## Payment Flow

### 1. Errand Completion
1. Runner submits payment amount with proof of purchase
2. Customer verifies the payment amount
3. System calculates service fee and commission split
4. Runner earnings (85%) are added to their total earnings
5. Platform commission (15%) is added to their errands balance (debt)

### 2. Balance Payment Schedule

#### Day 1-3: Accumulation Period
- Status: "Balance accumulating"
- Message: "Payment due in X days"
- Urgency: Low

#### Day 4: Reminder
- Status: "Payment reminder"
- Message: "Payment due tomorrow (5-day limit)"
- Urgency: Medium
- Notification sent automatically

#### Day 5: Payment Due
- Status: "Payment due"
- Message: "Payment due TODAY (5-day limit reached)"
- Urgency: High
- Notification sent automatically

#### Day 6+: Overdue
- Status: "Overdue"
- Message: "Balance overdue by X day(s)"
- Urgency: Critical
- Warning notifications sent automatically

### 3. Payment Process
1. Runner goes to "Balance" section
2. Sees GCash payment information
3. Sends payment via GCash
4. Uploads proof of payment
5. Admin verifies and approves payment
6. Balance is reset to ₱0

## Technical Implementation

### Models
- `RunnerBalance`: Manages runner debt/earnings
- `BalanceTransaction`: Records all payment transactions
- `SystemSetting`: Stores GCash payment information

### Controllers
- `RunnerBalanceController`: Handles balance operations
- `SystemSettingController`: Manages GCash settings

### Commands
- `balance:send-notifications`: Sends daily payment reminders

### Key Methods

```php
// Service fee calculation
RunnerBalance::calculateServiceFee($amount)

// Runner earnings (85% of service fee)
RunnerBalance::calculateRunnerEarnings($amount)

// Platform commission (15% of service fee)
RunnerBalance::calculatePlatformCommission($amount)
```

## Automated Notifications

### Daily Scheduler
The system automatically sends notifications based on payment status:

```bash
# Run daily at 9:00 AM
php artisan balance:send-notifications
```

### Notification Types
1. **Payment Reminder** (Day 4): Gentle reminder about upcoming payment
2. **Payment Due** (Day 5): Urgent notification that payment is due today
3. **Warning** (Day 6+): Warning about overdue status
4. **Critical** (Day 8+): Critical overdue notification

## Setup Instructions

### 1. Database Migrations
```bash
php artisan migrate
```

### 2. Configure GCash Settings
- Go to Admin Panel → System Settings
- Set GCash number and account name
- These will be displayed to runners when making payments

### 3. Set Up Automated Notifications
```bash
# Add to crontab for daily notifications
0 9 * * * cd /path/to/backend && php artisan balance:send-notifications
```

### 4. Test the System
```bash
# Test calculations
php -r "require 'vendor/autoload.php'; 
echo 'Service fee for ₱200: ' . App\Models\RunnerBalance::calculateServiceFee(200) . PHP_EOL;
echo 'Runner earnings: ' . App\Models\RunnerBalance::calculateRunnerEarnings(200) . PHP_EOL;
echo 'Platform commission: ' . App\Models\RunnerBalance::calculatePlatformCommission(200) . PHP_EOL;"

# Test notifications
php artisan balance:send-notifications
```

## API Endpoints

### Runner Endpoints
- `GET /api/balance` - Get current balance and status
- `POST /api/balance/pay` - Submit balance payment with proof
- `GET /api/balance/transactions` - Get payment transaction history

### Admin Endpoints
- `GET /api/admin/balances` - View all runner balances
- `GET /api/admin/balances/pending-payments` - View pending payments
- `PATCH /api/admin/balances/payment/{id}/approve` - Approve payment
- `PATCH /api/admin/balances/payment/{id}/reject` - Reject payment

### System Settings
- `GET /api/system/gcash-info` - Get GCash payment information
- `PUT /api/admin/system/gcash-settings` - Update GCash settings (admin only)

## Frontend Integration

The frontend automatically:
- Calculates and displays fee breakdowns
- Shows payment status with appropriate urgency levels
- Displays GCash information for payments
- Provides clear payment flow for runners

## Security Features

- JWT authentication for all operations
- Admin-only access for payment approvals
- Proof of payment validation
- Transaction logging and audit trails
- Balance verification and error handling

## Monitoring & Maintenance

### Regular Tasks
1. Monitor overdue balances daily
2. Review payment transaction logs
3. Update GCash information as needed
4. Verify notification delivery

### Health Checks
```bash
# Check for overdue balances
php artisan tinker --execute="echo App\Models\RunnerBalance::where('current_balance', '>', 0)->whereRaw('DATEDIFF(NOW(), balance_started_at) > 5')->count() . ' overdue balances';"

# Check recent transactions
php artisan tinker --execute="echo App\Models\BalanceTransaction::where('created_at', '>=', now()->subDays(7))->count() . ' transactions this week';"
```

This payment system ensures fair revenue sharing while maintaining transparency and automation for all stakeholders. 