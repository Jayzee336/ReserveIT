import { useState } from 'react';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import GuestLayout from '@/Layouts/GuestLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowLeft, Building2, Eye, EyeOff } from 'lucide-react';

export default function Register() {
    const [showPassword, setShowPassword] = useState(false);
    const { data, setData, post, processing, errors, reset } = useForm({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
    });

    const submit = (e) => {
        e.preventDefault();

        post(route('register'), {
            onFinish: () => reset('password', 'password_confirmation'),
        });
    };

    return (
        <GuestLayout>
            <Head title="Register" />

            <div className="w-full max-w-md rounded-3xl border border-[#E8D8D1] bg-white p-8 shadow-xl shadow-[#7A4A57]/5 sm:p-10">
                <Link
                    href="/"
                    className="mb-5 inline-flex items-center gap-2 rounded-lg text-xs font-semibold text-slate-500 transition hover:text-[#7A4A57] focus:outline-none focus:ring-2 focus:ring-[#7A4A57]/30 focus:ring-offset-2"
                    aria-label="Back to home"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back to home
                </Link>

                {/* Brand Header */}
                <div className="mb-8 text-center space-y-2">
                    <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#7A4A57] text-white shadow-md shadow-[#7A4A57]/20">
                        <Building2 className="h-6 w-6" />
                    </div>
                    <div className="flex items-center justify-center gap-2 pt-1">
                        <span className="text-2xl font-extrabold tracking-tight text-slate-900">ReserveIT</span>
                    </div>
                    <p className="text-xs font-medium text-slate-600">
                        Register to request and manage facility bookings
                    </p>
                </div>

                <form onSubmit={submit} className="space-y-4">
                    {/* Full Name */}
                    <div>
                        <InputLabel htmlFor="name" value="Full Name" className="text-xs font-bold text-slate-700" />
                        <div className="relative mt-1">
                            <TextInput
                                id="name"
                                name="name"
                                value={data.name}
                                className="block w-full rounded-2xl border-[#D8C9C2] bg-[#FFFBF6] py-2.5 px-3.5 text-xs font-medium text-slate-900 focus:border-[#7A4A57] focus:ring-[#7A4A57]"
                                autoComplete="name"
                                isFocused={true}
                                onChange={(e) => setData('name', e.target.value)}
                                required
                            />
                        </div>
                        <InputError message={errors.name} className="mt-1 text-xs" />
                    </div>

                    {/* Email */}
                    <div>
                        <InputLabel htmlFor="email" value="Email Address" className="text-xs font-bold text-slate-700" />
                        <div className="relative mt-1">
                            <TextInput
                                id="email"
                                type="email"
                                name="email"
                                value={data.email}
                                className="block w-full rounded-2xl border-[#D8C9C2] bg-[#FFFBF6] py-2.5 px-3.5 text-xs font-medium text-slate-900 focus:border-[#7A4A57] focus:ring-[#7A4A57]"
                                autoComplete="username"
                                onChange={(e) => setData('email', e.target.value)}
                                required
                            />
                        </div>
                        <InputError message={errors.email} className="mt-1 text-xs" />
                    </div>

                    {/* Password */}
                    <div>
                        <div className="flex items-center justify-between">
                            <InputLabel htmlFor="password" value="Password" className="text-xs font-bold text-slate-700" />
                            <button
                                type="button"
                                className="inline-flex items-center gap-1 text-[11px] font-bold text-[#7A4A57] transition hover:text-[#663c48]"
                                onClick={() => setShowPassword((value) => !value)}
                                aria-label={showPassword ? 'Hide password' : 'Show password'}
                            >
                                {showPassword ? (
                                    <>
                                        <EyeOff className="h-3.5 w-3.5" />
                                        <span>Hide</span>
                                    </>
                                ) : (
                                    <>
                                        <Eye className="h-3.5 w-3.5" />
                                        <span>Show</span>
                                    </>
                                )}
                            </button>
                        </div>
                        <div className="relative mt-1">
                            <TextInput
                                id="password"
                                type={showPassword ? 'text' : 'password'}
                                name="password"
                                value={data.password}
                                className="block w-full rounded-2xl border-[#D8C9C2] bg-[#FFFBF6] py-2.5 pl-3.5 pr-10 text-xs font-medium text-slate-900 focus:border-[#7A4A57] focus:ring-[#7A4A57]"
                                autoComplete="new-password"
                                onChange={(e) => setData('password', e.target.value)}
                                required
                            />
                        </div>
                        <InputError message={errors.password} className="mt-1 text-xs" />
                    </div>

                    {/* Confirm Password */}
                    <div>
                        <InputLabel htmlFor="password_confirmation" value="Confirm Password" className="text-xs font-bold text-slate-700" />
                        <div className="relative mt-1">
                            <TextInput
                                id="password_confirmation"
                                type={showPassword ? 'text' : 'password'}
                                name="password_confirmation"
                                value={data.password_confirmation}
                                className="block w-full rounded-2xl border-[#D8C9C2] bg-[#FFFBF6] py-2.5 pl-3.5 pr-10 text-xs font-medium text-slate-900 focus:border-[#7A4A57] focus:ring-[#7A4A57]"
                                autoComplete="new-password"
                                onChange={(e) => setData('password_confirmation', e.target.value)}
                                required
                            />
                        </div>
                        <InputError message={errors.password_confirmation} className="mt-1 text-xs" />
                    </div>

                    {/* Submit Button */}
                    <div className="pt-3">
                        <button
                            type="submit"
                            disabled={processing}
                            className="flex w-full items-center justify-center rounded-2xl bg-[#7A4A57] py-3 text-xs font-bold text-white shadow-md transition duration-200 hover:bg-[#663c48] focus:outline-none focus:ring-2 focus:ring-[#7A4A57] focus:ring-offset-2 active:scale-[0.99] disabled:opacity-50"
                        >
                            {processing ? 'Creating Account...' : 'Register'}
                        </button>
                    </div>
                </form>

                {/* Footer Link */}
                <div className="mt-8 text-center text-xs font-medium text-slate-600">
                    <span>Already registered?</span>{' '}
                    <Link
                        href={route('login')}
                        className="font-bold text-[#7A4A57] transition hover:text-[#663c48] hover:underline"
                    >
                        Sign in
                    </Link>
                </div>
            </div>
        </GuestLayout>
    );
}