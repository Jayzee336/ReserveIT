<?php

namespace Database\Seeders;

use App\Models\ActivityLog;
use App\Models\Booking;
use App\Models\Facility;
use App\Models\SystemSetting;
use App\Models\User;
use App\Models\UserConcern;
use App\Models\UserConcernEditHistory;
use App\Models\UserConcernReplyHistory;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class DemoScenarioSeeder extends Seeder
{
    /**
     * Seed a compact, repeatable set of local-only scenarios.
     *
     * Run with:
     * php artisan db:seed --class=DemoScenarioSeeder
     */
    public function run(): void
    {
        if (! app()->environment(['local', 'testing'])) {
            throw new RuntimeException('DemoScenarioSeeder is restricted to local/testing environments.');
        }

        if (DB::connection()->getDriverName() !== 'sqlite') {
            throw new RuntimeException('DemoScenarioSeeder only runs against a local SQLite database.');
        }

        $this->command?->info('Preparing ReserveIT demo accounts and test scenarios...');

        $users = $this->seedAdditionalAccounts();
        $this->seedBookings($users);
        $this->seedSupportTickets($users);

        $this->command?->info('ReserveIT demo scenarios are ready.');
        $this->command?->line('Accounts: user@test.com, user2@test.com, user3@test.com, facility@test.com, facility2@test.com, facility3@test.com, facility4@test.com, admin@test.com');
        $this->command?->line('Demo password for all seeded accounts: password');
    }

    /**
     * Preserve the three original demo accounts and add only five accounts.
     *
     * @return array<string, User>
     */
    private function seedAdditionalAccounts(): array
    {
        $accounts = [
            'user2' => [
                'name' => 'ReserveIT Demo User 2',
                'username' => 'user2',
                'email' => 'user2@test.com',
                'role' => 'user',
            ],
            'user3' => [
                'name' => 'ReserveIT Demo User 3',
                'username' => 'user3',
                'email' => 'user3@test.com',
                'role' => 'user',
            ],
            'facility2' => [
                'name' => 'ReserveIT Facility Admin 2',
                'username' => 'facility2',
                'email' => 'facility2@test.com',
                'role' => 'facility_admin',
            ],
            'facility3' => [
                'name' => 'ReserveIT Facility Admin 3',
                'username' => 'facility3',
                'email' => 'facility3@test.com',
                'role' => 'facility_admin',
            ],
            'facility4' => [
                'name' => 'ReserveIT Facility Admin 4',
                'username' => 'facility4',
                'email' => 'facility4@test.com',
                'role' => 'facility_admin',
            ],
        ];

        $users = [
            'user' => User::where('email', 'user@test.com')->firstOrFail(),
            'facility' => User::where('email', 'facility@test.com')->firstOrFail(),
            'admin' => User::where('email', 'admin@test.com')->firstOrFail(),
        ];

        foreach ($accounts as $key => $account) {
            $user = User::firstOrNew(['email' => $account['email']]);
            $user->fill([
                ...$account,
                'password' => 'password',
                'must_change_password' => false,
                'is_active' => true,
            ]);
            $user->save();

            $users[$key] = $user;
        }

        $assignments = [
            'facility' => ['itdif', 'itrc'],
            'facility2' => ['avr', 'view_deck'],
            'facility3' => ['iot', 'sky_gym'],
            'facility4' => ['field', 'lobby', 'ndhrm_hall', 'f3'],
        ];

        foreach ($assignments as $accountKey => $facilityIds) {
            $users[$accountKey]->managedFacilities()->syncWithoutDetaching(
                Facility::whereIn('id', $facilityIds)->pluck('id')->all()
            );
        }

        return $users;
    }

    /**
     * Create bookings in every major state without changing existing rows.
     *
     * @param array<string, User> $users
     */
    private function seedBookings(array $users): void
    {
        $admin = $users['admin'];
        $now = Carbon::now();

        // Use a fixed daytime slot that is already over, including when the seeder
        // is run shortly after midnight. This keeps the live overtime case valid.
        $liveDate = $now->copy()->startOfDay();
        if ($now->hour < 10) {
            $liveDate->subDay();
        }
        $liveStart = $liveDate->copy()->setTime(8, 0);
        $liveEnd = $liveDate->copy()->setTime(9, 0);

        $settings = SystemSetting::current();
        $settings->update([
            'overtime_fee_per_hour' => max((float) $settings->overtime_fee_per_hour, 150),
            'overtime_grace_minutes' => 15,
        ]);

        $scenarios = [
            [
                'id' => 'd0000000-0000-4000-8000-000000000001',
                'facility_id' => 'itdif',
                'user_id' => $users['user']->id,
                'date' => $now->copy()->addDays(2)->toDateString(),
                'start_time' => '09:00',
                'end_time' => '11:00',
                'status' => 'pending',
                'notes' => '[DEMO] Pending booking — use this to test approval and rejection.',
                'attendees' => 8,
                'needs_manpower' => false,
            ],
            [
                'id' => 'd0000000-0000-4000-8000-000000000002',
                'facility_id' => 'avr',
                'user_id' => $users['user2']->id,
                'date' => $now->copy()->subDays(2)->toDateString(),
                'start_time' => '13:00',
                'end_time' => '15:00',
                'status' => 'declined',
                'notes' => '[DEMO] Declined booking — sample rejection history.',
                'attendees' => 35,
                'needs_manpower' => false,
                'decline_reason' => 'The facility is reserved for another university activity.',
                'rejection_reason' => 'The facility is reserved for another university activity.',
                'approved_by' => $admin->id,
                'approved_at' => $now->copy()->subDays(3),
            ],
            [
                'id' => 'd0000000-0000-4000-8000-000000000003',
                'facility_id' => 'view_deck',
                'user_id' => $users['user3']->id,
                'date' => $now->copy()->addDays(5)->toDateString(),
                'start_time' => '14:00',
                'end_time' => '16:00',
                'status' => 'cancelled',
                'notes' => '[DEMO] Cancelled booking — sample cancellation reason.',
                'attendees' => 12,
                'needs_manpower' => false,
                'cancellation_reason' => 'The organizing group rescheduled the activity.',
            ],
            [
                'id' => 'd0000000-0000-4000-8000-000000000004',
                'facility_id' => 'itrc',
                'user_id' => $users['user2']->id,
                'date' => $now->copy()->addDays(4)->toDateString(),
                'start_time' => '10:00',
                'end_time' => '12:00',
                'status' => 'approved',
                'notes' => '[DEMO] Approved upcoming booking.',
                'attendees' => 45,
                'needs_manpower' => true,
                'approved_by' => $admin->id,
                'approved_at' => $now->copy()->subDay(),
            ],
            [
                'id' => 'd0000000-0000-4000-8000-000000000005',
                'facility_id' => 'iot',
                'user_id' => $users['user3']->id,
                'date' => $now->copy()->subDays(7)->toDateString(),
                'start_time' => '09:00',
                'end_time' => '10:30',
                'status' => 'approved',
                'notes' => '[DEMO] Completed booking with no overtime.',
                'attendees' => 6,
                'needs_manpower' => false,
                'approved_by' => $admin->id,
                'approved_at' => $now->copy()->subDays(9),
                'checked_in_at' => $now->copy()->subDays(7)->setTime(8, 55),
                'checked_out_at' => $now->copy()->subDays(7)->setTime(10, 30),
                'overtime_minutes' => 0,
                'overtime_fee_amount' => 0,
                'overtime_fee_rate' => 150,
                'overtime_payment_status' => 'not_due',
            ],
            [
                'id' => 'd0000000-0000-4000-8000-000000000006',
                'facility_id' => 'avr',
                'user_id' => $users['user']->id,
                'date' => $now->copy()->subDays(5)->toDateString(),
                'start_time' => '09:00',
                'end_time' => '10:00',
                'status' => 'approved',
                'notes' => '[DEMO] Completed booking with 30 minutes unpaid overtime.',
                'attendees' => 25,
                'needs_manpower' => true,
                'approved_by' => $admin->id,
                'approved_at' => $now->copy()->subDays(7),
                'checked_in_at' => $now->copy()->subDays(5)->setTime(8, 55),
                'checked_out_at' => $now->copy()->subDays(5)->setTime(10, 45),
                'overtime_minutes' => 30,
                'overtime_fee_amount' => 75,
                'overtime_fee_rate' => 150,
                'overtime_payment_status' => 'unpaid',
            ],
            [
                'id' => 'd0000000-0000-4000-8000-000000000007',
                'facility_id' => 'itrc',
                'user_id' => $users['user2']->id,
                'date' => $now->copy()->subDays(4)->toDateString(),
                'start_time' => '13:00',
                'end_time' => '14:00',
                'status' => 'approved',
                'notes' => '[DEMO] Completed booking with paid 60 minutes overtime.',
                'attendees' => 80,
                'needs_manpower' => false,
                'approved_by' => $admin->id,
                'approved_at' => $now->copy()->subDays(6),
                'checked_in_at' => $now->copy()->subDays(4)->setTime(12, 55),
                'checked_out_at' => $now->copy()->subDays(4)->setTime(15, 15),
                'overtime_minutes' => 60,
                'overtime_fee_amount' => 150,
                'overtime_fee_rate' => 150,
                'overtime_payment_status' => 'paid',
                'overtime_paid_at' => $now->copy()->subDays(4)->setTime(16, 0),
                'overtime_paid_by' => $users['facility2']->id,
            ],
            [
                'id' => 'd0000000-0000-4000-8000-000000000008',
                'facility_id' => 'itdif',
                'user_id' => $users['user']->id,
                'date' => $liveEnd->toDateString(),
                'start_time' => $liveStart->format('H:i'),
                'end_time' => $liveEnd->format('H:i'),
                'status' => 'approved',
                'notes' => '[DEMO] Live overtime — check out this booking to test fee calculation.',
                'attendees' => 5,
                'needs_manpower' => false,
                'approved_by' => $admin->id,
                'approved_at' => $now->copy()->subHours(5),
                'checked_in_at' => $liveStart,
                'checked_out_at' => null,
                'overtime_minutes' => null,
                'overtime_fee_amount' => null,
                'overtime_fee_rate' => null,
                'overtime_payment_status' => 'not_due',
            ],
            [
                'id' => 'd0000000-0000-4000-8000-000000000009',
                'facility_id' => 'iot',
                'user_id' => $users['user3']->id,
                'date' => $now->copy()->subDays(3)->toDateString(),
                'start_time' => '09:00',
                'end_time' => '10:00',
                'status' => 'approved',
                'notes' => '[DEMO] Checked in after scheduled end — should not accrue overtime.',
                'attendees' => 4,
                'needs_manpower' => false,
                'approved_by' => $admin->id,
                'approved_at' => $now->copy()->subDays(5),
                'checked_in_at' => $now->copy()->subDays(3)->setTime(10, 10),
                'checked_out_at' => $now->copy()->subDays(3)->setTime(11, 30),
                'overtime_minutes' => 0,
                'overtime_fee_amount' => 0,
                'overtime_fee_rate' => 150,
                'overtime_payment_status' => 'not_due',
            ],
            [
                'id' => 'd0000000-0000-4000-8000-000000000010',
                'facility_id' => 'f3',
                'user_id' => $users['user2']->id,
                'date' => $now->copy()->next(Carbon::SATURDAY)->toDateString(),
                'start_time' => '08:00',
                'end_time' => '12:00',
                'status' => 'pending',
                'notes' => '[DEMO] Weekend consent-required venue request. No fake attachment is attached.',
                'attendees' => 120,
                'needs_manpower' => true,
                'consent_file_uploaded' => false,
            ],
            [
                'id' => 'd0000000-0000-4000-8000-000000000011',
                'facility_id' => 'ndhrm_hall',
                'user_id' => $users['user3']->id,
                'date' => $now->copy()->addDays(8)->toDateString(),
                'start_time' => '13:00',
                'end_time' => '17:00',
                'status' => 'approved',
                'notes' => '[DEMO] Large event booking with manpower request.',
                'attendees' => 150,
                'needs_manpower' => true,
                'approved_by' => $admin->id,
                'approved_at' => $now->copy()->subHours(2),
            ],
        ];

        foreach ($scenarios as $scenario) {
            $booking = Booking::updateOrCreate(
                ['id' => $scenario['id']],
                [
                    ...$scenario,
                    'booking_date' => $scenario['date'],
                ]
            );

            $this->seedBookingActivity($booking, $users);
        }
    }

    /**
     * Add a few useful, repeatable activity records for the demo bookings.
     *
     * @param array<string, User> $users
     */
    private function seedBookingActivity(Booking $booking, array $users): void
    {
        $events = [];

        if ($booking->status === 'approved') {
            $events[] = ['action' => 'Booking approved', 'performed_by' => $users['admin']->name];
        } elseif ($booking->status === 'declined') {
            $events[] = ['action' => 'Booking declined', 'performed_by' => $users['admin']->name, 'reason' => $booking->decline_reason];
        } elseif ($booking->status === 'cancelled') {
            $events[] = ['action' => 'Booking cancelled', 'performed_by' => $users['user3']->name, 'reason' => $booking->cancellation_reason];
        } else {
            $events[] = ['action' => 'Booking submitted', 'performed_by' => $booking->user?->name ?? 'Demo User'];
        }

        if ($booking->checked_in_at) {
            $events[] = ['action' => 'Checked in', 'performed_by' => $booking->user?->name ?? 'Demo User'];
        }

        if ($booking->checked_out_at) {
            $events[] = ['action' => 'Checked out', 'performed_by' => $booking->user?->name ?? 'Demo User'];
        }

        if ((int) $booking->overtime_minutes > 0) {
            $events[] = [
                'action' => 'Overtime fee assessed',
                'performed_by' => 'System',
                'reason' => $booking->overtime_minutes . ' overtime minutes; fee: ' . number_format((float) $booking->overtime_fee_amount, 2),
            ];
        }

        foreach ($events as $event) {
            ActivityLog::updateOrCreate(
                [
                    'booking_id' => $booking->id,
                    'action' => $event['action'],
                    'performed_by' => $event['performed_by'],
                ],
                ['reason' => $event['reason'] ?? null]
            );
        }
    }

    /**
     * Seed sample tickets in multiple workflow states, plus edit/reply history.
     *
     * @param array<string, User> $users
     */
    private function seedSupportTickets(array $users): void
    {
        $tickets = [
            [
                'key' => 'demo-ticket-booking-status',
                'user' => 'user',
                'category' => 'Bug',
                'details' => '[DEMO TICKET] Booking status did not refresh after submitting a request. Please review the booking workflow.',
                'status' => 'pending',
                'reply' => null,
            ],
            [
                'key' => 'demo-ticket-facility-details',
                'user' => 'user2',
                'category' => 'Facility',
                'details' => '[DEMO TICKET] The facility details page needs clearer information about room capacity and available equipment.',
                'status' => 'resolved',
                'reply' => 'Thank you for reporting this. The facility information has been reviewed and the request has been recorded for the next content update.',
            ],
            [
                'key' => 'demo-ticket-account',
                'user' => 'user3',
                'category' => 'Account',
                'details' => '[DEMO TICKET] Please clarify how a user can update their account information.',
                'status' => 'pending',
                'reply' => null,
            ],
            [
                'key' => 'demo-ticket-ui',
                'user' => 'user2',
                'category' => 'UI Improvements',
                'details' => '[DEMO TICKET] The calendar could use a more visible indicator for approved and pending bookings.',
                'status' => 'resolved',
                'reply' => 'Thank you for the suggestion. The team has reviewed the calendar feedback and added it to the UI improvement list.',
            ],
        ];

        foreach ($tickets as $ticket) {
            $marker = '[RESERVEIT ' . strtoupper($ticket['key']) . ']';
            $concern = UserConcern::updateOrCreate(
                ['message' => $marker],
                [
                    'user_id' => $users[$ticket['user']]->id,
                    'message' => $marker,
                    'appeal_date' => Carbon::now()->subDays(2)->toDateString(),
                    'category' => $ticket['category'],
                    'detailed_info' => $ticket['details'],
                    'status' => $ticket['status'],
                    'admin_reply' => $ticket['reply'],
                ]
            );

            if ($ticket['key'] === 'demo-ticket-ui') {
                UserConcernEditHistory::firstOrCreate(
                    [
                        'user_concern_id' => $concern->id,
                        'updated_category' => 'UI Improvements',
                    ],
                    [
                        'previous_appeal_date' => Carbon::now()->subDays(2)->toDateString(),
                        'updated_appeal_date' => Carbon::now()->subDays(2)->toDateString(),
                        'previous_category' => 'Others',
                        'updated_category' => 'UI Improvements',
                        'previous_detailed_info' => 'The calendar display is confusing.',
                        'updated_detailed_info' => $ticket['details'],
                        'edited_by' => $users['user2']->id,
                    ]
                );
            }

            if ($ticket['reply']) {
                UserConcernReplyHistory::firstOrCreate(
                    [
                        'user_concern_id' => $concern->id,
                        'updated_reply' => $ticket['reply'],
                    ],
                    [
                        'previous_reply' => 'We are reviewing your concern.',
                        'updated_reply' => $ticket['reply'],
                        'edited_by' => $users['admin']->id,
                    ]
                );
            }
        }
    }
}
