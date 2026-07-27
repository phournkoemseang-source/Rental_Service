<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class CitySeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $provinces = [
            'Banteay Meanchey',
            'Battambang',
            'Kampong Cham',
            'Kampong Chhnang',
            'Kampong Speu',
            'Kampong Thom',
            'Kampot',
            'Kandal',
            'Kep',
            'Koh Kong',
            'Kratié',
            'Mondulkiri',
            'Oddar Meanchey',
            'Pailin',
            'Phnom Penh',
            'Preah Vihear',
            'Prey Veng',
            'Pursat',
            'Ratanakiri',
            'Siem Reap',
            'Preah Sihanouk',
            'Stung Treng',
            'Svay Rieng',
            'Takéo',
            'Tboung Khmum',
        ];

        $entries = [];

        foreach ($provinces as $name) {
            $entries[] = [
                'name'       => $name,
            ];
        }

        DB::table('cities')->insert($entries);
    }
}
