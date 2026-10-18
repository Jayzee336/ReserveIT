<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\UserConcern;
use App\Models\UserConcernEditHistory;
use App\Models\UserConcernReplyHistory;
use App\Notifications\BookingOperationsNotification;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Response;

class UserConcernController extends Controller
{
    /**
     * Submit a new user concern or support ticket.
     * The submission date is automatically recorded by Laravel.
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'message' => ['nullable', 'string', 'max:1000'],
            'category' => [
                'required',
                'string',
                'in:Facility,UI Improvements,Account,Bug,Others',
            ],
            'detailed_info' => ['required', 'string', 'min:1', 'max:1000'],
        ], [
            'category.required' => 'Please select a concern category.',
            'category.in' => 'Please select a valid concern category.',
            'detailed_info.required' => 'Please enter details about your concern.',
            'detailed_info.min' => 'Please enter details about your concern.',
            'detailed_info.max' => 'The ticket description may not exceed 1,000 characters.',
        ]);

        $details = trim($validated['detailed_info']);

        if ($details === '') {
            return redirect()->back()->withErrors([
                'detailed_info' => 'Please enter details about your concern.',
            ]);
        }

        $userConcern = UserConcern::create([
            'user_id' => $request->user()?->id,
            'message' => $details,
            'category' => $validated['category'],
            'detailed_info' => $details,
            'status' => 'pending',
        ]);

        // Notify super admins about the new ticket.
        User::where('role', 'super_admin')
            ->lazy()
            ->each(function (User $admin) use ($request, $userConcern) {
                $senderName = $request->user()?->name ?? 'Guest';

                $admin->notify(new BookingOperationsNotification(
                    "New support ticket #{$userConcern->id}: {$userConcern->category} — {$senderName}",
                    $userConcern->id
                ));
            });

        return redirect()->back()->with('toast', [
            'type' => 'success',
            'message' => 'Your ticket has been submitted successfully! Our developers will review it soon.',
        ]);
    }

    /**
     * Return the current user's tickets.
     */
    public function myTickets(Request $request): RedirectResponse|Response
    {
        if (!$request->user()) {
            return redirect()->route('login')
                ->with('error', 'Please log in to view your tickets.');
        }

        $tickets = UserConcern::where('user_id', $request->user()->id)
            ->latest()
            ->get();

        return inertia('User/Tickets', [
            'tickets' => $tickets,
        ]);
    }

    /**
     * Update a ticket belonging to the authenticated user.
     * The original submission date cannot be changed.
     * Resolved tickets cannot be edited.
     */
    public function updateMyTicket(
        Request $request,
        UserConcern $concern
    ): RedirectResponse {
        $user = $request->user();

        if (!$user) {
            return redirect()->route('login');
        }

        // Users and facility admins can only edit their own tickets.
        abort_unless(
            (int) $concern->user_id === (int) $user->id,
            403,
            'You are not authorized to edit this ticket.'
        );

        // Resolved tickets cannot be changed by the submitter.
        abort_if(
            $concern->status === 'resolved',
            403,
            'Resolved tickets cannot be edited.'
        );

        $validated = $request->validate([
            'category' => [
                'required',
                'string',
                'in:Facility,UI Improvements,Account,Bug,Others',
            ],
            'detailed_info' => ['required', 'string', 'min:1', 'max:1000'],
        ], [
            'category.required' => 'Please select a concern category.',
            'category.in' => 'Please select a valid concern category.',
            'detailed_info.required' => 'Please enter details about your concern.',
            'detailed_info.min' => 'Please enter details about your concern.',
            'detailed_info.max' => 'The ticket description may not exceed 1,000 characters.',
        ]);

        $newCategory = $validated['category'];
        $newDetails = trim($validated['detailed_info']);

        if ($newDetails === '') {
            return redirect()->back()->withErrors([
                'detailed_info' => 'Please enter details about your concern.',
            ]);
        }

        $oldCategory = $concern->category;
        $oldDetails = $concern->detailed_info ?? $concern->message;

        if (
            $newCategory === $oldCategory &&
            $newDetails === $oldDetails
        ) {
            return redirect()->back()->with('toast', [
                'type' => 'info',
                'message' => 'No changes were made to your ticket.',
            ]);
        }

        DB::transaction(function () use (
            $concern,
            $user,
            $newCategory,
            $newDetails,
            $oldCategory,
            $oldDetails
        ) {
            // Retain the legacy appeal-date fields in the history table.
            // The original stored value is copied unchanged.
            $originalAppealDate = $concern->appeal_date
                ? substr((string) $concern->appeal_date, 0, 10)
                : null;

            UserConcernEditHistory::create([
                'user_concern_id' => $concern->id,
                'previous_appeal_date' => $originalAppealDate,
                'updated_appeal_date' => $originalAppealDate,
                'previous_category' => $oldCategory,
                'updated_category' => $newCategory,
                'previous_detailed_info' => $oldDetails,
                'updated_detailed_info' => $newDetails,
                'edited_by' => $user->id,
            ]);

            // Preserve ticket ID, submission date, status, and admin reply.
            $concern->update([
                'category' => $newCategory,
                'detailed_info' => $newDetails,
                'message' => $newDetails,
            ]);
        });

        return redirect()->back()->with('toast', [
            'type' => 'success',
            'message' => 'Your ticket has been updated successfully.',
        ]);
    }

    /**
     * Admin: Reply to a concern or support ticket.
     */
    public function reply(
        Request $request,
        UserConcern $concern
    ): RedirectResponse {
        $validated = $request->validate([
            'admin_reply' => ['required', 'string', 'min:1', 'max:5000'],
        ]);

        $reply = trim($validated['admin_reply']);

        if ($reply === '') {
            return redirect()->back()->withErrors([
                'admin_reply' => 'Please enter a reply.',
            ]);
        }

        $concern->update([
            'admin_reply' => $reply,
            'status' => 'resolved',
        ]);

        // Notify the user who submitted the ticket, if registered.
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
            'type' => 'success',
            'message' => 'Reply sent and ticket marked as resolved.',
        ]);
    }

    /**
     * Super Admin: Edit an existing admin reply.
     * Preserve reply history, ticket status, and notification state.
     */
    public function updateReply(
        Request $request,
        UserConcern $concern
    ): RedirectResponse {
        $validated = $request->validate([
            'admin_reply' => ['required', 'string', 'min:1', 'max:5000'],
        ]);

        $newReply = trim($validated['admin_reply']);

        if ($newReply === '') {
            return redirect()->back()->withErrors([
                'admin_reply' => 'Please enter a reply.',
            ]);
        }

        if (empty($concern->admin_reply)) {
            return redirect()->back()->with('toast', [
                'type' => 'error',
                'message' => 'There is no existing reply to edit.',
            ]);
        }

        if ($newReply === $concern->admin_reply) {
            return redirect()->back()->with('toast', [
                'type' => 'info',
                'message' => 'No changes were made to the reply.',
            ]);
        }

        $editor = $request->user();

        if (!$editor) {
            return redirect()->route('login');
        }

        DB::transaction(function () use ($concern, $newReply, $editor) {
            UserConcernReplyHistory::create([
                'user_concern_id' => $concern->id,
                'previous_reply' => $concern->admin_reply,
                'updated_reply' => $newReply,
                'edited_by' => $editor->id,
            ]);

            // Update only the reply; leave status unchanged.
            $concern->update([
                'admin_reply' => $newReply,
            ]);
        });

        return redirect()->back()->with('toast', [
            'type' => 'success',
            'message' => 'Admin reply updated successfully. Edit history has been saved.',
        ]);
    }
}