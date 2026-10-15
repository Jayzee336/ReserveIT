<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Laravel\Socialite\Facades\Socialite;

class GoogleController extends Controller
{
    public function redirectToGoogle()
    {
        return Socialite::driver('google')->redirect();
    }

    public function handleGoogleCallback()
    {
        try {
            $googleUser = Socialite::driver('google')->user();

            $googleId = $googleUser->getId();
            $email = $googleUser->getEmail();

            // Look for an account already linked to this Google ID.
            $user = User::withTrashed()
                ->where('google_id', $googleId)
                ->first();

            // If no Google ID match exists, check the email.
            if (!$user && $email) {
                $user = User::withTrashed()
                    ->where('email', $email)
                    ->first();
            }

            if ($user) {
                // Restore a soft-deleted account, if necessary.
                if (method_exists($user, 'trashed') && $user->trashed()) {
                    $user->restore();
                }

                $user->google_id = $googleId;
                $user->avatar = $googleUser->getAvatar();

                // Do not erase an existing password.
                $user->save();
            } else {
                // Create a new account only when no matching account exists.
                $user = User::create([
                    'name' => $googleUser->getName() ?? 'Google User',
                    'email' => $email,
                    'google_id' => $googleId,
                    'avatar' => $googleUser->getAvatar(),
                    'password' => null,
                ]);
            }

            Auth::login($user, true);

            return redirect()->intended('/dashboard');

        } catch (\Throwable $e) {
            Log::error(
                'Google SSO callback failed: ' .
                get_class($e) . ' - ' . $e->getMessage()
            );

            return redirect()->route('login')->withErrors([
                'email' => 'Unable to authenticate with Google. Please try again.',
            ]);
        }
    }
}