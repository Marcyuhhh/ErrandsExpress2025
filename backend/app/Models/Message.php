<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Message extends Model
{
    use HasFactory;

    protected $fillable = [
        'post_id',
        'sender_id',
        'receiver_id',
        'message',
        'is_read',
        'expires_at',
    ];

    protected $casts = [
        'is_read' => 'boolean',
        'expires_at' => 'datetime',
    ];

    // Relationship with post
    public function post()
    {
        return $this->belongsTo(Post::class);
    }

    // Relationship with sender
    public function sender()
    {
        return $this->belongsTo(User::class, 'sender_id');
    }

    // Relationship with receiver
    public function receiver()
    {
        return $this->belongsTo(User::class, 'receiver_id');
    }

    // Scope for active messages (not expired)
    public function scopeActive($query)
    {
        return $query->where(function ($q) {
            $q->whereNull('expires_at')
              ->orWhere('expires_at', '>', now());
        });
    }

    // Scope for unread messages
    public function scopeUnread($query)
    {
        return $query->where('is_read', false);
    }
} 