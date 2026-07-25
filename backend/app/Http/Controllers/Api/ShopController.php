<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\Payment;
use App\Models\Rating;
use App\Models\Shop;
use App\Services\NotificationService;
use Illuminate\Support\Facades\Log;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Schema;

class ShopController extends Controller
{
    public function index(Request $request)
    {
        $shops = Shop::with(['owner:id,name,email,phone', 'city']);
        
        // Filter to only show shops that have at least one payment
        if ($request->boolean('has_payment', false)) {
            $shops->whereHas('bookings', function ($query) {
                $query->whereHas('payment');
            });
        }
        
        $shops = $shops->orderByDesc('id')->paginate(25);

        // Manually add img_url_full to ensure it's included
        $shopsWithImages = $shops->map(function ($shop) use ($request) {
            // Calculate rating from Rating table based on shop_id
            $shopRatings = Rating::where('shop_id', $shop->id)->get();
            
            // Only include rating and total_reviews if there are ratings for this shop
            $hasRatings = $shopRatings->isNotEmpty();
            $rating = $hasRatings ? round($shopRatings->avg('rating'), 1) : null;
            $totalReviews = $hasRatings ? $shopRatings->count() : null;

            return [
                'id' => $shop->id,
                'owner_id' => $shop->owner_id,
                'city_id' => $shop->city_id,
                'name' => $shop->name,
                'description' => $shop->description,
                'address' => $shop->address,
                'location' => $shop->location,
                'phone' => $shop->phone,
                'img_url' => $shop->img_url,
                'img_url_full' => $this->buildAbsoluteImageUrl($shop->img_url, $request),
                'image' => $this->buildAbsoluteImageUrl($shop->img_url, $request),
                'latitude' => $shop->latitude,
                'longitude' => $shop->longitude,
                'rating' => $rating,
                'total_reviews' => $totalReviews,
                'status' => $shop->status,
                'created_at' => $shop->created_at,
                'updated_at' => $shop->updated_at,
                'owner' => $shop->owner,
                'city' => $shop->city
            ];
        });

        $shops->setCollection($shopsWithImages);

        return response()->json($shops);
    }

    public function store(Request $request)
    {
        // Validate most fields first; img_url is handled separately because it
        // can be either a file upload (multipart) or a plain string URL.
        $payload = $request->validate([
            'city_id' => 'nullable|integer',
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'address' => 'required|string|max:255',
            'location' => 'nullable|string|max:255',
            'phone' => 'nullable|string|max:20',
            'latitude' => 'nullable|numeric',
            'longitude' => 'nullable|numeric',
            'map_url' => 'nullable|string|max:2048',
            'total_reviews' => 'nullable|integer|min:0',
            'status' => 'nullable|string|in:active,inactive',
            // do NOT validate img_url here; see below
        ]);

        if (!$this->shopColumnExists('location')) {
            unset($payload['location']);
        }
        if (!$this->shopColumnExists('map_url')) {
            unset($payload['map_url']);
        }
        
        // handle image validation / payload separately
        if ($request->hasFile('img_url')) {
            // file rule ensures it is an image and not too large
            $request->validate(['img_url' => 'image|max:10240']);
        } elseif ($request->filled('img_url')) {
            // if it's provided as a string we still want to make sure it's not
            // some non-string type (e.g. array) that would break the model
            $request->validate(['img_url' => 'string']);
        }

        // The creator becomes the owner by default.
        $payload['owner_id'] = $request->user()?->id;

        // Handle image upload or URL
        if ($request->hasFile('img_url')) {
            $image = $request->file('img_url');
            $imageName = time() . '_' . uniqid() . '.' . $image->getClientOriginalExtension();
            $image->storeAs('public/shops', $imageName);
            $payload['img_url'] = 'shops/' . $imageName;
        } elseif ($request->input('img_url')) {
            // Accept base64 data URL or regular URL
            $imgUrl = $request->input('img_url');
            // If it's a base64 data URL, decode and save it
            if (preg_match('/^data:image\/(\w+);base64,/', $imgUrl, $matches)) {
                $extension = $matches[1];
                $imageName = time() . '_' . uniqid() . '.' . $extension;
                $imageData = base64_decode(substr($imgUrl, strpos($imgUrl, ',') + 1));
                $path = storage_path('app/public/shops/' . $imageName);
                
                // Ensure directory exists
                if (!file_exists(storage_path('app/public/shops'))) {
                    mkdir(storage_path('app/public/shops'), 0755, true);
                }
                
                file_put_contents($path, $imageData);
                $payload['img_url'] = 'shops/' . $imageName;
            }
            // If it's a regular URL, store it as-is
            elseif (filter_var($imgUrl, FILTER_VALIDATE_URL)) {
                $payload['img_url'] = $imgUrl;
            }
        }

        [$urlLat, $urlLng] = $this->extractCoordinatesFromMapUrl($payload['map_url'] ?? null);
        if (!isset($payload['latitude']) && $urlLat !== null) {
            $payload['latitude'] = $urlLat;
        }
        if (!isset($payload['longitude']) && $urlLng !== null) {
            $payload['longitude'] = $urlLng;
        }

        // If no coordinates provided, attempt to geocode from address
        if (!isset($payload['latitude']) && !isset($payload['longitude'])) {
            [$lat, $lng] = $this->geocodeAddress($payload['address'] ?? null);
            if ($lat && $lng) {
                $payload['latitude'] = $lat;
                $payload['longitude'] = $lng;
            }
        }

        if ($this->shopColumnExists('location') && empty($payload['location'])) {
            $placeName = $this->extractPlaceNameFromMapUrl($payload['map_url'] ?? null);
            if ($placeName) {
                $payload['location'] = $placeName;
            }
        }

        $record = Shop::create($payload);
        try {
            NotificationService::shopCreated($record);
        } catch (\Throwable $exception) {
            Log::warning('Failed to send admin notification for new shop', [
                'error' => $exception->getMessage(),
                'shop_id' => $record->id,
            ]);
        }

        return response()->json($record, 201);
    }

