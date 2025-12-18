<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Report extends Model
{
    use HasFactory;

    protected $fillable = [
        'post_id',
        'reporter_id',
        'reported_user_id',
        'type',
        'description',
        'status',
        'reviewed_by',
        'reviewed_at',
    ];

    protected $casts = [
        'reviewed_at' => 'datetime',
    ];

    // Relationship with the reported post
    public function post()
    {
        return $this->belongsTo(Post::class);
    }

    // Relationship with the user who made the report
    public function reporter()
    {
        return $this->belongsTo(User::class, 'reporter_id');
    }

    // Relationship with the user being reported
    public function reportedUser()
    {
        return $this->belongsTo(User::class, 'reported_user_id');
    }

    // Relationship with admin who reviewed the report
    public function reviewer()
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }
} 