import { Head, Link } from '@inertiajs/react';

export default function HttpError({ status, message }) {
    return (
        <>
            <Head title={`Error ${status}`} />
            <div className="min-h-screen bg-[#F7F8FA] text-slate-900 selection:bg-[#C65B8A] selection:text-white">
                <div className="mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center px-6 py-16 text-center">
                    <div className="mb-6 rounded-3xl border border-[#D9C8D4] bg-white/95 p-10 shadow-[0_32px_90px_rgba(0,0,0,0.08)]">
                        <p className="text-sm font-semibold uppercase tracking-[0.35em] text-[#C65B8A]">Error</p>
                        <h1 className="mt-6 text-5xl font-semibold tracking-tight text-slate-900">{status}</h1>
                        <p className="mt-4 max-w-2xl text-base leading-8 text-slate-700">{message}</p>
                        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
                            <Link
                                href={route('dashboard')}
                                className="inline-flex items-center justify-center rounded-full bg-[#C65B8A] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#A44773]"
                            >
                                Back to dashboard
                            </Link>
                            <Link
                                href={route('facilities.index')}
                                className="inline-flex items-center justify-center rounded-full border border-[#D8C9C2] bg-white px-6 py-3 text-sm font-semibold text-slate-900 transition hover:border-[#BBA8A0] hover:bg-[#F7F1EE]"
                            >
                                Browse facilities
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
