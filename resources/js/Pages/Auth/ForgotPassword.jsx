import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import GuestLayout from '@/Layouts/GuestLayout';
import { Head, Link, useForm } from '@inertiajs/react';

export default function ForgotPassword({ status }) {
    const { data, setData, post, processing, errors } = useForm({
        email: '',
    });

    const submit = (e) => {
        e.preventDefault();

        post(route('password.email'));
    };

    return (
        <GuestLayout>
            <Head title="Forgot Password" />

            <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 shadow-sm sm:rounded-3xl">
                <div className="mb-6 text-center">
                    <h2 className="text-2xl font-semibold text-gray-900">Forgot Password?</h2>
                    <p className="mt-2 text-sm text-gray-600">
                        No problem. Enter your email address and we will send you a password reset link.
                    </p>
                </div>

                {status && (
                    <div className="mb-6 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm font-medium text-green-700">
                        {status}
                    </div>
                )}

                <form onSubmit={submit} className="space-y-5">
                    <div>
                        <InputLabel htmlFor="email" value="Email Address" />
                        <TextInput
                            id="email"
                            type="email"
                            name="email"
                            value={data.email}
                            className="mt-1 block w-full"
                            isFocused={true}
                            onChange={(e) => setData('email', e.target.value)}
                        />
                        <InputError message={errors.email} className="mt-2" />
                    </div>

                    <div className="pt-2">
                        <PrimaryButton className="w-full justify-center" disabled={processing}>
                            Email Password Reset Link
                        </PrimaryButton>
                    </div>
                </form>

                <div className="mt-6 text-center text-sm text-gray-600">
                    <Link
                        href={route('login')}
                        className="inline-flex items-center gap-1 font-medium text-indigo-600 hover:text-indigo-500"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={1.5}
                            stroke="currentColor"
                            className="h-4 w-4"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18"
                            />
                        </svg>
                        <span>Back to login</span>
                    </Link>
                </div>
            </div>
        </GuestLayout>
    );
}