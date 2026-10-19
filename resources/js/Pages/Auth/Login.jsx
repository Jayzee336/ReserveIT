import Checkbox from '@/Components/Checkbox';
import GuestLayout from '@/Layouts/GuestLayout';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { useState } from 'react';
import { ArrowLeft, Building2, Eye, EyeOff } from 'lucide-react';

export default function Login({ status, canResetPassword }) {
    const [showPassword, setShowPassword] = useState(false);

    const { flash = {} } = usePage().props;

    const { data, setData, post, processing, errors, reset } = useForm({
        email: '',
        password: '',
        remember: false,
    });

    const submit = (e) => {
        e.preventDefault();

        post(route('login'), {
            onFinish: () => reset('password'),
        });
    };

    const handleGoogleLogin = () => {
        // Full browser redirect required for Socialite OAuth logic.
        window.location.href = route('auth.google');
    };

    return (
        <GuestLayout>
            <Head title="Log in" />

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
                <div className="mb-8 space-y-2 text-center">
                    <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#7A4A57] text-white shadow-md shadow-[#7A4A57]/20">
                        <Building2 className="h-6 w-6" />
                    </div>

                    <div className="flex items-center justify-center gap-2 pt-1">
                        <span className="text-2xl font-extrabold tracking-tight text-slate-900">
                            ReserveIT
                        </span>
                    </div>

                    <p className="text-xs font-medium text-slate-600">
                        Sign in to access facility schedules &amp; reservations
                    </p>
                </div>

                {/* Flash error from Google SSO or other redirects */}
                {flash.error && (
                    <div
                        role="alert"
                        aria-live="assertive"
                        className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800 shadow-sm"
                    >
                        {flash.error}
                    </div>
                )}

                {/* Existing status message */}
                {status && (
                    <div
                        role="status"
                        className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50/80 px-4 py-3 text-xs font-semibold text-emerald-800 shadow-sm"
                    >
                        {status}
                    </div>
                )}

                {/* Google SSO Button */}
                <div className="mb-6">
                    <button
                        type="button"
                        onClick={handleGoogleLogin}
                        className="flex w-full items-center justify-center gap-3 rounded-2xl border border-[#D8C9C2] bg-white px-4 py-3 text-xs font-bold text-slate-700 shadow-sm transition hover:border-[#7A4A57]/40 hover:bg-[#FFF8F2] active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-[#7A4A57]/20"
                    >
                        <svg
                            className="h-4 w-4 shrink-0"
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                        >
                            <path
                                fill="#4285F4"
                                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                            />
                            <path
                                fill="#34A853"
                                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                            />
                            <path
                                fill="#FBBC05"
                                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                            />
                            <path
                                fill="#EA4335"
                                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                            />
                        </svg>

                        <span>Sign in with Google Account</span>
                    </button>
                </div>

                {/* Divider */}
                <div className="relative mb-6">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-[#E8D8D1]" />
                    </div>

                    <div className="relative flex justify-center text-[10px] font-bold uppercase tracking-wider">
                        <span className="bg-white px-3 text-slate-400">
                            or with institutional email
                        </span>
                    </div>
                </div>

                <form onSubmit={submit} className="space-y-4">
                    {/* Email Input */}
                    <div>
                        <InputLabel
                            htmlFor="email"
                            value="Email Address"
                            className="text-xs font-bold text-slate-700"
                        />

                        <div className="relative mt-1">
                            <TextInput
                                id="email"
                                type="email"
                                name="email"
                                value={data.email}
                                placeholder="your.email@uic.edu.ph"
                                className="block w-full rounded-2xl border-[#D8C9C2] bg-[#FFFBF6] px-3.5 py-2.5 text-xs font-medium text-slate-900 focus:border-[#7A4A57] focus:ring-[#7A4A57]"
                                autoComplete="username"
                                isFocused={true}
                                onChange={(e) =>
                                    setData('email', e.target.value)
                                }
                            />
                        </div>

                        <InputError
                            message={errors.email}
                            className="mt-1 text-xs"
                        />
                    </div>

                    {/* Password Input */}
                    <div>
                        <div className="flex items-center justify-between">
                            <InputLabel
                                htmlFor="password"
                                value="Password"
                                className="text-xs font-bold text-slate-700"
                            />

                            <button
                                type="button"
                                className="inline-flex items-center gap-1 text-[11px] font-bold text-[#7A4A57] transition hover:text-[#663c48]"
                                onClick={() =>
                                    setShowPassword((value) => !value)
                                }
                                aria-label={
                                    showPassword
                                        ? 'Hide password'
                                        : 'Show password'
                                }
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
                                placeholder="••••••••••••"
                                className="block w-full rounded-2xl border-[#D8C9C2] bg-[#FFFBF6] py-2.5 pl-3.5 pr-10 text-xs font-medium text-slate-900 focus:border-[#7A4A57] focus:ring-[#7A4A57]"
                                autoComplete="current-password"
                                onChange={(e) =>
                                    setData('password', e.target.value)
                                }
                            />
                        </div>

                        <InputError
                            message={errors.password}
                            className="mt-1 text-xs"
                        />
                    </div>

                    {/* Remember Me & Forgot Password */}
                    <div className="flex items-center justify-between pt-1">
                        <label className="flex cursor-pointer items-center">
                            <Checkbox
                                name="remember"
                                checked={data.remember}
                                onChange={(e) =>
                                    setData('remember', e.target.checked)
                                }
                                className="rounded-md border-[#D8C9C2] text-[#7A4A57] focus:ring-[#7A4A57]"
                            />

                            <span className="ms-2 text-xs font-medium text-slate-600">
                                Remember me
                            </span>
                        </label>

                        {canResetPassword && (
                            <Link
                                href={route('password.request')}
                                className="text-xs font-bold text-[#7A4A57] transition hover:text-[#663c48] hover:underline"
                            >
                                Forgot password?
                            </Link>
                        )}
                    </div>

                    {/* Submit Button */}
                    <div className="pt-3">
                        <button
                            type="submit"
                            disabled={processing}
                            className="flex w-full items-center justify-center rounded-2xl bg-[#7A4A57] py-3 text-xs font-bold text-white shadow-md transition duration-200 hover:bg-[#663c48] focus:outline-none focus:ring-2 focus:ring-[#7A4A57] focus:ring-offset-2 active:scale-[0.99] disabled:opacity-50"
                        >
                            {processing ? 'Signing in...' : 'Sign In'}
                        </button>
                    </div>
                </form>

                {/* Footer Link */}
                <div className="mt-8 text-center text-xs font-medium text-slate-600">
                    <span>Don&apos;t have an account?</span>{' '}
                    <Link
                        href={route('register')}
                        className="font-bold text-[#7A4A57] transition hover:text-[#663c48] hover:underline"
                    >
                        Create an account
                    </Link>
                </div>
            </div>
        </GuestLayout>
    );
}