<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Database\UniqueConstraintViolationException;
use Laravel\Socialite\Facades\Socialite;
use Throwable;

class GoogleController extends Controller
{
    public function redirectToGoogle()
    {
        return Socialite::driver('google')->redirect();
    }

    public function handleGoogleCallback(Request $request)
{
    Log::info('Google SSO callback reached.', [
        'session_id' => $request->session()->getId(),
    ]);

    try {
        Log::info('Google SSO: fetching Google user.');

        $googleUser = Socialite::driver('google')->user();
        
        $googleId = $googleUser->getId();
        $email = $googleUser->getEmail();
        
        Log::info('Google SSO: Google user fetched.', [
            'email' => $email,
            'google_id_found' => !empty($googleId),
        ]);

            // Find the existing account using the Google ID.
            $user = User::withTrashed()
                ->where('google_id', $googleId)
                ->first();

            // If no Google ID match exists, search by email.
            if (!$user && $email) {
                $user = User::withTrashed()
                    ->where('email', $email)
                    ->first();
            }

            if ($user) {
                // Never allow a soft-deleted account to sign in.
                if ($user->trashed()) {
                    return $this->returnLoginError(
                        $request,
                        'This account is unavailable. Please contact administration.'
                    );
                }

                // Block disabled accounts before updating or logging in.
                if (!$user->is_active) {
                    Log::warning('Google SSO: disabled account blocked.', [
                        'user_id' => $user->id,
                        'is_active' => $user->is_active,
                    ]);
                
                    return $this->returnLoginError(
                        $request,
                        'This account has been deactivated. Please contact administration.'
                    );
                }

                // Link Google details only after the account passes checks.
                $user->google_id = $googleId;
                $user->avatar = $googleUser->getAvatar();
                $user->save();
            } else {
                // No existing account was found; create a new one.
                $user = User::create([
                    'name' => $googleUser->getName() ?? 'Google User',
                    'email' => $email,
                    'google_id' => $googleId,
                    'avatar' => $googleUser->getAvatar(),
                    'password' => null,
                ]);

                if (!$user->is_active) {
                    return $this->returnLoginError(
                        $request,
                        'This account is unavailable. Please contact administration.'
                    );
                }
            }

            Auth::login($user, true);
            $request->session()->regenerate();

            return redirect()->intended('/dashboard');

        } catch (UniqueConstraintViolationException $e) {
            Log::error('Google SSO unique constraint violation: ' . $e->getMessage());

            return $this->returnLoginError(
                $request,
                'Your Google account is already linked to a ReserveIT account. Please contact administration.'
            );

        } catch (Throwable $e) {
            Log::error(
                'Google SSO callback failed: ' .
                get_class($e) . ' - ' . $e->getMessage()
            );

            return $this->returnLoginError(
                $request,
                'Unable to authenticate with Google. Please try again.'
            );
        }
    }

    private function returnLoginError(Request $request, string $message)
    {
        Auth::logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect()
            ->route('login')
            ->with('error', $message);
    }   
}