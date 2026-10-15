import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, useForm } from '@inertiajs/react';

export default function SetPassword() {
    const { data, setData, put, processing, errors, reset } = useForm({
        password: '',
        password_confirmation: '',
    });

    const submit = (e) => {
        e.preventDefault();

        put(route('password.set.update'), {
            onSuccess: () => reset(),
        });
    };

    return (
        <AuthenticatedLayout header="Set ReserveIT Password">
            <Head title="Set ReserveIT Password" />

            <div className="mx-auto max-w-3xl p-6">
                <div className="rounded-3xl border border-[#E8D8D1] bg-white p-8 shadow-lg">
                    <p className="text-sm uppercase tracking-[0.2em] text-[#7A4A57]">
                        Account Security
                    </p>

                    <h1 className="mt-3 text-2xl font-semibold text-slate-900">
                        Set Your ReserveIT Password
                    </h1>

                    <p className="mt-3 text-sm leading-6 text-slate-600">
                        Create a separate password for ReserveIT. You can continue
                        using Google to sign in; this password is only for your
                        ReserveIT account.
                    </p>

                    <form onSubmit={submit} className="mt-8 space-y-6">
                        <div>
                            <label
                                htmlFor="password"
                                className="block text-sm font-medium text-slate-700"
                            >
                                New Password
                            </label>

                            <input
                                id="password"
                                type="password"
                                autoComplete="new-password"
                                value={data.password}
                                onChange={(e) => setData('password', e.target.value)}
                                className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 focus:border-[#7A4A57] focus:outline-none focus:ring-2 focus:ring-[#7A4A57]/20"
                                required
                            />

                            {errors.password && (
                                <p className="mt-2 text-sm text-red-600">
                                    {errors.password}
                                </p>
                            )}
                        </div>

                        <div>
                            <label
                                htmlFor="password_confirmation"
                                className="block text-sm font-medium text-slate-700"
                            >
                                Confirm New Password
                            </label>

                            <input
                                id="password_confirmation"
                                type="password"
                                autoComplete="new-password"
                                value={data.password_confirmation}
                                onChange={(e) =>
                                    setData('password_confirmation', e.target.value)
                                }
                                className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 focus:border-[#7A4A57] focus:outline-none focus:ring-2 focus:ring-[#7A4A57]/20"
                                required
                            />

                            {errors.password_confirmation && (
                                <p className="mt-2 text-sm text-red-600">
                                    {errors.password_confirmation}
                                </p>
                            )}
                        </div>

                        <div className="space-y-3">
                            <button
                                type="submit"
                                disabled={processing}
                                className="w-full rounded-xl bg-[#7A4A57] px-5 py-3 font-semibold text-white transition hover:bg-[#633945] disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {processing
                                    ? 'Saving Password...'
                                    : 'Save ReserveIT Password'}
                            </button>

                            <Link
                                href={route('profile.edit')}
                                className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#E8D8D1] bg-white px-5 py-3 font-semibold text-[#7A4A57] transition hover:bg-[#F9F4EF]"
                            >
                                <span aria-hidden="true">&larr;</span>
                                Back to Profile Settings
                            </Link>
                        </div>
                    </form>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}