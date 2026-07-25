<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Shop extends Model
{
    use HasFactory;

    protected $with = ['owner'];

    protected $appends = ['img_url_full'];

    protected $fillable = [
        'owner_id',
        'city_id',
        'name',
        'description',
        'address',
        'location',
        'phone',
        'img_url',
        'latitude',
        'longitude',
        'map_url',
        'total_reviews',
        'status'
    ]; 

    protected $casts = [
        'latitude' => 'decimal:7',
        'longitude' => 'decimal:7',
        'total_reviews' => 'integer'
    ];
    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    public function city(): BelongsTo
    {
        return $this->belongsTo(City::class);
    }

    public function getImgUrlFullAttribute(): ?string
    {
        $value = trim((string) ($this->img_url ?? ''));
        if ($value === '') {
            return null;
        }

        if (filter_var($value, FILTER_VALIDATE_URL)) {
            return $value;
        }

        $normalized = ltrim(str_replace('\\', '/', $value), '/');
        if (str_starts_with($normalized, 'storage/')) {
            return asset($normalized);
        }

        return asset('storage/' . $normalized);
    }
}
