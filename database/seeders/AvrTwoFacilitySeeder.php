<?php

namespace Database\Seeders;

use App\Models\Facility;
use Illuminate\Database\Seeder;

class AvrTwoFacilitySeeder extends Seeder
{
    /**
     * Add the school's second Audio Visual Room without changing an
     * administrator's later edits when this seeder is run again.
     */
    public function run(): void
    {
        Facility::firstOrCreate(
            ['id' => 'avr2'],
            [
                'name' => 'Audio Visual Room 2 (AVR 2)',
                'type' => 'Venue',
                'capacity' => null,
                'description' => 'Second audiovisual room suitable for presentations, lectures, meetings, and viewing events. Confirm the exact capacity and location with General Administration.',
                'imageUrl' => '/images/facility-placeholder.svg',
                'requirement' => 'STANDARD',
                'location' => 'Location to be confirmed',
                'requiresWeekendConsent' => true,
                'allowTdevsManpower' => true,
            ]
        );
    }
}
