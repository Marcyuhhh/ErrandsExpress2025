<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Models\User;

class Post extends Model
{
    use HasFactory;

    protected $fillable = [
        'content',
        'deadline_date',
        'deadline_time',
        'destination',
        'image_url',
        'status',
        'in_inbox',
        'user_id',
        'runner_id',
        'completed_at',
        'confirmed_at',
        'archived',
        'is_reported',
        'payment_verified',
        'payment_verified_at',
    ];

    protected $casts = [
        'deadline_date' => 'date',
        'completed_at' => 'datetime',
        'confirmed_at' => 'datetime',
        'in_inbox' => 'boolean',
        'archived' => 'boolean',
        'is_reported' => 'boolean',
        'payment_verified' => 'boolean',
        'payment_verified_at' => 'datetime',
    ];

    // Relationship with user who created the post
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    // Relationship with runner who accepted the post
    public function runner()
    {
        return $this->belongsTo(User::class, 'runner_id');
    }

    // Relationship with reports
    public function reports()
    {
        return $this->hasMany(Report::class);
    }

    // Relationship with notifications
    public function notifications()
    {
        return $this->hasMany(Notification::class);
    }
}
