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
        username: '',
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

            <div className="w-full max-w-md rounded-3xl border border-[#E8E1E7] bg-white p-8 shadow-xl shadow-[#C65B8A]/5 sm:p-10">
                <Link
                    href="/"
                    className="mb-5 inline-flex items-center gap-2 rounded-lg text-xs font-semibold text-slate-500 transition hover:text-[#C65B8A] focus:outline-none focus:ring-2 focus:ring-[#C65B8A]/30 focus:ring-offset-2"
                    aria-label="Back to home"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back to home
                </Link>

                {/* Brand Header */}
                <div className="mb-8 text-center space-y-2">
                    <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#C65B8A] text-white shadow-md shadow-[#C65B8A]/20">
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
                                className="block w-full rounded-2xl border-[#E8E1E7] bg-[#FCFAFB] py-2.5 px-3.5 text-xs font-medium text-slate-900 focus:border-[#C65B8A] focus:ring-[#C65B8A]"
                                autoComplete="name"
                                isFocused={true}
                                onChange={(e) => setData('name', e.target.value)}
                                required
                            />
                        </div>
                        <InputError message={errors.name} className="mt-1 text-xs" />
                    </div>

                    {/* Username */}
                    <div>
                        <InputLabel htmlFor="username" value="Username" className="text-xs font-bold text-slate-700" />
                        <div className="relative mt-1">
                            <TextInput
                                id="username"
                                name="username"
                                value={data.username}
                                className="block w-full rounded-2xl border-[#E8E1E7] bg-[#FCFAFB] py-2.5 px-3.5 text-xs font-medium text-slate-900 focus:border-[#C65B8A] focus:ring-[#C65B8A]"
                                autoComplete="username"
                                onChange={(e) => setData('username', e.target.value.toLowerCase())}
                                required
                            />
                        </div>
                        <p className="mt-1 text-[11px] text-slate-500">Use letters, numbers, hyphens, or underscores.</p>
                        <InputError message={errors.username} className="mt-1 text-xs" />
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
                                className="block w-full rounded-2xl border-[#E8E1E7] bg-[#FCFAFB] py-2.5 px-3.5 text-xs font-medium text-slate-900 focus:border-[#C65B8A] focus:ring-[#C65B8A]"
                                autoComplete="email"
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
                                className="inline-flex items-center gap-1 text-[11px] font-bold text-[#C65B8A] transition hover:text-[#A44773]"
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
                                className="block w-full rounded-2xl border-[#E8E1E7] bg-[#FCFAFB] py-2.5 pl-3.5 pr-10 text-xs font-medium text-slate-900 focus:border-[#C65B8A] focus:ring-[#C65B8A]"
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
                                className="block w-full rounded-2xl border-[#E8E1E7] bg-[#FCFAFB] py-2.5 pl-3.5 pr-10 text-xs font-medium text-slate-900 focus:border-[#C65B8A] focus:ring-[#C65B8A]"
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
                            className="flex w-full items-center justify-center rounded-2xl bg-[#C65B8A] py-3 text-xs font-bold text-white shadow-md transition duration-200 hover:bg-[#A44773] focus:outline-none focus:ring-2 focus:ring-[#C65B8A] focus:ring-offset-2 active:scale-[0.99] disabled:opacity-50"
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
                        className="font-bold text-[#C65B8A] transition hover:text-[#A44773] hover:underline"
                    >
                        Sign in
                    </Link>
                </div>
            </div>
        </GuestLayout>
    );
}