    /**
     * Get the authenticated user's own shop(s).
     */
    public function myShop(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        $shop = Shop::where('owner_id', $user->id)
            ->with(['owner:id,name,email,phone', 'city'])
            ->orderByDesc('id')
            ->first();

        if (!$shop) {
            return response()->json(null, 204);
        }

        $shopRatings = \App\Models\Rating::where('shop_id', $shop->id)->get();
        $hasRatings = $shopRatings->isNotEmpty();
        $rating = $hasRatings ? round($shopRatings->avg('rating'), 1) : null;
        $totalReviews = $hasRatings ? $shopRatings->count() : null;

        return response()->json([
            'id' => $shop->id,
            'owner_id' => $shop->owner_id,
            'city_id' => $shop->city_id,
            'name' => $shop->name,
            'description' => $shop->description,
            'address' => $shop->address,
            'location' => $shop->location,
            'phone' => $shop->phone,
            'img_url' => $shop->img_url,
            'img_url_full' => $this->buildAbsoluteImageUrl($shop->img_url, $request),
            'image' => $this->buildAbsoluteImageUrl($shop->img_url, $request),
            'latitude' => $shop->latitude,
            'longitude' => $shop->longitude,
            'map_url' => $shop->map_url,
            'rating' => $rating,
            'total_reviews' => $totalReviews,
            'status' => $shop->status,
            'created_at' => $shop->created_at,
            'updated_at' => $shop->updated_at,
            'owner' => $shop->owner,
            'city' => $shop->city,
        ]);
    }

    public function show(Shop $shop)
    {
        $shop->load('owner');

        return response()->json([
            'id' => $shop->id,
            'owner_id' => $shop->owner_id,
            'city_id' => $shop->city_id,
            'name' => $shop->name,
            'description' => $shop->description,
            'address' => $shop->address,
            'location' => $shop->location,
            'phone' => $shop->phone,
            'img_url' => $shop->img_url,
            'img_url_full' => $this->buildAbsoluteImageUrl($shop->img_url, request()),
            'image' => $this->buildAbsoluteImageUrl($shop->img_url, request()),
            'latitude' => $shop->latitude,
            'longitude' => $shop->longitude,
            'map_url' => $shop->map_url,
            'status' => $shop->status,
            'created_at' => $shop->created_at,
            'updated_at' => $shop->updated_at,
            'owner' => $shop->owner,
            'city' => $shop->city,
        ]);
    }

