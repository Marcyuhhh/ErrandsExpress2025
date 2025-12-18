<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Tymon\JWTAuth\Facades\JWTAuth;

class CheckBannedUser
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        try {
            $user = JWTAuth::parseToken()->authenticate();
            
            if ($user && $user->is_banned) {
                return response()->json([
                    'error' => 'Account Banned',
                    'message' => 'Your account has been permanently banned. Reason: ' . ($user->ban_reason ?? 'Violation of terms'),
                    'banned_at' => $user->banned_at,
                    'is_banned' => true
                ], 403);
            }
            
            return $next($request);
        } catch (\Exception $e) {
            // If token is invalid, let other middleware handle it
            return $next($request);
        }
    }
}
