<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Facility;
use App\Models\User;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $mockFacilities = [
            [
                'id' => 'f3',
                'name' => 'University Auditorium',
                'type' => 'Venue',
                'capacity' => 500,
                'description' => 'Large auditorium suitable for seminars, orientations, and performances. Requires a formal consent letter addressed to the Director of Laboratories.',
                'imageUrl' => 'https://images.unsplash.com/photo-1583062434105-9bef71509685?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxsYXJnZSUyMHVuaXZlcnNpdHklMjBhdWRpdG9yaXVtfGVufDF8fHx8MT75NDkyMzAxfDA&ixlib=rb-4.1.0&q=80&w=1080',
                'requirement' => 'CONSENT_REQUIRED',
                'location' => '5th Floor',
                'requiresWeekendConsent' => true,
                'allowTdevsManpower' => true,
            ],
            [
                'id' => 'itdif',
                'name' => 'I.T. Development and Incubation Facility (ITDIF)',
                'type' => 'Laboratory',
                'capacity' => 10,
                'description' => 'Dedicated for research purposes. Managed jointly by the IT Department.',
                'imageUrl' => 'https://images.unsplash.com/photo-1559664043-6b68aa7347d6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx1bml2ZXJzaXR5JTIwbGFib3JhdG9yeSUyMGNvbXB1dGVyc3xlbnwxfHx8fDE3NzU1MzA2MTN8MA&ixlib=rb-4.1.0&q=80&w=1080',
                'requirement' => 'STANDARD',
                'location' => '2nd Floor',
                'requiresWeekendConsent' => true,
                'allowTdevsManpower' => true,
            ],
            [
                'id' => 'itrc',
                'name' => 'Information Technology Resource Center (ITRC)',
                'type' => 'Laboratory',
                'capacity' => 250,
                'description' => 'Large computing and technology resource center managed by the College of IT Education.',
                'imageUrl' => 'https://images.unsplash.com/photo-1680122572527-bf5b0193c2f6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxsYXJnZSUyMGNvbXB1dGVyJTIwbGFib3JhdG9yeSUyMHVuaXZlcnNpdHl8ZW58MXx8fHwxNzc1NTMwNjE3fDA&ixlib=rb-4.1.0&q=80&w=1080',
                'requirement' => 'STANDARD',
                'location' => '2nd Floor',
                'requiresWeekendConsent' => true,
                'allowTdevsManpower' => true,
            ],
            [
                'id' => 'avr',
                'name' => 'Audio Visual Room (AVR)',
                'type' => 'Venue',
                'capacity' => 200,
                'description' => 'Audiovisual room suitable for presentations, lectures, and viewing events. Managed by General Administration.',
                'imageUrl' => 'https://images.unsplash.com/photo-1557620795-24cf0ee891c2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhdWRpb3Zpc3VhbCUyMHJvb20lMjB0aGVhdGVyJTIwdW5pdmVyc2l0eXxlbnwxfHx8fDE3NzU1MzA2MjB8MA&ixlib=rb-4.1.0&q=80&w=1080',
                'requirement' => 'STANDARD',
                'location' => '4th Floor',
                'requiresWeekendConsent' => true,
                'allowTdevsManpower' => true,
            ],
            [
                'id' => 'view_deck',
                'name' => 'View Deck',
                'type' => 'Venue',
                'capacity' => null,
                'description' => 'Open viewing deck suitable for meetings and casual gatherings. Managed by General Administration.',
                'imageUrl' => 'https://images.unsplash.com/photo-1768355680597-c1650acb43cf?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxvdXRkb29yJTIwYmFsY29ueSUyMHZpZXclMjB1bml2ZXJzaXR5fGVufDF8fHx8MTx5NTMwNjIzfDA&ixlib=rb-4.1.0&q=80&w=1080',
                'requirement' => 'STANDARD',
                'location' => '7th Floor',
                'requiresWeekendConsent' => true,
                'allowTdevsManpower' => true,
            ],
            [
                'id' => 'iot',
                'name' => 'IoT Lab',
                'type' => 'Laboratory',
                'capacity' => null,
                'description' => 'Internet of Things laboratory. 2 personnel in-charge involved — coordinated through the IT Department.',
                'imageUrl' => 'https://images.unsplash.com/photo-1559664043-6b68aa7347d6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb21wdXRlciUyMGxhYm9yYXRvcnklMjB1bml2ZXJzaXR5fGVufDF8fHx8MTc3NTUzMDYyOXTww&ixlib=rb-4.1.0&q=80&w=1080',
                'requirement' => 'STANDARD',
                'location' => '2nd Floor',
                'requiresWeekendConsent' => true,
                'allowTdevsManpower' => true,
            ],
            [
                'id' => 'sky_gym',
                'name' => 'Sky Gym',
                'type' => 'Venue',
                'capacity' => null,
                'description' => 'Indoor gymnasium for sports and fitness activities. Managed by the Physical Education Department.',
                'imageUrl' => 'https://images.unsplash.com/photo-1559369064-c4d65141e408?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx1bml2ZXJzaXR5JTIwc3BvcnRzJTIwZ3ltJTIwaW5kb29yfGVufDF8fHx8MTc3NTUzMDYzMnww&ixlib=rb-4.1.0&q=80&w=1080',
                'requirement' => 'STANDARD',
                'location' => '7th Floor',
                'requiresWeekendConsent' => true,
                'allowTdevsManpower' => true,
            ],
            [
                'id' => 'field',
                'name' => 'Field',
                'type' => 'Venue',
                'capacity' => null,
                'description' => 'Open outdoor field for sports and large activities. Managed by the Physical Education Department.',
                'imageUrl' => 'https://images.unsplash.com/photo-1764967116421-342cb89025bf?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx1bml2ZXJzaXR5JTIwb3V0ZG9vciUyMGdyYXNzJTIwZmllbGR8ZW58MXx8fHwxNzc1NTMwNjM1fDA&ixlib=rb-4.1.0&q=80&w=1080',
                'requirement' => 'STANDARD',
                'location' => 'Ground Floor',
                'requiresWeekendConsent' => true,
                'allowTdevsManpower' => true,
            ],
            [
                'id' => 'lobby',
                'name' => 'Lobby',
                'type' => 'Venue',
                'capacity' => null,
                'description' => 'Main lobby area for registrations, exhibitions, and general gatherings. Managed by General Administration.',
                'imageUrl' => 'https://images.unsplash.com/photo-1566890463705-46b4fefa8a53?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjB1bml2ZXJzaXR5JTIwbG9iYnl8ZW58MXx8fHwxNzc1NTMwNjM4fDA&ixlib=rb-4.1.0&q=80&w=1080',
                'requirement' => 'STANDARD',
                'location' => 'Ground Floor',
                'requiresWeekendConsent' => true,
                'allowTdevsManpower' => true,
            ],
            [
                'id' => 'ndhrm_hall',
                'name' => 'NDHRM Function Hall',
                'type' => 'Venue',
                'capacity' => 200,
                'description' => 'Function hall for various events and gatherings in the ND HRM Building. Requires a consent letter addressed to the Director of Laboratories.',
                'imageUrl' => 'https://images.unsplash.com/photo-1762765684810-b734486c5eda?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmdW5jdGlvbiUyMGhhbGwlMjB1bml2ZXJzaXR5fGVufDF8fHx8MTc3NTUzMDY0Mnww&ixlib=rb-4.1.0&q=80&w=1080',
                'requirement' => 'CONSENT_REQUIRED',
                'location' => 'ND HRM Building',
                'requiresWeekendConsent' => true,
                'allowTdevsManpower' => true,
            ],
        ];

        foreach ($mockFacilities as $facility) {
            Facility::updateOrCreate(
                ['id' => $facility['id']],
                $facility
            );
        }

        /*
         * Demo accounts
         *
         * These credentials are intended for local development and
         * presentations only. Do not reuse them for real accounts.
         */
        $demoAccounts = [
            [
                'name' => 'ReserveIT Super Admin',
                'email' => 'superadmin@reserveit.test',
                'password' => 'RsvIT-Admin-2026!Demo',
                'role' => 'super_admin',
                'must_change_password' => false,
                'is_active' => true,
            ],
            [
                'name' => 'ReserveIT Facility Admin',
                'email' => 'facilityadmin@reserveit.test',
                'password' => 'RsvIT-Facility-2026!Demo',
                'role' => 'facility_admin',
                'must_change_password' => false,
                'is_active' => true,
            ],
            [
                'name' => 'ReserveIT Demo User',
                'email' => 'demo.user@reserveit.test',
                'password' => 'RsvIT-User-2026!Demo',
                'role' => 'user',
                'must_change_password' => false,
                'is_active' => true,
            ],
        ];

        foreach ($demoAccounts as $account) {
            User::updateOrCreate(
                ['email' => $account['email']],
                [
                    'name' => $account['name'],
                    'password' => $account['password'],
                    'role' => $account['role'],
                    'must_change_password' => $account['must_change_password'],
                    'is_active' => $account['is_active'],
                ]
            );
        }

        /*
         * Assign the facility administrator to selected facilities.
         * syncWithoutDetaching preserves any other facility assignments.
         */
        $facilityAdmin = User::where(
            'email',
            'facilityadmin@reserveit.test'
        )->firstOrFail();

        $facilityAdmin->managedFacilities()->syncWithoutDetaching([
            'itdif',
            'itrc',
        ]);
    }
}
