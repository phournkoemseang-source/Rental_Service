<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\City;
use Illuminate\Http\Request;

class CityController extends Controller
{
    public function index()
    {
        return response()->json(City::paginate(999));
    }

    public function store(Request $_request)
    {
        $record = City::create($_request->all());

        return response()->json($record, 201);
    }

    public function show(City $city)
    {
        return response()->json($city);
    }

    public function update(Request $_request, City $city)
    {
        $city->update($_request->all());

        return response()->json($city->fresh());
    }

    public function destroy(City $city)
    {
        $city->delete();

        return response()->json(['message' => 'City deleted successfully']);
    }
}
