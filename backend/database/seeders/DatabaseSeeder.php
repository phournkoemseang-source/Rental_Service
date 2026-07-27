<?php

namespace Database\Seeders;

// use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use App\Models\Booking;
use App\Models\BookingStatusLog;
use App\Models\Message;
use App\Models\NotificationRecord;
use App\Services\NotificationService;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {     
        // Seed cities (25 Cambodia provinces)
        $this->call(CitySeeder::class);

        // Create admin@choul.com user
        \App\Models\User::updateOrCreate(
            ['email' => 'admin@choul.com'],
            [
                'name' => 'Admin User',
                'phone' => '+855 12 345 678',
                'password' => Hash::make('admin123'),
                'role' => 'admin',
                'is_verified' => true,
            ]
        );
    }
}
