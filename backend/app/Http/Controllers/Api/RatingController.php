<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\ShopContext;
use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\Rating;
use App\Models\Vehicle;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class RatingController extends Controller
{
    use ShopContext;

    /**
     * Get all vehicle ratings with feedback (for shop owner review page)
     */
    public function vehicleRatings(Request $request)
    {
        // Check for specific shop_id in query params
        $requestedShopId = $request->query('shop_id');
        $userShopIds = $this->getShopIdsFromUser($request);
        
        $shopIds = [];
        if ($requestedShopId) {
            // If specific shop_id requested, verify ownership
            if (!empty($userShopIds) && in_array($requestedShopId, $userShopIds)) {
                $shopIds = [(int)$requestedShopId];
            } else {
                $shopIds = [0]; // Non-existent to return empty
            }
        } else {
            $shopIds = $userShopIds;
        }
        
        // Get ratings with vehicle and user information
        $ratings = Rating::with(['vehicle', 'user', 'booking'])
            ->when(!empty($shopIds), function($query) use ($shopIds) {
                return $query->whereIn('shop_id', $shopIds);
            })
            ->when(empty($shopIds), function($query) {
                return $query->whereRaw('0 = 1');
            })
            ->orderBy('created_at', 'desc')
            ->paginate(15);

        return response()->json($ratings);
    }

    /**
     * Get average rating for a specific shop
     */
    public function shopAverageRating(Request $request)
    {
        // Check for specific shop_id in query params
        $requestedShopId = $request->query('shop_id');
        $userShopIds = $this->getShopIdsFromUser($request);
        
        $shopIds = [];
        if ($requestedShopId) {
            // If specific shop_id requested, verify ownership
            if (!empty($userShopIds) && in_array($requestedShopId, $userShopIds)) {
                $shopIds = [(int)$requestedShopId];
            } else {
                $shopIds = [0]; // Non-existent to return empty results
            }
        } else {
            $shopIds = $userShopIds;
        }
        
        if (empty($shopIds)) {
            return response()->json(['average_rating' => 0, 'total_ratings' => 0]);
        }
        
        $ratings = Rating::whereIn('shop_id', $shopIds);
        $totalRatings = $ratings->count();
        $averageRating = $totalRatings > 0 ? round($ratings->avg('rating'), 1) : 0;
        
        return response()->json([
            'average_rating' => $averageRating,
            'total_ratings' => $totalRatings
        ]);
    }

    /**
     * Get ratings grouped by vehicle (summary) - only vehicles with ratings
     */
    public function vehicleRatingsSummary(Request $request)
    {
        // Check for specific shop_id in query params
        $requestedShopId = $request->query('shop_id');
        $requestedVehicleId = $request->query('vehicle_id');
        $userShopIds = $this->getShopIdsFromUser($request);
        
        $shopIds = [];
        if ($requestedShopId) {
            // If specific shop_id requested, verify ownership
            if (!empty($userShopIds) && in_array($requestedShopId, $userShopIds)) {
                $shopIds = [(int)$requestedShopId];
            } else {
                $shopIds = [0]; // Non-existent to return empty
            }
        } else {
            $shopIds = $userShopIds;
        }
        
        // If vehicle_id is passed, we can skip shop ownership check (public endpoint)
        if ($requestedVehicleId && !$requestedShopId) {
            $shopIds = []; // Allow public access for specific vehicle
        }
        
        if (empty($shopIds) && !$requestedVehicleId) {
            return response()->json([]);
        }

        $vehicleQuery = Vehicle::query();
        
        // Filter by vehicle_id if provided
        if ($requestedVehicleId) {
            $vehicleQuery->where('id', (int)$requestedVehicleId);
        }
        
        $vehicleQuery->whereHas('directRatings', function($query) use ($shopIds) {
            if (!empty($shopIds)) {
                $query->whereIn('shop_id', $shopIds);
            }
        });
        
        if (!empty($shopIds)) {
            $vehicleQuery->whereIn('shop_id', $shopIds);
        }

        // Get vehicles that have ratings
        $vehicles = $vehicleQuery
            ->withCount(['directRatings' => function($query) use ($shopIds) {
                if (!empty($shopIds)) {
                    $query->whereIn('shop_id', $shopIds);
                }
            }])
            ->with(['directRatings' => function($query) use ($shopIds) {
                if (!empty($shopIds)) {
                    $query->whereIn('shop_id', $shopIds);
                }
                $query->with('user');
                $query->orderBy('created_at', 'desc');
            }])
            ->get()
            ->map(function($vehicle) {
                $vehicleRatings = $vehicle->directRatings;
                $avgRating = $vehicleRatings->avg('rating');
                $totalRatings = $vehicleRatings->count();
                
                return [
                    'id' => $vehicle->id,
                    'vehicle_name' => $vehicle->name ?: ($vehicle->brand . ' ' . $vehicle->model),
                    'vehicle_image' => $vehicle->image_url_full,
                    'average_rating' => $avgRating ? round($avgRating, 1) : 0,
                    'total_ratings' => $totalRatings,
                    'ratings' => $vehicleRatings->map(function($r) {
                        return [
                            'id' => $r->id,
                            'rating' => $r->rating,
                            'comment' => $r->comment,
                            'user_name' => $r->user?->name ?? 'Anonymous',
                            'user_profile_picture' => $r->user?->avatar_url,
                            'created_at' => $r->created_at,
                        ];
                    })
                ];
            });

        return response()->json($vehicles);
    }
    public function store(Request $request, Booking $booking)
    {
        $user = Auth::user();
        if (!$user || $booking->user_id !== $user->id) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        // Check if booking is completed - either via status field or status logs
        $isCompleted = false;
        
        // Check the status field
        if ($booking->status === 'completed') {
            $isCompleted = true;
        }
        
        // Check if there's a completed status in the status logs
        if (!$isCompleted && $booking->bookingStatusLogs) {
            $isCompleted = $booking->bookingStatusLogs->contains('status', 'completed');
        }
        
        if (!$isCompleted) {
            return response()->json(['error' => 'Only completed bookings can be rated'], 422);
        }

        if ($booking->rating) {
            return response()->json(['error' => 'Booking already rated'], 409);
        }

        $validated = $request->validate([
            'rating' => ['required', 'integer', 'between:1,5'],
            'comment' => ['nullable', 'string', 'max:1000'],
        ]);

        $rating = Rating::create([
            'booking_id' => $booking->id,
            'vehicle_id' => $booking->vehicle_id,
            'shop_id' => $booking->shop_id,
            'user_id' => $user->id,
            'rating' => $validated['rating'],
            'comment' => $validated['comment'] ?? null,
        ]);

        return response()->json($rating);
    }
}
