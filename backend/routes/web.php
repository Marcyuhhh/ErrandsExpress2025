<?php

use Illuminate\Support\Facades\Route;

// Handle CORS for all routes
Route::match(['options'], '{any}', function () {
    return response('', 200)
        ->header('Access-Control-Allow-Origin', '*')
        ->header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        ->header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');
})->where('any', '.*');

Route::get('/', function () {
    return view('welcome');
});
