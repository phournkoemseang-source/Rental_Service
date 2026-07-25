<?php

use App\Http\Controllers\Api\AdminController;
use App\Http\Controllers\Api\BookingController;
use App\Http\Controllers\Api\BookingStatusLogController;
use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\CityController;
use App\Http\Controllers\Api\CouponController;
use App\Http\Controllers\Api\DamageReportController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\FeedbackController;
use App\Http\Controllers\Api\HistoryController;
use App\Http\Controllers\Api\LoyaltyPointController;
use App\Http\Controllers\Api\PaymentController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\MessageController;
use App\Http\Controllers\Api\ShopController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\VehicleController;
use App\Http\Controllers\Api\RatingController;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

// Public authentication routes
// Route::post('/register', [AuthController::class, 'register']);
// Route::post('/login', [UserController::class, 'login']);
// Route::post('/users/register', [AuthController::class, 'register']);
// Route::post('/users/login', [UserController::class, 'login']);

// Auth routes with /auth prefix
Route::post('/auth/register', [AuthController::class, 'register']);
Route::post('/auth/login', [AuthController::class, 'login']);

// Alias routes for frontend compatibility
Route::post('/register', [AuthController::class, 'register']);
Route::post('/users/register', [AuthController::class, 'register']);

// Protected auth routes - require authentication
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::get('/auth/me', [AuthController::class, 'me']);
});

Route::middleware('auth:sanctum')->get('/auth-user', function (Request $request) {
    return $request->user();
});

Route::get('/test', function () {
    return response()->json([
        'message' => 'Hello from Laravel Backend',
    ]);
});

Route::get('/admin/exists', function () {
    $hasAdmin = User::where('role', 'admin')->exists();
    return response()->json(['has_admin' => $hasAdmin]);
});

// Protected routes - require authentication
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/users/logout', [UserController::class, 'logout']);
    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::post('/notifications', [NotificationController::class, 'store']);
    Route::patch('/notifications/{notification}', [NotificationController::class, 'update']);
    Route::patch('/notifications/mark-all', [NotificationController::class, 'markAllAsRead']);
    Route::apiResource('messages', MessageController::class)->only(['index', 'store']);
});

// Admin only routes
Route::middleware(['auth:sanctum', 'role:admin'])->group(function () {
    Route::apiResource('users', UserController::class)->except(['create', 'edit']);
    Route::apiResource('categories', CategoryController::class);
    Route::apiResource('cities', CityController::class)->except(['index']);
    Route::get('admin/stats', [AdminController::class, 'stats']);
});

// Public cities endpoint - needed for dropdowns in shop creation forms
Route::get('/cities', [CityController::class, 'index']);

// Public coupons listing for customer promotions page
Route::get('/coupons', [CouponController::class, 'index']);
Route::get('/coupons/check', [CouponController::class, 'check']);
Route::get('/coupons/by-shop', [CouponController::class, 'byShop']);

// Admin + Shop Owner shared routes (coupons & loyalty points management)
Route::middleware(['auth:sanctum', 'role:admin,shop_owner'])->group(function () {
    Route::apiResource('coupons', CouponController::class)->except(['index']);
    Route::apiResource('loyalty-points', LoyaltyPointController::class);
});

// User routes - make update public for testing (remove auth for now)
Route::put('/users/{user}', [UserController::class, 'update']);

// Authenticated user routes
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/users/{user}/avatar', [UserController::class, 'uploadAvatar']);
    Route::delete('/users/{user}/avatar', [UserController::class, 'removeAvatar']);
});

// Profile settings routes (from feature/setting.user)
// These routes require authentication - MUST be after auth:sanctum is defined
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/users/{id}/update-profile', [UserController::class, 'updateProfile']);
    Route::post('/users/{id}/change-password', [UserController::class, 'changePassword']);
    Route::post('/users/{id}/avatar', [UserController::class, 'uploadAvatar']);
    Route::delete('/users/{id}/avatar', [UserController::class, 'removeAvatar']);
});

// Public shop routes (for customer/user shop listing)
Route::get('/shops', [ShopController::class, 'index']);
Route::get('/shops/{shop}', [ShopController::class, 'show']);

// Public vehicle ratings (view only, no auth required)
Route::get('/vehicle-ratings', [RatingController::class, 'vehicleRatings']);
Route::get('/vehicle-ratings-summary', [RatingController::class, 'vehicleRatingsSummary']);
Route::get('/shop-rating', [RatingController::class, 'shopAverageRating']);

// Public vehicle routes (for customers to view vehicles)
Route::get('/vehicles', [VehicleController::class, 'index']);
Route::get('/vehicles/{vehicle}', [VehicleController::class, 'show']);

// Protected vehicle routes - require authentication for create, update, delete
Route::middleware('auth:sanctum')->group(function () {
    
    // Shop owner can create, update, delete their own vehicles
    Route::post('/vehicles', [VehicleController::class, 'store']);
    Route::put('/vehicles/{vehicle}', [VehicleController::class, 'update']);
    Route::delete('/vehicles/{vehicle}', [VehicleController::class, 'destroy']);
    Route::apiResource('shops', ShopController::class)->except(['index', 'show']);
    Route::get('/my-shop', [ShopController::class, 'myShop']);
    Route::apiResource('bookings', BookingController::class);
    Route::post('/bookings/{booking}/rating', [RatingController::class, 'store']);
    Route::get('/vehicle-ratings', [RatingController::class, 'vehicleRatings']);
    Route::get('/vehicle-ratings-summary', [RatingController::class, 'vehicleRatingsSummary']);
    Route::apiResource('damage-reports', DamageReportController::class);
    Route::apiResource('feedback', FeedbackController::class);
    Route::apiResource('histories', HistoryController::class);
    Route::apiResource('payments', PaymentController::class);
});

// Shop dashboard payments derived from bookings
Route::middleware(['auth:sanctum', 'role:admin,shop_owner'])->get('/shop-payments', [PaymentController::class, 'shopPayments']);

// Customer routes (accessible by all authenticated users)
Route::middleware('auth:sanctum')->group(function () {
    // Customer can view their own bookings
    Route::get('/my-bookings', [BookingController::class, 'customerBookings']);
    // Shop owner can view bookings for their shop
    Route::get('/shop-bookings', [BookingController::class, 'shopOwnerBookings']);
});
