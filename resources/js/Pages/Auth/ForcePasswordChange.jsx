import { Head, useForm } from '@inertiajs/react';
import { KeyRound } from 'lucide-react';

export default function ForcePasswordChange() {
    const { data, setData, put, processing, errors } = useForm({
        password: '',
        password_confirmation: '',
    });

    const submit = (e) => {
        e.preventDefault();
        put(route('password.force.update'));
    };

    return (
        <div className="min-h-screen bg-[#FDF6F0] flex items-center justify-center p-4">
            <Head title="Set Your Password" />

            <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl border border-[#E8D8D1] p-8">
                <div className="flex flex-col items-center text-center mb-6">
                    <div className="h-12 w-12 rounded-full bg-[#F4E9E7] flex items-center justify-center mb-3">
                        <KeyRound className="h-6 w-6 text-[#6A535C]" />
                    </div>
                    <h1 className="text-lg font-bold text-gray-900">Set a New Password</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        You're using a temporary password. Please set a new one to continue.
                    </p>
                </div>

                <form onSubmit={submit} className="space-y-4">
                    <div>
                        <input
                            type="password"
                            required
                            autoComplete="new-password"
                            placeholder="New password"
                            value={data.password}
                            onChange={(e) => setData('password', e.target.value)}
                            className="block w-full border border-[#E8D8D1] rounded-xl p-2.5 text-sm focus:border-[#6A535C] focus:outline-none focus:ring-2 focus:ring-[#6A535C]/20"
                        />
                        {errors.password && <p className="text-xs text-red-600 mt-1">{errors.password}</p>}
                    </div>

                    <div>
                        <input
                            type="password"
                            required
                            autoComplete="new-password"
                            placeholder="Confirm new password"
                            value={data.password_confirmation}
                            onChange={(e) => setData('password_confirmation', e.target.value)}
                            className="block w-full border border-[#E8D8D1] rounded-xl p-2.5 text-sm focus:border-[#6A535C] focus:outline-none focus:ring-2 focus:ring-[#6A535C]/20"
                        />
                        {errors.password_confirmation && <p className="text-xs text-red-600 mt-1">{errors.password_confirmation}</p>}
                    </div>

                    <button
                        type="submit"
                        disabled={processing}
                        className="w-full py-3 bg-[#6A535C] hover:bg-[#57434B] text-white rounded-xl text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {processing ? 'Saving…' : 'Set Password & Continue'}
                    </button>
                </form>
            </div>
        </div>
    );
}