<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\SystemSetting;
use Tymon\JWTAuth\Facades\JWTAuth;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;

class SystemSettingController extends Controller
{
    /**
     * Get GCash payment information
     */
    public function getGCashInfo()
    {
        try {
            return response()->json([
                'gcash_info' => SystemSetting::getGCashInfo()
            ]);
        } catch (\Exception $e) {
            Log::error('Error getting GCash info: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to get GCash information'], 500);
        }
    }

    /**
     * Update GCash settings (Admin only)
     */
    public function updateGCashSettings(Request $request)
    {
        try {
            Log::info('GCash settings update attempt', $request->all());
            
            // Check authentication
            $admin = JWTAuth::parseToken()->authenticate();
            
            if (!$admin) {
                Log::error('No authenticated user found');
                return response()->json(['error' => 'Authentication required'], 401);
            }
            
            if (!$admin->is_admin) {
                Log::error('Non-admin user attempted to update GCash settings', ['user_id' => $admin->id]);
                return response()->json(['error' => 'Admin access required'], 403);
            }

            // Validate input
            $validated = $request->validate([
                'gcash_number' => 'required|string|max:15',
                'gcash_account_name' => 'required|string|max:100'
            ]);

            Log::info('Validation passed', $validated);

            // Update settings
            SystemSetting::set('gcash_number', $validated['gcash_number'], 'GCash phone number for balance payments');
            SystemSetting::set('gcash_account_name', $validated['gcash_account_name'], 'GCash account name for balance payments');

            Log::info('GCash settings updated successfully');

            return response()->json([
                'message' => 'GCash settings updated successfully',
                'gcash_info' => SystemSetting::getGCashInfo()
            ]);

        } catch (ValidationException $e) {
            Log::error('Validation error: ' . json_encode($e->errors()));
            return response()->json(['error' => 'Validation failed', 'details' => $e->errors()], 422);
        } catch (\Exception $e) {
            Log::error('Error updating GCash settings: ' . $e->getMessage());
            Log::error('Stack trace: ' . $e->getTraceAsString());
            return response()->json(['error' => 'Failed to update GCash settings', 'details' => $e->getMessage()], 500);
        }
    }
} 