import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';
import DeleteUserForm from './Partials/DeleteUserForm';
import UpdatePasswordForm from './Partials/UpdatePasswordForm';
import UpdateProfileInformationForm from './Partials/UpdateProfileInformationForm';

export default function Edit({ mustVerifyEmail, status, isSsoUser }) {
    return (
        <AuthenticatedLayout header="Profile settings">
            <Head title="Profile" />

            <div className="space-y-6">
                <section className="rounded-[2rem] border border-[#E8D8D1] bg-white p-8 shadow-[0_32px_90px_rgba(0,0,0,0.08)]">
                    <div className="mb-6">
                        <p className="text-sm uppercase tracking-[0.27em] text-[#7A4A57]">
                            Profile management
                        </p>

                        <h1 className="mt-4 text-3xl font-semibold text-slate-900">
                            Keep your profile information up to date
                        </h1>

                        <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
                            Update your name, email, password, and access preferences
                            for the university facilities portal.
                        </p>
                    </div>

                    <div className="space-y-8">
                        <div className="rounded-3xl bg-[#F9F4EF] p-6">
                            <UpdateProfileInformationForm
                                mustVerifyEmail={mustVerifyEmail}
                                status={status}
                                className="max-w-2xl"
                            />
                        </div>

                        <div className="rounded-3xl bg-[#F9F4EF] p-6">
                            {isSsoUser ? (
                                <div className="max-w-2xl">
                                    <h2 className="text-lg font-medium text-slate-900">
                                        ReserveIT password
                                    </h2>

                                    <p className="mt-2 text-sm leading-6 text-slate-600">
                                        You sign in using Google. You can also set a
                                        separate ReserveIT password to sign in with
                                        your email address.
                                    </p>

                                    <Link
                                        href={route('password.set.edit')}
                                        className="mt-4 inline-flex items-center rounded-xl bg-[#7A4A57] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#633945]"
                                    >
                                        Set ReserveIT Password
                                    </Link>
                                </div>
                            ) : (
                                <UpdatePasswordForm className="max-w-2xl" />
                            )}
                        </div>

                        <div className="rounded-3xl border border-rose-100 bg-[#FFF1EE] p-6">
                            <DeleteUserForm
                                isSsoUser={isSsoUser}
                                className="max-w-2xl"
                            />
                        </div>
                    </div>
                </section>
            </div>
        </AuthenticatedLayout>
    );
}