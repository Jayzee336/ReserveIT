<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Run overtime check every 5 minutes to detect overstaying bookings
Schedule::command('bookings:check-overtime')->everyFiveMinutes();

// Run auto-purge of expired unapproved bookings daily (7 or 14 day retention if enabled)
Schedule::command('bookings:purge-unapproved')->daily();