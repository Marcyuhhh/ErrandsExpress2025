<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\User;
use App\Models\Notification;
use Tymon\JWTAuth\Facades\JWTAuth;
use Tymon\JWTAuth\Exceptions\JWTException;
use Tymon\JWTAuth\Exceptions\TokenExpiredException;
use Tymon\JWTAuth\Exceptions\TokenInvalidException;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail; // Add this import
use App\Mail\AdminNewUserNotification; // Add this import

class UserController extends Controller
{
    public function register(Request $request)
    {
        // Handle preflight OPTIONS request
        if ($request->getMethod() === 'OPTIONS') {
            return response('', 200)
                ->header('Access-Control-Allow-Origin', '*')
                ->header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
                ->header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept')
                ->header('Access-Control-Max-Age', '86400');
        }

        // Log the request for debugging
        \Log::info('Registration request received', ['email' => $request->email]);

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:225',
            'firstname' => 'nullable|string|max:225',
            'lastname' => 'nullable|string|max:225',
            'middle_initial' => 'nullable|string|max:5',
            'email' => 'required|string|email|unique:users,email',
            'password' => 'required|string|min:8|max:30',
            'birthdate' => 'required|date',
            'school_id_no' => 'nullable|string|max:50',
            'profile_picture' => 'nullable|string', // Base64 encoded image
            'verification_image' => 'nullable|string', // Base64 encoded image
        ]);

        if ($validator->fails()) {
            \Log::warning('Registration validation failed', $validator->errors()->toArray());
            return response()->json(['errors' => $validator->errors()], 422)
                ->header('Access-Control-Allow-Origin', '*')
                ->header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
                ->header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');
        }

        // Validate base64 images if provided
        if ($request->profile_picture && !$this->isValidBase64Image($request->profile_picture)) {
            return response()->json(['errors' => ['profile_picture' => ['Invalid profile picture format']]], 422)
                ->header('Access-Control-Allow-Origin', '*')
                ->header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
                ->header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');
        }

        if ($request->verification_image && !$this->isValidBase64Image($request->verification_image)) {
            return response()->json(['errors' => ['verification_image' => ['Invalid verification image format']]], 422)
                ->header('Access-Control-Allow-Origin', '*')
                ->header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
                ->header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');
        }

        try {
            // Extract firstname and lastname from name if not provided
            $firstname = $request->firstname;
            $lastname = $request->lastname;
            
            if (!$firstname || !$lastname) {
                $nameParts = explode(' ', trim($request->name));
                $firstname = $firstname ?: $nameParts[0];
                $lastname = $lastname ?: (isset($nameParts[1]) ? implode(' ', array_slice($nameParts, 1)) : '');
            }

            $user = User::create([
                'name' => $request->name,
                'firstname' => $firstname,
                'lastname' => $lastname,
                'middle_initial' => $request->middle_initial,
                'email' => $request->email,
                'password' => Hash::make($request->password),
                'birthdate' => $request->birthdate,
                'school_id_no' => $request->school_id_no ?: 'TBU', // Default value if not provided
                'profile_picture' => $request->profile_picture,
                'verification_image' => $request->verification_image,
                'is_verified' => false, // User needs admin approval after completing profile
                'is_admin' => false,
            ]);

            \Log::info('User registered successfully', ['user_id' => $user->id, 'email' => $user->email]);

            // --- SEND EMAIL TO ADMIN START ---
        try {
            $adminEmail = env('ADMIN_EMAIL'); 
            if ($adminEmail) {
                Mail::to($adminEmail)->send(new AdminNewUserNotification($user));
                \Log::info('Admin notification email sent to ' . $adminEmail);
            } else {
                \Log::warning('ADMIN_EMAIL not set in .env');
            }
        } catch (\Exception $e) {
            \Log::error('Failed to send admin email: ' . $e->getMessage());
        }
        // --- SEND EMAIL TO ADMIN END ---

            return response()->json([
                'message' => 'Registration successful! Please complete your profile information after logging in.',
                'user' => $user->makeHidden(['password']),
                'profile_complete' => $this->isProfileComplete($user),
            ], 201)
                ->header('Access-Control-Allow-Origin', '*')
                ->header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
                ->header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');
        } catch (\Exception $e) {
            \Log::error('Registration failed', ['error' => $e->getMessage(), 'trace' => $e->getTraceAsString()]);
            return response()->json(['error' => 'Registration failed. Please try again.'], 500)
                ->header('Access-Control-Allow-Origin', '*')
                ->header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
                ->header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');
        }
    }

    // Helper method to validate base64 image
    private function isValidBase64Image($data)
    {
        if (!$data || !is_string($data)) {
            return false;
        }

        // Check if it starts with data:image/
        if (!preg_match('/^data:image\/(jpeg|jpg|png|gif|webp);base64,/', $data)) {
            return false;
        }

        // Extract the base64 part
        $base64Data = preg_replace('/^data:image\/[^;]+;base64,/', '', $data);
        
        // Validate base64
        if (!base64_decode($base64Data, true)) {
            return false;
        }

        return true;
    }

    // Helper method to check if profile is complete
    private function isProfileComplete($user)
    {
        return !empty($user->school_id_no) && 
               $user->school_id_no !== 'TBU' && 
               !empty($user->verification_image) &&
               !empty($user->firstname) &&
               !empty($user->lastname);
    }

    public function login(Request $request)
    {
        $request->validate([
            'email'    => 'required|email',
            'password' => 'required|string|min:8|max:30',
        ]);

        $user = User::where('email', $request->email)->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            return response()->json(['error' => 'Invalid email or password'], 401);
        }

        // Block unverified users from logging in (except admins)
        if (!$user->is_verified && !$user->is_admin) {
            return response()->json([
                'error' => 'Account pending verification',
                'message' => 'Your account is pending verification by an administrator. Please wait for approval before logging in.'
            ], 403);
        }

        $profileComplete = $this->isProfileComplete($user);
        $token = JWTAuth::fromUser($user);

        return response()->json([
            'message' => 'Login successful',
            'user'    => $user->makeHidden(['password']),
            'token'   => $token,
            'profile_complete' => $profileComplete,
            'requires_verification' => !$user->is_verified,
        ], 200);
    }

    public function dashboard()
    {
        try {
            // Check if token exists in the request
            $token = JWTAuth::getToken();
            if (!$token) {
                return response()->json(['error' => 'No token provided'], 401);
            }

            $user = JWTAuth::parseToken()->authenticate();
            
            if (!$user) {
                return response()->json(['error' => 'User not found'], 404);
            }

            return response()->json([
                'message' => 'Welcome to your dashboard',
                'user' => $user,
                'profile_complete' => $this->isProfileComplete($user),
            ]);
        } catch (TokenExpiredException $e) {
            return response()->json(['error' => 'Token has expired', 'details' => $e->getMessage()], 401);
        } catch (TokenInvalidException $e) {
            return response()->json(['error' => 'Invalid token', 'details' => $e->getMessage()], 401);
        } catch (JWTException $e) {
            return response()->json(['error' => 'Token not found or malformed', 'details' => $e->getMessage()], 401);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Authentication failed', 'details' => $e->getMessage()], 500);
        }
    }

    public function logout()
    {
        try {
            $token = JWTAuth::getToken();

            if (!$token) {
                return response()->json(['error' => 'Token not provided'], 401);
            }

            JWTAuth::invalidate($token);

            return response()->json(['message' => 'Logged out successfully'], 200);
        } catch (JWTException $e) {
            return response()->json(['error' => 'Failed to log out, token invalid'], 401);
        }
    }

    // Admin function to verify user
    public function verifyUser(Request $request, $userId)
    {
        $admin = JWTAuth::parseToken()->authenticate();
        
        if (!$admin->is_admin) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $user = User::findOrFail($userId);
        $action = $request->input('action'); // 'approve' or 'reject'

        if ($action === 'approve') {
            $user->is_verified = true;
            $user->save();

            // Create notification for user
            Notification::create([
                'user_id' => $user->id,
                'type' => 'verification_approved',
                'title' => 'Account Verified',
                'message' => 'Your account has been verified and you can now login.',
            ]);

            return response()->json(['message' => 'User verified successfully']);
        } elseif ($action === 'reject') {
            // Create notification for user
            Notification::create([
                'user_id' => $user->id,
                'type' => 'verification_rejected',
                'title' => 'Account Verification Rejected',
                'message' => 'Your account verification was rejected. Please contact support.',
            ]);

            // Optionally delete the user or keep for records
            return response()->json(['message' => 'User verification rejected']);
        }

        return response()->json(['error' => 'Invalid action'], 400);
    }

    // Get pending verification users (admin only)
    public function getPendingUsers()
    {
        $admin = JWTAuth::parseToken()->authenticate();
        
        if (!$admin->is_admin) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $pendingUsers = User::where('is_verified', false)->get();
        
        return response()->json($pendingUsers);
    }

    // Update user profile
    public function updateProfile(Request $request)
    {
        $user = JWTAuth::parseToken()->authenticate();

        $validator = Validator::make($request->all(), [
            'firstname' => 'sometimes|string|max:225',
            'lastname' => 'sometimes|string|max:225',
            'middle_initial' => 'sometimes|nullable|string|max:5',
            'birthdate' => 'sometimes|date',
            'gender' => 'sometimes|nullable|in:male,female,other,prefer_not_to_say',
            'school_id_no' => 'sometimes|string|max:50',
            'profile_picture' => 'sometimes|nullable|string',
            'verification_image' => 'sometimes|nullable|string',
            'gcash_number' => 'sometimes|nullable|string|max:20',
            'gcash_name' => 'sometimes|nullable|string|max:100',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        // Prepare update data
        $updateData = $request->only([
            'firstname', 'lastname', 'middle_initial', 
            'birthdate', 'gender', 'school_id_no', 'gcash_number', 'gcash_name'
        ]);

        // Handle profile picture
        if ($request->has('profile_picture') && !empty($request->profile_picture)) {
            // Validate base64 image
            if (strpos($request->profile_picture, 'data:image/') === 0) {
                $updateData['profile_picture'] = $request->profile_picture;
            }
        }

        // Handle verification image
        if ($request->has('verification_image') && !empty($request->verification_image)) {
            // Validate base64 image
            if (strpos($request->verification_image, 'data:image/') === 0) {
                $updateData['verification_image'] = $request->verification_image;
            }
        }

        // Update name if first/last name changed
        if (isset($updateData['firstname']) || isset($updateData['lastname'])) {
            $firstname = $updateData['firstname'] ?? $user->firstname;
            $lastname = $updateData['lastname'] ?? $user->lastname;
            $updateData['name'] = trim($firstname . ' ' . $lastname);
        }

        // Update user without MySQL-specific commands
        try {
            $user->update($updateData);

            return response()->json([
                'message' => 'Profile updated successfully',
                'user' => $user->makeHidden(['password'])
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to update profile.',
                'details' => $e->getMessage()
            ], 500);
        }
    }

    public function updatePassword(Request $request)
    {
        $user = JWTAuth::parseToken()->authenticate();

        $validator = Validator::make($request->all(), [
            'current_password' => 'required|string',
            'new_password' => 'required|string|min:8|max:30|confirmed',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        // Check if current password is correct
        if (!Hash::check($request->current_password, $user->password)) {
            return response()->json(['error' => 'Current password is incorrect'], 400);
        }

        try {
            $user->update([
                'password' => Hash::make($request->new_password)
            ]);

            return response()->json([
                'message' => 'Password updated successfully'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to update password.',
                'details' => $e->getMessage()
            ], 500);
        }
    }

    public function checkAuth()
    {
        try {
            $token = JWTAuth::getToken();
            if (!$token) {
                return response()->json(['authenticated' => false, 'error' => 'No token provided'], 401);
            }

            $user = JWTAuth::parseToken()->authenticate();
            
            if (!$user) {
                return response()->json(['authenticated' => false, 'error' => 'User not found'], 401);
            }

            return response()->json([
                'authenticated' => true,
                'user_id' => $user->id,
                'email' => $user->email,
                'name' => $user->name,
                'is_verified' => $user->is_verified,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'authenticated' => false, 
                'error' => 'Token invalid or expired',
                'details' => $e->getMessage()
            ], 401);
        }
    }

    public function getUserById($id)
    {
        try {
            // Authenticate the requesting user
            $currentUser = JWTAuth::parseToken()->authenticate();
            
            if (!$currentUser) {
                return response()->json(['error' => 'Unauthorized'], 401);
            }

            \Log::info('getUserById called', [
                'requested_user_id' => $id,
                'requesting_user_id' => $currentUser->id,
                'requesting_user_email' => $currentUser->email
            ]);

            $user = User::find($id);
            
            if (!$user) {
                \Log::warning('User not found', ['requested_user_id' => $id]);
                return response()->json(['error' => 'User not found'], 404);
            }

            \Log::info('User found and returning data', [
                'found_user_id' => $user->id,
                'found_user_email' => $user->email,
                'found_user_name' => $user->name,
                'has_gcash_number' => !empty($user->gcash_number),
                'has_gcash_name' => !empty($user->gcash_name)
            ]);

            // Return only necessary public information (not sensitive data)
            return response()->json([
                'id' => $user->id,
                'name' => $user->name,
                'firstname' => $user->firstname,
                'lastname' => $user->lastname,
                'gcash_number' => $user->gcash_number,
                'gcash_name' => $user->gcash_name,
                'profile_picture' => $user->profile_picture,
            ]);
        } catch (TokenExpiredException $e) {
            return response()->json(['error' => 'Token has expired'], 401);
        } catch (TokenInvalidException $e) {
            return response()->json(['error' => 'Token is invalid'], 401);
        } catch (JWTException $e) {
            return response()->json(['error' => 'Token not provided'], 401);
        } catch (\Exception $e) {
            \Log::error('Error in getUserById', [
                'requested_user_id' => $id,
                'error' => $e->getMessage()
            ]);
            return response()->json(['error' => 'Failed to fetch user'], 500);
        }
    }
}
