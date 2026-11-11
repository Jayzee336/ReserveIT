import React from 'react';
import { Building2, Bookmark, CheckCircle2, KeyRound, Sparkles } from 'lucide-react';

export default function GuestLayout({ children }) {
    return (
        <div className="relative min-h-screen bg-[#F7F8FA] text-slate-900 flex items-center justify-center p-4 sm:p-8 selection:bg-[#C65B8A] selection:text-white overflow-hidden">
            
            {/* Background Desk Elements (Ambient Glow & Soft Patterns) */}
            <div className="pointer-events-none absolute -top-24 -left-24 h-96 w-96 rounded-full bg-[#C65B8A]/15 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-[#C65B8A]/15 blur-3xl" />

            {/* THE OPEN RESERVATION BOOK CONTAINER */}
            <div className="relative z-10 w-full max-w-5xl rounded-[2.5rem] bg-[#493344] p-3 sm:p-4 shadow-2xl shadow-[#493344]/30 ring-1 ring-[#C65B8A]">
                
                {/* Book Cover Edge Border */}
                <div className="relative overflow-hidden rounded-[2rem] bg-[#FCFAFB] grid md:grid-cols-2 min-h-[580px] shadow-inner">
                    
                    {/* Hanging Ribbon Bookmark Effect */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 z-30 hidden md:block">
                        <div className="w-5 h-24 bg-[#C65B8A] shadow-md rounded-b-md relative">
                            <div className="absolute bottom-0 left-0 right-0 h-3 bg-[#A44773] clip-path-ribbon" />
                        </div>
                    </div>

                    {/* Book Spine Center Shadow Line (Simulates Open Book Seam) */}
                    <div className="pointer-events-none absolute inset-y-0 left-1/2 -translate-x-1/2 w-8 bg-gradient-to-r from-black/10 via-black/5 to-black/10 z-20 hidden md:block" />

                    {/* LEFT PAGE: Ledger Cover & Facility Info */}
                    <div className="relative p-8 sm:p-10 bg-[#FCFAFB] flex flex-col justify-between border-b md:border-b-0 md:border-r border-[#E8E1E7]">
                        
                        {/* Top Page Header */}
                        <div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#C65B8A] text-white shadow-sm">
                                        <Building2 className="h-5 w-5" />
                                    </div>
                                    <span className="text-xl font-bold tracking-tight text-slate-900">ReserveIT</span>
                                </div>
                                
                                <span className="text-[10px] font-mono tracking-widest uppercase text-slate-400 bg-white px-2.5 py-1 rounded-md border border-[#E8E1E7]">
                                    VOL. 2026
                                </span>
                            </div>

                            {/* Book Title / Decorative Ink Stamp */}
                            <div className="mt-10 space-y-3 relative">
                                {/* Ink Stamp Graphic */}
                                <div className="absolute -top-4 right-0 rotate-12 pointer-events-none opacity-20">
                                    <div className="border-4 border-[#C65B8A] text-[#C65B8A] font-black text-xs px-3 py-1 rounded-lg uppercase tracking-widest">
                                        OFFICIAL LOGBOOK
                                    </div>
                                </div>

                                <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#C65B8A]">
                                    <Bookmark className="h-4 w-4" />
                                    <span>UIC Campus Reservation Registry</span>
                                </div>

                                <h2 className="text-2xl sm:text-3xl font-serif font-bold text-slate-900 leading-tight">
                                    Sign into the Campus Facility Book.
                                </h2>

                                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-sans">
                                    Welcome to the central venue log. Reserve lab spaces, check room availability, and receive instant entry clearance.
                                </p>
                            </div>
                        </div>

                        {/* Page Footer / Ledger Details */}
                        <div className="mt-8 pt-6 border-t border-[#E8E1E7] space-y-2.5 text-xs text-slate-600 font-sans">
                            <div className="flex items-center gap-2">
                                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                                <span>Real-time availability log for all UIC units</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <KeyRound className="h-4 w-4 text-[#C65B8A] shrink-0" />
                                <span>Digital QR gate pass generated upon approval</span>
                            </div>
                        </div>

                        {/* Faint Page Lines Graphic at Bottom */}
                        <div className="absolute bottom-3 right-4 opacity-30 pointer-events-none font-serif text-[10px] text-slate-400">
                            Page 01 • UIC Facility Management
                        </div>
                    </div>

                    {/* RIGHT PAGE: The Form Sign-in Ledger */}
                    <div className="relative p-8 sm:p-12 bg-[#FCFAFB] flex flex-col justify-center">
                        
                        {/* Page Line Pattern Background (Subtle) */}
                        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,#00000005_1px,transparent_1px)] bg-[size:100%_2rem]" />

                        {/* Form Container */}
                        <div className="relative z-10 w-full max-w-sm mx-auto">
                            {children}
                        </div>

                        {/* Page Number */}
                        <div className="absolute bottom-3 right-6 opacity-30 pointer-events-none font-serif text-[10px] text-slate-400">
                            Entry Form • Sec. Auth
                        </div>
                    </div>

                </div>
            </div>

        </div>
    );
}