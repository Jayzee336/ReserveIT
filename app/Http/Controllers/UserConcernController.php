<?php

namespace App\Http\Controllers;

use App\Models\UserConcern;
use App\Models\User;
use App\Notifications\BookingOperationsNotification;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Response;

class UserConcernController extends Controller
{
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'message'       => ['nullable', 'string', 'min:1', 'max:1000'],
            'appeal_date'   => ['nullable', 'date'],
            'category'      => ['nullable', 'string', 'in:Facility,UI Improvements,Account,Bug,Others'],
            'detailed_info' => ['required', 'string', 'min:1', 'max:1000'],
        ], [
            'message.max' => 'The ticket description may not exceed 1,000 characters.',
            'detailed_info.required' => 'Please enter details about your concern.',
            'detailed_info.min' => 'Please enter details about your concern.',
            'detailed_info.max' => 'The ticket description may not exceed 1,000 characters.',
        ]);

        $userConcern = UserConcern::create([
            'user_id'       => $request->user()?->id,
            'message'       => $validated['message'] ?? 'No message provided',
            'appeal_date'   => $validated['appeal_date'] ?? null,
            'category'      => $validated['category'] ?? 'Others',
            'detailed_info' => $validated['detailed_info'] ?? null,
            'status'        => 'pending',
        ]);

        // Notify super admins safely and memory-efficiently using lazy streaming
        User::where('role', 'super_admin')->lazy()->each(function (User $admin) use ($request, $userConcern) {
            $senderName = $request->user()?->name ?? 'Guest';
            $admin->notify(new BookingOperationsNotification(
                "New support ticket #{$userConcern->id}: {$userConcern->category} — {$senderName}",
                $userConcern->id
            ));
        });

        return redirect()->back()->with('toast', [
            'type'    => 'success',
            'message' => 'Your ticket has been submitted successfully! Our developers will review it soon.',
        ]);
    }

    /**
     * Return the current user's tickets (for the User/Tickets page).
     */
    public function myTickets(Request $request): RedirectResponse|Response
    {
        // Enforce safety check if route is not protected by auth middleware
        if (!$request->user()) {
            return redirect()->route('login')->with('error', 'Please log in to view your tickets.');
        }

        $tickets = UserConcern::where('user_id', $request->user()->id)
            ->latest()
            ->get();

        return inertia('User/Tickets', [
            'tickets' => $tickets,
        ]);
    }

    /**
     * Admin: Reply to a concern/ticket.
     */
    public function reply(Request $request, UserConcern $concern): RedirectResponse
    {
        $validated = $request->validate([
            'admin_reply' => ['required', 'string', 'min:1'],
        ]);

        $concern->update([
            'admin_reply' => $validated['admin_reply'],
            'status'      => 'resolved',
        ]);

        // Notify the user who submitted the ticket if they are a registered user
        if ($concern->user_id) {
            $user = User::find($concern->user_id);
            if ($user) {
                $user->notify(new BookingOperationsNotification(
                    "Your support ticket #{$concern->id} has received a reply from the admin team.",
                    $concern->id
                ));
            }
        }

        return redirect()->back()->with('toast', [
            'type'    => 'success',
            'message' => 'Reply sent and ticket marked as resolved.',
        ]);
    }
}