<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\UserConcern;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ConcernManagementController extends Controller
{
    public function index(Request $request): Response
    {
        $query = UserConcern::with([
            'user:id,name,email',
            'replyHistories.editor:id,name',
        ]);

        // Search by description or user name
        if ($search = $request->input('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('message', 'like', "%{$search}%")
                  ->orWhere('detailed_info', 'like', "%{$search}%")
                  ->orWhereHas('user', fn ($u) => $u->where('name', 'like', "%{$search}%"));
            });
        }

        // Filter by category
        if ($category = $request->input('category')) {
            $query->where('category', $category);
        }

        return Inertia::render('Admin/Concerns', [
            'concerns' => $query->latest()->paginate(20)->withQueryString(),
            'filters' => $request->only(['search', 'category']),
        ]);
    }

    public function resolve(UserConcern $concern)
    {
        $concern->update(['status' => 'resolved']);

        return redirect()->back()->with('toast', ['type' => 'success', 'message' => 'Concern marked as resolved.']);
    }
}