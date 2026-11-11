<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AuthenticationTest extends TestCase
{
    use RefreshDatabase;

    public function test_login_screen_can_be_rendered(): void
    {
        $response = $this->get('/login');

        $response->assertStatus(200);
    }

    public function test_demo_accounts_are_seeded_and_accept_username_or_email_login(): void
    {
        $this->seed(DatabaseSeeder::class);

        $accounts = [
            ['username' => 'user1', 'email' => 'user1@uic.edu.ph', 'role' => 'user'],
            ['username' => 'facility1', 'email' => 'facility1@uic.edu.ph', 'role' => 'facility_admin'],
            ['username' => 'admin', 'email' => 'admin@uic.edu.ph', 'role' => 'super_admin'],
        ];

        foreach ($accounts as $account) {
            $user = User::query()
                ->where('username', $account['username'])
                ->firstOrFail();

            $this->assertSame($account['email'], $user->email);
            $this->assertSame($account['role'], $user->role);
            $this->assertTrue(Hash::check('password', $user->password));
            $this->assertTrue($user->is_active);

            // Verify login by username.
            $this->post('/login', [
                'email' => $account['username'],
                'password' => 'password',
            ])->assertRedirect(route('dashboard', absolute: false));

            $this->assertAuthenticatedAs($user);
            $this->post('/logout');
            $this->assertGuest();

            // Verify login by email.
            $this->post('/login', [
                'email' => $account['email'],
                'password' => 'password',
            ])->assertRedirect(route('dashboard', absolute: false));

            $this->assertAuthenticatedAs($user);
            $this->post('/logout');
            $this->assertGuest();
        }
    }

    public function test_users_can_authenticate_using_the_login_screen(): void
    {
        $user = User::factory()->create();

        $response = $this->post('/login', [
            'email' => $user->email,
            'password' => 'password',
        ]);

        $this->assertAuthenticated();
        $response->assertRedirect(route('dashboard', absolute: false));
    }

    public function test_users_can_authenticate_using_a_username(): void
    {
        $user = User::factory()->create([
            'username' => 'demo-user',
        ]);

        $response = $this->post('/login', [
            'email' => 'demo-user',
            'password' => 'password',
        ]);

        $this->assertAuthenticatedAs($user);
        $response->assertRedirect(route('dashboard', absolute: false));
    }

    public function test_users_can_not_authenticate_with_invalid_password(): void
    {
        $user = User::factory()->create();

        $this->post('/login', [
            'email' => $user->email,
            'password' => 'wrong-password',
        ]);

        $this->assertGuest();
    }

    public function test_users_can_logout(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->post('/logout');

        $this->assertGuest();
        $response->assertRedirect('/login');
    }
}
