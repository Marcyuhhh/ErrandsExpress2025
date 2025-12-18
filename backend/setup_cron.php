<?php
/**
 * Cron Job Setup for Errands Express
 * 
 * This script helps set up the necessary cron jobs for the application.
 * Run this after deployment to ensure automatic notifications work.
 */

echo "=== ERRANDS EXPRESS CRON SETUP ===\n\n";

echo "Add these cron jobs to your server's crontab:\n\n";

echo "# Send balance payment notifications daily at 9:00 AM\n";
echo "0 9 * * * cd " . __DIR__ . " && php artisan balance:send-notifications\n\n";

echo "# Clean up expired notifications and messages daily at midnight\n";
echo "0 0 * * * cd " . __DIR__ . " && php artisan cleanup:expired\n\n";

echo "# Optional: Run Laravel scheduler (includes all scheduled commands)\n";
echo "* * * * * cd " . __DIR__ . " && php artisan schedule:run >> /dev/null 2>&1\n\n";

echo "=== SETUP INSTRUCTIONS ===\n\n";

echo "1. Copy the cron jobs above\n";
echo "2. Run: crontab -e\n";
echo "3. Paste the cron jobs into your crontab\n";
echo "4. Save and exit\n\n";

echo "=== TESTING COMMANDS ===\n\n";

echo "Test balance notifications:\n";
echo "php artisan balance:send-notifications\n\n";

echo "Test Laravel scheduler:\n";
echo "php artisan schedule:list\n";
echo "php artisan schedule:test\n\n";

echo "=== PAYMENT SYSTEM OVERVIEW ===\n\n";

echo "Service Fee Calculation:\n";
echo "- Amount ≤ ₱150: Fixed ₱20 service fee\n";
echo "- Amount > ₱150: 20% of total amount\n\n";

echo "Commission Split:\n";
echo "- Runner earnings: 85% of service fee\n";
echo "- Platform commission: 15% of service fee (added to errands balance)\n\n";

echo "Payment Schedule:\n";
echo "- Day 1-3: Balance accumulating\n";
echo "- Day 4: Reminder notification sent\n";
echo "- Day 5: Payment due notification\n";
echo "- Day 6+: Warning notifications (overdue)\n";
echo "- Day 8+: Critical overdue notifications\n\n";

echo "Example (₱200 errand):\n";
echo "- Service fee: ₱40 (20%)\n";
echo "- Runner earnings: ₱34 (85% of ₱40)\n";
echo "- Errands balance: ₱6 (15% of ₱40)\n";
echo "- Customer pays: ₱240 (₱200 + ₱40)\n\n";

echo "Setup completed! 🎉\n";
?> 