<?php

namespace Tests\Feature;

use App\Models\Facility;
use Database\Seeders\AvrTwoFacilitySeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AvrTwoFacilitySeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_creates_avr_two_and_can_be_run_repeatedly_without_overwriting_edits(): void
    {
        $this->seed(AvrTwoFacilitySeeder::class);

        $facility = Facility::query()->findOrFail('avr2');

        $this->assertSame('Audio Visual Room 2 (AVR 2)', $facility->name);
        $this->assertSame('Venue', $facility->type);
        $this->assertNull($facility->capacity);

        $facility->update([
            'location' => 'Confirmed location',
            'capacity' => 120,
        ]);

        $this->seed(AvrTwoFacilitySeeder::class);

        $this->assertSame(1, Facility::query()->whereKey('avr2')->count());
        $this->assertDatabaseHas('facilities', [
            'id' => 'avr2',
            'name' => 'Audio Visual Room 2 (AVR 2)',
            'location' => 'Confirmed location',
            'capacity' => 120,
        ]);
    }
}
