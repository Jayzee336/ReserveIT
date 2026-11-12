<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Run overtime check every 5 minutes to detect overstaying bookings
Schedule::command('bookings:check-overtime')->everyFiveMinutes();

// Check pending requests every minute so a request expires as soon as its scheduled start passes.
// My Bookings and the Facility Admin review page also invoke this command on demand.
Schedule::command('bookings:expire-pending')->everyMinute()->withoutOverlapping();