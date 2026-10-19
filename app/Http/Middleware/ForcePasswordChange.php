<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class ForcePasswordChange
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        // Immediately log out accounts disabled after their session began.
        if ($user && !$user->is_active) {
            Auth::logout();

            $request->session()->invalidate();
            $request->session()->regenerateToken();

            return redirect()->route('login')->withErrors([
                'email' => 'This account has been deactivated. Please contact administration.',
            ]);
        }

        // Permit password-change routes and logout to avoid redirect loops.
        $exemptRoutes = [
            'password.force.edit',
            'password.force.update',
            'logout',
        ];

        if (
            $user &&
            $user->must_change_password &&
            !$request->routeIs(...$exemptRoutes)
        ) {
            return redirect()->route('password.force.edit');
        }

        return $next($request);
    }
}