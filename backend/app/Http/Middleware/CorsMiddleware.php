<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class CorsMiddleware
{
    public function handle(Request $request, Closure $next)
    {
        // 1. Define your allowed list (Keeping your Localhost entries!)
        $allowedOrigins = [
            env('FRONTEND_URL'),
            'https://errandsexpress.up.railway.app', 
            'http://localhost:5173',
            'http://localhost:3000',
            'http://127.0.0.1:5173',
            'http://127.0.0.1:3000',
        ];

        // 2. SAFETY FIX: Remove empty values (in case env('FRONTEND_URL') is null)
        // This prevents the system from breaking if the .env file is missing a value
        $allowedOrigins = array_filter($allowedOrigins);

        $origin = $request->header('Origin');
        
        // 3. Logic: If the request comes from a trusted origin, allow it.
        // Otherwise, default to the first valid origin in your list (usually the Railway URL)
        if (in_array($origin, $allowedOrigins)) {
            $allowOrigin = $origin;
        } else {
            // Safe fallback that won't crash
            $allowOrigin = !empty($allowedOrigins) ? reset($allowedOrigins) : 'http://localhost:5173';
        }

        // Handle preflight OPTIONS request
        if ($request->getMethod() === "OPTIONS") {
            return response('OK', 200)
                ->header('Access-Control-Allow-Origin', $allowOrigin)
                ->header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH')
                ->header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin, X-CSRF-TOKEN')
                ->header('Access-Control-Allow-Credentials', 'true');
        }

        $response = $next($request);

        // Attach headers to the actual response
        $response->headers->set('Access-Control-Allow-Origin', $allowOrigin);
        $response->headers->set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
        $response->headers->set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin, X-CSRF-TOKEN');
        $response->headers->set('Access-Control-Allow-Credentials', 'true');

        return $response;
    }
}