<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProfileTest extends TestCase
{
    use RefreshDatabase;

    public function test_profile_page_is_displayed(): void
    {
        $user = User::factory()->create();

        $response = $this
            ->actingAs($user)
            ->get('/profile');

        $response->assertOk();
    }

    public function test_profile_information_can_be_updated(): void
    {
        $user = User::factory()->create();

        $response = $this
            ->actingAs($user)
            ->patch('/profile', [
                'name' => 'Test User',
                'email' => 'test@example.com',
            ]);

        $response
            ->assertSessionHasNoErrors()
            ->assertRedirect('/profile');

        $user->refresh();

        $this->assertSame('Test User', $user->name);
        $this->assertSame('test@example.com', $user->email);
        $this->assertNull($user->email_verified_at);
    }

    public function test_profile_username_can_be_updated(): void
    {
        $user = User::factory()->create(['username' => 'old_username']);

        $response = $this->actingAs($user)->patch('/profile', [
            'name' => $user->name,
            'username' => 'new_username',
            'email' => $user->email,
        ]);

        $response->assertSessionHasNoErrors()->assertRedirect('/profile');

        $this->assertSame('new_username', $user->fresh()->username);
    }

    public function test_duplicate_username_is_rejected_when_updating_profile(): void
    {
        $user = User::factory()->create(['username' => 'first_user']);
        User::factory()->create(['username' => 'taken_user']);

        $response = $this->actingAs($user)->from('/profile')->patch('/profile', [
            'name' => $user->name,
            'username' => 'taken_user',
            'email' => $user->email,
        ]);

        $response->assertSessionHasErrors('username')->assertRedirect('/profile');
        $this->assertSame('first_user', $user->fresh()->username);
    }

    public function test_email_verification_status_is_unchanged_when_the_email_address_is_unchanged(): void
    {
        $user = User::factory()->create();

        $response = $this
            ->actingAs($user)
            ->patch('/profile', [
                'name' => 'Test User',
                'email' => $user->email,
            ]);

        $response
            ->assertSessionHasNoErrors()
            ->assertRedirect('/profile');

        $this->assertNotNull($user->refresh()->email_verified_at);
    }

    public function test_duplicate_email_is_rejected_when_updating_profile(): void
    {
        $user = User::factory()->create();
        User::factory()->create(['email' => 'taken@example.com']);

        $response = $this->actingAs($user)->from('/profile')->patch('/profile', [
            'name' => $user->name,
            'email' => 'taken@example.com',
        ]);

        $response->assertSessionHasErrors('email')->assertRedirect('/profile');
        $this->assertNotSame('taken@example.com', $user->fresh()->email);
    }

    public function test_user_can_delete_their_account(): void
    {
        $user = User::factory()->create();

        $response = $this
            ->actingAs($user)
            ->delete('/profile', [
                'password' => 'password',
            ]);

        $response
            ->assertSessionHasNoErrors()
            ->assertRedirect('/');

        $this->assertGuest();
        $this->assertSoftDeleted($user);
    }

    public function test_correct_password_must_be_provided_to_delete_account(): void
    {
        $user = User::factory()->create();

        $response = $this
            ->actingAs($user)
            ->from('/profile')
            ->delete('/profile', [
                'password' => 'wrong-password',
            ]);

        $response
            ->assertSessionHasErrors('password')
            ->assertRedirect('/profile');

        $this->assertNotNull($user->fresh());
    }

    public function test_google_user_can_delete_account_with_typed_confirmation(): void
    {
        $user = User::factory()->create(['google_id' => 'google-user-123']);

        $response = $this->actingAs($user)->delete('/profile', [
            'typed_confirmation' => 'DELETE',
        ]);

        $response->assertSessionHasNoErrors()->assertRedirect('/');
        $this->assertSoftDeleted($user);
    }

    public function test_google_user_must_type_delete_to_confirm_account_deletion(): void
    {
        $user = User::factory()->create(['google_id' => 'google-user-456']);

        $response = $this->actingAs($user)->from('/profile')->delete('/profile', [
            'typed_confirmation' => 'delete',
        ]);

        $response->assertSessionHasErrors('typed_confirmation')->assertRedirect('/profile');
        $this->assertNotNull($user->fresh());
    }

    public function test_sso_user_without_google_id_can_delete_with_typed_confirmation(): void
    {
        $user = User::factory()->create(['google_id' => null, 'password' => null]);

        $response = $this->actingAs($user)->delete('/profile', [
            'typed_confirmation' => 'DELETE',
        ]);

        $response->assertSessionHasNoErrors()->assertRedirect('/');
        $this->assertSoftDeleted($user);
    }
}
