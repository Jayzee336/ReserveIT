<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Validation\Rules\Password;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Http\RedirectResponse;

class SetPasswordController extends Controller
{
    public function edit(): Response
    {
        return Inertia::render('Auth/SetPassword');
    }

    public function update(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'password' => [
                'required',
                'confirmed',
                Password::min(8),
            ],
        ]);

        $user = $request->user();

        $user->password = $validated['password'];
        $user->save();

        return redirect()
            ->route('profile.edit')
            ->with('success', 'Your ReserveIT password has been set successfully.');
    }
}