    public function update(Request $request, Shop $shop)
    {
        $user = $request->user();
        $role = strtolower((string) ($user->role ?? $user->user_type ?? ''));
        $isAdmin = $role === 'admin';
        if ($user && !$isAdmin && (int) $shop->owner_id !== (int) $user->id) {
            return response()->json([
                'message' => 'Unauthorized. You can only update your own shops.',
            ], 403);
        }

        // As with store(), we validate everything except img_url up front
        $payload = $request->validate([
            'city_id' => 'nullable|integer',
            'name' => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'address' => 'sometimes|string|max:255',
            'location' => 'nullable|string|max:255',
            'phone' => 'nullable|string|max:20',
            'latitude' => 'nullable|numeric',
            'longitude' => 'nullable|numeric',
            'map_url' => 'nullable|string|max:2048',
            'total_reviews' => 'nullable|integer|min:0',
            'status' => 'nullable|string|in:active,inactive',
        ]);

        if (!$this->shopColumnExists('location')) {
            unset($payload['location']);
        }
        if (!$this->shopColumnExists('map_url')) {
            unset($payload['map_url']);
        }

        // validate img_url value type depending on upload or text
        if ($request->hasFile('img_url')) {
            $request->validate(['img_url' => 'image|max:10240']);
        } elseif ($request->filled('img_url')) {
            $request->validate(['img_url' => 'string']);
        }

        $shouldRemoveImage = $request->boolean('remove_img');

        // Handle image upload or URL
        if ($shouldRemoveImage) {
            if ($shop->img_url && !filter_var($shop->img_url, FILTER_VALIDATE_URL)) {
                $oldPath = storage_path('app/public/' . $shop->img_url);
                if (file_exists($oldPath)) {
                    unlink($oldPath);
                }
            }
            $payload['img_url'] = null;
        } elseif ($request->hasFile('img_url')) {
            // Delete old image if exists
            if ($shop->img_url && !filter_var($shop->img_url, FILTER_VALIDATE_URL)) {
                $oldPath = storage_path('app/public/' . $shop->img_url);
                if (file_exists($oldPath)) {
                    unlink($oldPath);
                }
            }
            
            $image = $request->file('img_url');
            $imageName = time() . '_' . uniqid() . '.' . $image->getClientOriginalExtension();
            $image->storeAs('public/shops', $imageName);
            $payload['img_url'] = 'shops/' . $imageName;
        } elseif ($request->input('img_url')) {
            // Accept base64 data URL or regular URL
            $imgUrl = $request->input('img_url');
            // If it's a base64 data URL, decode and save it
            if (preg_match('/^data:image\/(\w+);base64,/', $imgUrl, $matches)) {
                // Delete old image if exists
                if ($shop->img_url && !filter_var($shop->img_url, FILTER_VALIDATE_URL)) {
                    $oldPath = storage_path('app/public/' . $shop->img_url);
                    if (file_exists($oldPath)) {
                        unlink($oldPath);
                    }
                }
                
                $extension = $matches[1];
                $imageName = time() . '_' . uniqid() . '.' . $extension;
                $imageData = base64_decode(substr($imgUrl, strpos($imgUrl, ',') + 1));
                $path = storage_path('app/public/shops/' . $imageName);
                
                // Ensure directory exists
                if (!file_exists(storage_path('app/public/shops'))) {
                    mkdir(storage_path('app/public/shops'), 0755, true);
                }
                
                file_put_contents($path, $imageData);
                $payload['img_url'] = 'shops/' . $imageName;
            }
            // If it's a regular URL, store it as-is
            elseif (filter_var($imgUrl, FILTER_VALIDATE_URL)) {
                $payload['img_url'] = $imgUrl;
            }
        } else {
            // Remove img_url from payload if not uploading new image
            unset($payload['img_url']);
        }

        $mapUrlForCoords = array_key_exists('map_url', $payload)
            ? $payload['map_url']
            : $shop->map_url;
        [$urlLat, $urlLng] = $this->extractCoordinatesFromMapUrl($mapUrlForCoords);
        if (!$request->filled('latitude') && $urlLat !== null) {
            $payload['latitude'] = $urlLat;
        }
        if (!$request->filled('longitude') && $urlLng !== null) {
            $payload['longitude'] = $urlLng;
        }

        // If latitude/longitude not provided, refresh from the (possibly updated) address
        $addressForGeocode = $payload['address'] ?? $shop->address;
        $coordsMissing = !$request->filled('latitude') && !$request->filled('longitude');
        if ($coordsMissing && $addressForGeocode) {
            [$lat, $lng] = $this->geocodeAddress($addressForGeocode);
            if ($lat && $lng) {
                $payload['latitude'] = $lat;
                $payload['longitude'] = $lng;
            }
        }

        if ($this->shopColumnExists('location') && empty($payload['location'])) {
            $placeName = $this->extractPlaceNameFromMapUrl($mapUrlForCoords);
            if ($placeName) {
                $payload['location'] = $placeName;
            }
        }

        $shop->update($payload);

        $fresh = $shop->fresh();

        return response()->json([
            'id' => $fresh->id,
            'owner_id' => $fresh->owner_id,
            'city_id' => $fresh->city_id,
            'name' => $fresh->name,
            'description' => $fresh->description,
            'address' => $fresh->address,
            'location' => $fresh->location,
            'phone' => $fresh->phone,
            'img_url' => $fresh->img_url,
            'img_url_full' => $this->buildAbsoluteImageUrl($fresh->img_url, $request),
            'image' => $this->buildAbsoluteImageUrl($fresh->img_url, $request),
            'latitude' => $fresh->latitude,
            'longitude' => $fresh->longitude,
            'map_url' => $fresh->map_url,
            'status' => $fresh->status,
            'created_at' => $fresh->created_at,
            'updated_at' => $fresh->updated_at,
            'owner' => $fresh->owner,
            'city' => $fresh->city,
        ]);
    }

