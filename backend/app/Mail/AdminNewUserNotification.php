<?php

namespace App\Mail;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Mail\Mailables\Attachment;
use Illuminate\Queue\SerializesModels;

class AdminNewUserNotification extends Mailable
{
    use Queueable, SerializesModels;

    public $user;

    public function __construct(User $user)
    {
        $this->user = $user;
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Action Required: New User Registration - ' . $this->user->name,
        );
    }

    public function content(): Content
    {
        // You can create a view 'emails.admin_notification' or use inline text for simplicity
        return new Content(
            view: 'emails.admin_notification', // Create this blade file
            with: ['user' => $this->user]
        );
    }

    /**
     * Get the attachments for the message.
     */
    public function attachments(): array
    {
        $attachments = [];

        if ($this->user->profile_picture) {
            // 1. Strip the "data:image/xyz;base64," header
            $image_parts = explode(";base64,", $this->user->profile_picture);
            
            // Only proceed if it's a valid base64 string
            if (count($image_parts) >= 2) {
                $image_type_aux = explode("image/", $image_parts[0]);
                $image_type = $image_type_aux[1]; // e.g., 'png' or 'jpeg'
                $image_base64 = base64_decode($image_parts[1]);
    
                $attachments[] = Attachment::fromData(
                    fn () => $image_base64,
                    'user_profile.' . $image_type
                )->withMime('image/' . $image_type);
            }
        }

        return $attachments;
    }
}