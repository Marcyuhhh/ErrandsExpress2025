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
            subject: 'New User Registration: ' . $this->user->name,
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.admin_notification',
        );
    }

    public function attachments(): array
    {
        $attachments = [];
        // Attach profile picture if it exists
        if ($this->user->profile_picture) {
            $image_parts = explode(";base64,", $this->user->profile_picture);
            if (count($image_parts) >= 2) {
                $image_type_aux = explode("image/", $image_parts[0]);
                $image_type = $image_type_aux[1];
                $image_base64 = base64_decode($image_parts[1]);
    
                $attachments[] = Attachment::fromData(
                    fn () => $image_base64,
                    'profile_picture.' . $image_type
                )->withMime('image/' . $image_type);
            }
        }
        return $attachments;
    }
}