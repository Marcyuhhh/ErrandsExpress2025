<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Create users table
        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('firstname')->nullable();
            $table->string('lastname')->nullable();
            $table->string('middle_initial', 5)->nullable();
            $table->string('email')->unique();
            $table->timestamp('email_verified_at')->nullable();
            $table->date('birthdate')->nullable();
            $table->string('school_id_no')->nullable();
            $table->longText('profile_picture')->nullable();
            $table->string('gcash_number')->nullable();
            $table->string('gcash_name')->nullable();
            $table->longText('verification_image')->nullable();
            $table->boolean('is_verified')->default(false);
            $table->enum('verification_status', ['pending', 'approved', 'rejected'])->default('pending');
            $table->enum('banned_status', ['active', 'temporarily_banned', 'permanently_banned'])->default('active');
            $table->boolean('is_admin')->default(false);
            $table->boolean('is_banned')->default(false);
            $table->timestamp('banned_at')->nullable();
            $table->text('ban_reason')->nullable();
            $table->integer('points')->default(0);
            $table->enum('gender', ['male', 'female', 'other', 'prefer_not_to_say'])->nullable();
            $table->string('password');
            $table->rememberToken();
            $table->timestamps();
        });

        // Create password_reset_tokens table
        Schema::create('password_reset_tokens', function (Blueprint $table) {
            $table->string('email')->primary();
            $table->string('token');
            $table->timestamp('created_at')->nullable();
        });

        // Create sessions table
        Schema::create('sessions', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->foreignId('user_id')->nullable()->index();
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->longText('payload');
            $table->integer('last_activity')->index();
        });

        // Create cache table
        Schema::create('cache', function (Blueprint $table) {
            $table->string('key')->primary();
            $table->mediumText('value');
            $table->integer('expiration');
        });

        // Create cache_locks table
        Schema::create('cache_locks', function (Blueprint $table) {
            $table->string('key')->primary();
            $table->string('owner');
            $table->integer('expiration');
        });

        // Create jobs table
        Schema::create('jobs', function (Blueprint $table) {
            $table->id();
            $table->string('queue')->index();
            $table->longText('payload');
            $table->unsignedTinyInteger('attempts');
            $table->unsignedInteger('reserved_at')->nullable();
            $table->unsignedInteger('available_at');
            $table->unsignedInteger('created_at');
        });

        // Create job_batches table
        Schema::create('job_batches', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('name');
            $table->integer('total_jobs');
            $table->integer('pending_jobs');
            $table->integer('failed_jobs');
            $table->longText('failed_job_ids');
            $table->mediumText('options')->nullable();
            $table->integer('cancelled_at')->nullable();
            $table->integer('created_at');
            $table->integer('finished_at')->nullable();
        });

        // Create failed_jobs table
        Schema::create('failed_jobs', function (Blueprint $table) {
            $table->id();
            $table->string('uuid')->unique();
            $table->text('connection');
            $table->text('queue');
            $table->longText('payload');
            $table->longText('exception');
            $table->timestamp('failed_at')->useCurrent();
        });

        // Create posts table
        Schema::create('posts', function (Blueprint $table) {
            $table->id();
            $table->string('content');
            $table->date('deadline_date');
            $table->time('deadline_time');
            $table->string('destination');
            $table->longText('image_url')->nullable();
            $table->enum('status', ['pending', 'accepted', 'runner_completed', 'completed'])->default('pending');
            $table->foreignId('user_id')->nullable()->constrained()->onDelete('cascade');
            $table->foreignId('runner_id')->nullable()->constrained('users')->onDelete('set null');
            $table->boolean('in_inbox')->default(false);
            $table->timestamp('completed_at')->nullable();
            $table->timestamp('confirmed_at')->nullable();
            $table->boolean('archived')->default(false);
            $table->boolean('is_reported')->default(false);
            $table->boolean('payment_verified')->default(false);
            $table->timestamp('payment_verified_at')->nullable();
            $table->timestamps();
        });

        // Create messages table
        Schema::create('messages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('post_id')->constrained()->onDelete('cascade');
            $table->foreignId('sender_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('receiver_id')->constrained('users')->onDelete('cascade');
            $table->text('message');
            $table->boolean('is_read')->default(false);
            $table->timestamp('expires_at')->nullable();
            $table->timestamps();
        });

        // Create notifications table
        Schema::create('notifications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->foreignId('post_id')->nullable()->constrained()->onDelete('cascade');
            $table->string('type', 100);
            $table->string('title');
            $table->text('message');
            $table->boolean('is_read')->default(false);
            $table->timestamp('expires_at')->nullable();
            $table->timestamps();
        });

        // Create reports table
        Schema::create('reports', function (Blueprint $table) {
            $table->id();
            $table->foreignId('post_id')->constrained()->onDelete('cascade');
            $table->foreignId('reporter_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('reported_user_id')->constrained('users')->onDelete('cascade');
            $table->enum('type', ['inappropriate_content', 'spam', 'harassment', 'fraud', 'other']);
            $table->text('description')->nullable();
            $table->enum('status', ['pending', 'reviewed', 'resolved', 'dismissed'])->default('pending');
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamps();
        });

        // Create runner_balances table
        Schema::create('runner_balances', function (Blueprint $table) {
            $table->id();
            $table->foreignId('runner_id')->constrained('users')->onDelete('cascade');
            $table->decimal('current_balance', 10, 2)->default(0.00);
            $table->decimal('total_earned', 10, 2)->default(0.00);
            $table->decimal('total_paid', 10, 2)->default(0.00);
            $table->timestamp('last_payment_date')->nullable();
            $table->timestamp('balance_started_at')->nullable();
            $table->enum('status', ['active', 'payment_pending', 'payment_overdue'])->default('active');
            $table->boolean('reminder_sent')->default(false);
            $table->boolean('warning_sent')->default(false);
            $table->timestamps();
        });

        // Create balance_transactions table with improved workflow support
        Schema::create('balance_transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('runner_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('customer_id')->nullable()->constrained('users')->onDelete('cascade');
            $table->foreignId('post_id')->nullable()->constrained()->onDelete('cascade');
            $table->foreignId('message_id')->nullable()->constrained()->onDelete('set null');
            $table->decimal('original_amount', 10, 2);
            $table->decimal('service_fee', 10, 2);
            $table->decimal('platform_commission', 10, 2)->default(0.00);
            $table->decimal('total_amount', 10, 2);
            $table->longText('proof_of_purchase')->nullable();
            $table->enum('type', ['errand_payment', 'balance_payment', 'refund', 'adjustment'])->default('errand_payment');
            // Updated status enum to support new auto-approval workflow
            $table->enum('status', ['pending', 'customer_verified', 'approved', 'rejected', 'cancelled'])->default('pending');
            $table->enum('payment_method', ['gcash', 'cod', 'bank_transfer'])->default('gcash');
            $table->boolean('payment_verified')->default(false);
            $table->timestamp('payment_verified_at')->nullable();
            $table->timestamp('approved_at')->nullable();
            $table->foreignId('approved_by')->nullable()->constrained('users')->onDelete('set null');
            $table->text('notes')->nullable();
            $table->text('rejection_reason')->nullable();
            // Add index for better performance on status queries
            $table->index(['status', 'type']);
            $table->index(['post_id', 'type']);
            $table->timestamps();
        });

        // Create system_settings table
        Schema::create('system_settings', function (Blueprint $table) {
            $table->id();
            $table->string('key')->unique();
            $table->text('value')->nullable();
            $table->string('description')->nullable();
            $table->enum('type', ['string', 'number', 'boolean', 'json'])->default('string');
            $table->timestamps();
        });

        // Data migration: Fix any existing records that might have inconsistent states
        // This ensures the workflow operates correctly for both new and existing data
        if (config('database.default') !== 'sqlite') {
            DB::statement("
                -- Fix any customer_verified transactions that should be approved
                UPDATE balance_transactions 
                SET status = 'approved', 
                    approved_at = payment_verified_at,
                    approved_by = NULL
                WHERE status = 'customer_verified' 
                  AND payment_verified = 1 
                  AND type = 'errand_payment'
            ");

            DB::statement("
                -- Ensure payment_verified flag is set correctly for approved errand payments
                UPDATE balance_transactions 
                SET payment_verified = 1,
                    payment_verified_at = COALESCE(payment_verified_at, approved_at, updated_at)
                WHERE status = 'approved' 
                  AND type = 'errand_payment'
                  AND payment_verified = 0
            ");

            DB::statement("
                -- Fix posts that should be in runner_completed status
                UPDATE posts p
                INNER JOIN balance_transactions bt ON p.id = bt.post_id
                SET p.status = 'runner_completed',
                    p.completed_at = COALESCE(p.completed_at, bt.approved_at, bt.updated_at)
                WHERE p.status = 'accepted'
                  AND bt.status = 'approved'
                  AND bt.type = 'errand_payment'
                  AND bt.payment_verified = 1
                  AND p.runner_id IS NOT NULL
            ");

            DB::statement("
                -- Ensure archived flag is set for completed posts
                UPDATE posts 
                SET archived = 1
                WHERE status = 'completed' 
                  AND archived = 0
            ");
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('balance_transactions');
        Schema::dropIfExists('runner_balances');
        Schema::dropIfExists('reports');
        Schema::dropIfExists('notifications');
        Schema::dropIfExists('messages');
        Schema::dropIfExists('posts');
        Schema::dropIfExists('system_settings');
        Schema::dropIfExists('failed_jobs');
        Schema::dropIfExists('job_batches');
        Schema::dropIfExists('jobs');
        Schema::dropIfExists('cache_locks');
        Schema::dropIfExists('cache');
        Schema::dropIfExists('sessions');
        Schema::dropIfExists('password_reset_tokens');
        Schema::dropIfExists('users');
    }
}; 