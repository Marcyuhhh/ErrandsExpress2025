<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Tymon\JWTAuth\Contracts\JWTSubject;

class User extends Authenticatable implements JWTSubject
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasFactory, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'firstname',
        'lastname',
        'middle_initial',
        'email',
        'password',
        'birthdate',
        'gender',
        'school_id_no',
        'profile_picture',
        'gcash_number',
        'gcash_name',
        'verification_image',
        'is_verified',
        'is_admin',
        'points',
        'is_banned',
        'banned_at',
        'ban_reason',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'birthdate' => 'date',
            'is_verified' => 'boolean',
            'is_admin' => 'boolean',
            'is_banned' => 'boolean',
            'banned_at' => 'datetime',
        ];
    }

    public function getJWTIdentifier()
    {
        return $this->getKey();
    }
    
    public function getJWTCustomClaims()
    {
        return [];
    }

    // Relationship with posts
    public function posts()
    {
        return $this->hasMany(Post::class);
    }

    // Relationship with posts as runner
    public function acceptedPosts()
    {
        return $this->hasMany(Post::class, 'runner_id');
    }

    // Relationship with reports made
    public function reportsMade()
    {
        return $this->hasMany(Report::class, 'reporter_id');
    }

    // Relationship with reports received
    public function reportsReceived()
    {
        return $this->hasMany(Report::class, 'reported_user_id');
    }

    // Relationship with runner balance
    public function runnerBalance()
    {
        return $this->hasOne(RunnerBalance::class, 'runner_id');
    }

    // Relationship with balance transactions
    public function balanceTransactions()
    {
        return $this->hasMany(BalanceTransaction::class, 'runner_id');
    }
}