    public function destroy(Request $request, Shop $shop)
    {
        $user = $request->user();
        $role = strtolower((string) ($user->role ?? $user->user_type ?? ''));
        $isAdmin = $role === 'admin';
        if ($user && !$isAdmin && (int) $shop->owner_id !== (int) $user->id) {
            return response()->json([
                'message' => 'Unauthorized. You can only delete your own shops.',
            ], 403);
        }

        if ($shop->img_url && !filter_var($shop->img_url, FILTER_VALIDATE_URL)) {
            $oldPath = storage_path('app/public/' . ltrim($shop->img_url, '/'));
            if (file_exists($oldPath)) {
                unlink($oldPath);
            }
        }

        $shop->delete();

        return response()->json(['message' => 'Shop deleted successfully']);
    }

    /**
     * Check whether the shops table contains the given column.
     */
    private function shopColumnExists(string $column): bool
    {
        static $cache = [];
        if (!array_key_exists($column, $cache)) {
            $cache[$column] = Schema::hasColumn('shops', $column);
        }
        return $cache[$column];
    }

    /**
     * Resolve an address to latitude/longitude using Google Geocoding API.
     * Returns [lat, lng] or [null, null] on failure.
     */
    private function geocodeAddress(?string $address): array
    {
        if (!$address) {
            return [null, null];
        }

        $apiKey = config('services.google_maps.key') ?? env('GEOCODING_API_KEY');
        if (!$apiKey) {
            return [null, null];
        }

        $response = Http::get('https://maps.googleapis.com/maps/api/geocode/json', [
            'address' => $address,
            'key' => $apiKey,
        ]);

        if (!$response->successful()) {
            return [null, null];
        }

        $result = $response->json('results.0.geometry.location');
        if (!is_array($result) || !isset($result['lat'], $result['lng'])) {
            return [null, null];
        }

        return [$result['lat'], $result['lng']];
    }

    /**
     * Extract coordinates from common Google Maps URL patterns.
     * Returns [lat, lng] or [null, null] when no coordinates are found.
     */
    private function extractCoordinatesFromMapUrl(?string $value): array
    {
        $url = trim((string) $value);
        if ($url === '') {
            return [null, null];
        }

        $patterns = [
            '/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/',
            '/[?&](?:q|query|ll|destination|origin)=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/',
            '/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/',
            '/\/maps\/[^?]*\?[^#]*q=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/',
            '/\/maps\/place\/[^/]*\/(\d+(?:\.\d+)?),(\d+(?:\.\d+)?),/',
        ];

        foreach ($patterns as $pattern) {
            if (!preg_match($pattern, $url, $matches)) {
                continue;
            }

            $lat = isset($matches[1]) ? (float) $matches[1] : null;
            $lng = isset($matches[2]) ? (float) $matches[2] : null;
            if ($lat === null || $lng === null) {
                continue;
            }
            if ($lat < -90 || $lat > 90 || $lng < -180 || $lng > 180) {
                continue;
            }

            return [$lat, $lng];
        }

        return [null, null];
    }

    /**
     * Extract place / location name from Google Maps URL path.
     * Example: /maps/place/Phnom+Penh/ => Phnom Penh
     */
    private function extractPlaceNameFromMapUrl(?string $value): ?string
    {
        $url = trim((string) $value);
        if ($url === '') {
            return null;
        }

        if (preg_match('#/maps/place/([^/]+)#i', $url, $matches)) {
            $name = urldecode($matches[1]);
            $name = str_replace(['+', '_', '-'], ' ', $name);
            $name = preg_replace('/\s+/', ' ', $name);
            return trim($name);
        }

        return null;
    }

    /**
     * Build an absolute image URL using the incoming request host/scheme
     * instead of relying on APP_URL, so deployed environments return
     * correct public URLs even if APP_URL is still localhost.
     */
    private function buildAbsoluteImageUrl(?string $imgUrl, Request $request): ?string
    {
        $value = trim((string) $imgUrl);
        if ($value === '') {
            return null;
        }

        if (filter_var($value, FILTER_VALIDATE_URL)) {
            return $value;
        }

        $normalized = ltrim(str_replace('\\', '/', $value), '/');
        $path = $normalized;
        if (!str_starts_with($normalized, 'storage/')) {
            $path = 'storage/' . $normalized;
        }

        $scheme = $request->getScheme();
        $host = $request->getHost();
        $port = $request->getPort();

        if ($port && !in_array($port, [80, 443], true)) {
            return sprintf('%s://%s:%d/%s', $scheme, $host, $port, $path);
        }

        return sprintf('%s://%s/%s', $scheme, $host, $path);
    }
}
