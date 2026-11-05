import React, { useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Building2, 
    CalendarPlus, 
    CheckCircle2, 
    History, 
    ShieldCheck, 
    ArrowRight, 
    Sparkles, 
    MapPin, 
    Users,
    ChevronRight,
    Menu,
    X,
    Mail,
    Phone,
    Clock,
    FileText,
    HelpCircle,
    Info,
    Calendar as CalendarIcon,
    Check,
    Lock,
    HelpCircle as GuideIcon,
    ChevronLeft,
    QrCode,
    Send
} from 'lucide-react';

// Default fallback facilities in case database is not seeded yet
const FALLBACK_FACILITIES = [
    {
        id: 'ccs-lab-1',
        name: 'CCS Computer Lab 01',
        department: 'College of Computer Studies',
        badge: 'CCS',
        capacity: '40 Workstations',
        status: 'Available',
        image: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&q=80&w=1000',
        description: 'High-spec workstations with dual monitors, development tools, and high-speed network racks.'
    },
    {
        id: 'chefs-kitchen',
        name: 'CHEFS Culinary Prep Kitchen',
        department: 'Hospitality & Culinary',
        badge: 'CHEFS',
        capacity: '25 Cooking Stations',
        status: 'Available',
        image: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&q=80&w=1000',
        description: 'Commercial-grade kitchen setup equipped with stainless steel prep stations and ovens.'
    },
    {
        id: 'main-auditorium',
        name: 'UIC Main Auditorium',
        department: 'General Campus Facility',
        badge: 'MAIN',
        capacity: '500 Seats',
        status: 'Reserved Today',
        image: 'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&q=80&w=1000',
        description: 'Large-scale auditorium with stage lighting, surround sound, and theater seating for university events.'
    }
];

// Interactive Guided Tour Steps Data
const TOUR_STEPS = [
    {
        step: 1,
        title: "Browse & Select Facility",
        subtitle: "Find your ideal academic venue",
        icon: Building2,
        description: "Explore lab spaces, auditoriums, and culinary stations across UIC-MAIN. Check capacity, equipment specs, and real-time availability calendar before submitting your request.",
        tip: "Faculty and student organizations get real-time schedule visibility."
    },
    {
        step: 2,
        title: "Submit Booking Request",
        subtitle: "Provide event specs and date details",
        icon: Send,
        description: "Specify your required date, time slots, expected attendees, and event description. Upload consent letters or adviser endorsements if required for non-academic hours.",
        tip: "Standard booking requests require at least 48 hours advance notice."
    },
    {
        step: 3,
        title: "Departmental Approval",
        subtitle: "Automated routing to facility custodians",
        icon: CheckCircle2,
        description: "Your request is automatically assigned to the designated facility admin (e.g., CCS Lab Manager or MIS Custodian) for clearance and priority verification.",
        tip: "Track your live request status anytime inside your dashboard."
    },
    {
        step: 4,
        title: "Receive Pass & Check-In",
        subtitle: "Automated QR clearance & gate entry",
        icon: QrCode,
        description: "Once approved, ReserveIT generates your digital entry pass. Security and lab technicians can scan your pass for overtime check-ins and key distribution.",
        tip: "Digital logs prevent double-booking and maintain clear usage records."
    }
];

export default function Welcome({ auth, dbFacilities = [], dbSchedules = [] }) {
    // Determine active facilities (DB prioritized over fallback)
    const activeFacilitiesList = dbFacilities.length > 0 ? dbFacilities : FALLBACK_FACILITIES;

    const [activeFacilityId, setActiveFacilityId] = useState(activeFacilitiesList[0]?.id);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    
    // Interactive Tour Modal State
    const [isTourOpen, setIsTourOpen] = useState(false);
    const [currentTourStep, setCurrentTourStep] = useState(0);

    const nextTourStep = () => {
        if (currentTourStep < TOUR_STEPS.length - 1) {
            setCurrentTourStep(prev => prev + 1);
        } else {
            setIsTourOpen(false);
            setCurrentTourStep(0);
        }
    };

    const prevTourStep = () => {
        if (currentTourStep > 0) {
            setCurrentTourStep(prev => prev - 1);
        }
    };

    return (
        <>
            <Head title="ReserveIT - UIC Campus Facility Management" />

            <div className="relative min-h-screen bg-[#F5EEE7] text-slate-900 selection:bg-[#745363] selection:text-white flex flex-col justify-between">
                
                {/* Background Glow */}
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(122,74,87,0.12),transparent_45%),radial-gradient(circle_at_bottom_right,_rgba(122,74,87,0.08),transparent_35%)]" />

                <div>
                    {/* 1. STICKY FULL-WIDTH NAVIGATION BAR */}
                    <header className="sticky top-0 z-50 w-full border-b border-[#e9e5e2] bg-[#F5EEE7]/85 backdrop-blur-md transition-all">
                        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-10">
                            
                            {/* Logo */}
                            <Link href="/" className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#745363] text-white shadow-md">
                                    <Building2 className="h-5 w-5" />
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xl font-bold tracking-tight text-slate-900">ReserveIT</span>
                                </div>
                            </Link>

                            {/* Nav Links */}
                            <nav className="hidden items-center gap-8 text-sm font-medium text-slate-700 md:flex">
                                <Link href="#" className="text-[#745363] font-semibold transition">Home</Link>
                                <Link href={route('facilities.index')} className="transition hover:text-[#745363]">Facilities</Link>
                                <a href="#schedule" className="transition hover:text-[#745363]">Schedule</a>
                                <a href="#workflow" className="transition hover:text-[#745363]">Workflow</a>
                                <button 
                                    onClick={() => { setIsTourOpen(true); setCurrentTourStep(0); }}
                                    className="flex items-center gap-1.5 text-[#745363] font-semibold transition hover:opacity-80"
                                >
                                    <GuideIcon className="h-4 w-4" /> User Manual
                                </button>
                            </nav>

                            {/* Auth CTA Buttons */}
                            <div className="hidden items-center gap-3 md:flex">
                                {auth.user ? (
                                    <Link
                                        href={route('dashboard')}
                                        className="inline-flex items-center justify-center rounded-full bg-[#745363] px-6 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-[#5d4050]"
                                    >
                                        Go to Dashboard
                                    </Link>
                                ) : (
                                    <>
                                        <Link
                                            href={route('login')}
                                            className="px-4 py-2 text-sm font-semibold text-slate-700 transition hover:text-[#745363]"
                                        >
                                            Log in
                                        </Link>
                                        <Link
                                            href={route('register')}
                                            className="inline-flex items-center justify-center rounded-full bg-[#745363] px-5 py-2 text-sm font-semibold text-white shadow-md transition hover:bg-[#5d4050]"
                                        >
                                            Sign up
                                        </Link>
                                    </>
                                )}
                            </div>

                            {/* Mobile Toggle */}
                            <button
                                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                                className="p-2 text-slate-700 md:hidden hover:text-[#745363]"
                            >
                                {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                            </button>
                        </div>

                        {/* Mobile Drawer */}
                        {mobileMenuOpen && (
                            <div className="border-t border-[#e9e5e2] bg-[#f7f6f4] px-6 py-5 md:hidden space-y-4">
                                <div className="flex flex-col gap-3 text-sm font-medium text-slate-800">
                                    <Link href="#" className="text-[#745363] font-semibold">Home</Link>
                                    <Link href={route('facilities.index')}>Facilities</Link>
                                    <a href="#schedule" onClick={() => setMobileMenuOpen(false)}>Schedule</a>
                                    <a href="#workflow" onClick={() => setMobileMenuOpen(false)}>Workflow</a>
                                    <button 
                                        onClick={() => { setMobileMenuOpen(false); setIsTourOpen(true); }}
                                        className="text-left font-semibold text-[#745363]"
                                    >
                                        📖 System Manual & Guide
                                    </button>
                                </div>
                                <hr className="border-[#e9e5e2]" />
                                <div>
                                    {auth.user ? (
                                        <Link
                                            href={route('dashboard')}
                                            className="block w-full text-center rounded-xl bg-[#745363] py-2.5 text-sm font-semibold text-white"
                                        >
                                            Dashboard
                                        </Link>
                                    ) : (
                                        <div className="grid grid-cols-2 gap-2">
                                            <Link
                                                href={route('login')}
                                                className="block w-full text-center rounded-xl border border-[#D8C9C2] bg-white py-2.5 text-sm font-semibold text-slate-800"
                                            >
                                                Log in
                                            </Link>
                                            <Link
                                                href={route('register')}
                                                className="block w-full text-center rounded-xl bg-[#745363] py-2.5 text-sm font-semibold text-white"
                                            >
                                                Sign up
                                            </Link>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </header>

                    {/* 2. HERO SECTION */}
                    <div className="relative mx-auto max-w-7xl px-6 py-10 lg:px-10">
                        <div className="text-center max-w-3xl mx-auto space-y-5">
                            <div className="inline-flex items-center gap-2 rounded-full bg-[#745363]/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-[#745363]">
                                <Sparkles className="h-3.5 w-3.5" />
                                Official UIC-MAIN Reservation System
                            </div>

                            <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
                                Campus facilities, bookings, and approvals in one portal.
                            </h1>

                            <p className="text-base text-slate-700 sm:text-lg leading-relaxed">
                                Review spaces, submit reservation requests, and manage facility schedules seamlessly across UIC-MAIN campus departments.
                            </p>

                            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                                <Link
                                    href={route('facilities.index')}
                                    className="inline-flex items-center gap-2 rounded-full bg-[#745363] px-6 py-3 text-sm font-bold text-white shadow-md transition hover:bg-[#5d4050]"
                                >
                                    Explore Campus Venues
                                    <ArrowRight className="h-4 w-4" />
                                </Link>
                                <button
                                    onClick={() => { setIsTourOpen(true); setCurrentTourStep(0); }}
                                    className="inline-flex items-center gap-2 rounded-full border border-[#D8C9C2] bg-white px-6 py-3 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-[#f7f6f4]"
                                >
                                    <GuideIcon className="h-4 w-4 text-[#745363]" />
                                    Take 1-Min System Tour
                                </button>
                            </div>
                        </div>

                        {/* 3. DYNAMIC FACILITY CAROUSEL (DB or Fallback) */}
                        <section className="mt-14">
                            <div className="flex items-center justify-between mb-4 px-2">
                                <div>
                                    <h2 className="text-lg font-bold text-slate-900">Featured Campus Venues</h2>
                                    <p className="text-xs text-slate-600">
                                        {dbFacilities.length > 0 ? "Showing active database facilities." : "Select or hover over any space to review availability."}
                                    </p>
                                </div>
                                <Link 
                                    href={route('facilities.index')}
                                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#745363] hover:underline"
                                >
                                    Browse all spaces <ChevronRight className="h-3.5 w-3.5" />
                                </Link>
                            </div>

                            <div className="flex flex-col md:flex-row gap-4 h-[460px] w-full">
                                {activeFacilitiesList.map((facility) => {
                                    const facilityId = facility.id;
                                    const isActive = activeFacilityId === facilityId;

                                    return (
                                        <motion.div
                                            key={facilityId}
                                            onClick={() => setActiveFacilityId(facilityId)}
                                            onMouseEnter={() => setActiveFacilityId(facilityId)}
                                            layout
                                            transition={{ duration: 0.45, ease: 'easeOut' }}
                                            className={`relative cursor-pointer overflow-hidden rounded-3xl border border-[#e9e5e2] transition-all duration-500 ${
                                                isActive 
                                                    ? 'md:flex-[3.5] flex-1 shadow-2xl ring-2 ring-[#745363]' 
                                                    : 'md:flex-1 flex-none h-20 md:h-auto opacity-80 hover:opacity-100'
                                            }`}
                                        >
                                            

                                            <img
                                                src={
                                                    facility.image ||
                                                    facility.image_url ||
                                                    '/images/facility-placeholder.svg'
                                                }
                                                alt={facility.name || facility.title || 'Campus facility'}
                                                onError={(e) => {
                                                    e.currentTarget.onerror = null;
                                                    e.currentTarget.src = '/images/facility-placeholder.svg';
                                                }}
                                                className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 scale-105"
                                            />

                                            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent" />

                                            {!isActive && (
                                                <div className="absolute inset-0 flex items-end md:items-center justify-between md:justify-center p-4 md:p-0">
                                                    <div className="md:-rotate-90 md:whitespace-nowrap font-bold text-white text-sm md:text-base tracking-wide flex items-center gap-2">
                                                        <span className="rounded-full bg-[#745363] px-2 py-0.5 text-[10px] uppercase text-white">
                                                            {facility.badge || 'UIC'}
                                                        </span>
                                                        {facility.name || facility.title}
                                                    </div>
                                                </div>
                                            )}

                                            <AnimatePresence>
                                                {isActive && (
                                                    <motion.div
                                                        initial={{ opacity: 0, y: 10 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        exit={{ opacity: 0 }}
                                                        transition={{ duration: 0.3 }}
                                                        className="absolute inset-0 flex flex-col justify-between p-6 text-white"
                                                    >
                                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                                            <span className="rounded-full bg-[#745363] px-3 py-1 text-xs font-semibold tracking-wide text-white shadow-sm">
                                                                {facility.department || 'UIC Facility'}
                                                            </span>
                                                            <span className="rounded-full px-3 py-1 text-xs font-semibold backdrop-blur-md bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                                                                ● {facility.status || 'Active & Ready'}
                                                            </span>
                                                        </div>

                                                        <div className="space-y-3">
                                                            <h3 className="text-2xl font-bold tracking-tight text-white drop-shadow-md">
                                                                {facility.name || facility.title}
                                                            </h3>
                                                            <p className="text-xs text-slate-200 line-clamp-2 max-w-lg leading-relaxed">
                                                                {facility.description || 'Modern facility equipped with essential campus tools.'}
                                                            </p>

                                                            <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-slate-300 pt-1">
                                                                <div className="flex items-center gap-1.5 bg-black/30 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10">
                                                                    <Users className="h-3.5 w-3.5 text-[#e9e5e2]" />
                                                                    {facility.capacity || 'Standard Capacity'}
                                                                </div>
                                                                <div className="flex items-center gap-1.5 bg-black/30 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10">
                                                                    <MapPin className="h-3.5 w-3.5 text-[#e9e5e2]" />
                                                                    UIC Main Campus
                                                                </div>
                                                            </div>

                                                            <div className="pt-2">
                                                                <Link
                                                                    href={route('facilities.index')}
                                                                    className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-xs font-bold text-slate-900 transition hover:bg-[#F5EEE7]"
                                                                >
                                                                    View Calendar & Book
                                                                    <ArrowRight className="h-3.5 w-3.5" />
                                                                </Link>
                                                            </div>
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        </section>

                        {/* 4. REAL DATABASE TODAY'S SCHEDULE (Target #schedule) */}
                        <section id="schedule" className="mt-20 scroll-mt-24 rounded-[2rem] border border-[#e9e5e2] bg-white p-8 shadow-sm lg:p-10">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-100">
                                <div>
                                    <div className="inline-flex items-center gap-2 rounded-full bg-[#745363]/10 px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-[#745363]">
                                        <CalendarIcon className="h-3.5 w-3.5" /> Live Campus Schedule
                                    </div>
                                    <h2 className="text-2xl font-bold text-slate-900 mt-2">Today's Venue Reservations</h2>
                                </div>
                                <span className="text-xs font-semibold text-slate-500 bg-[#f7f6f4] px-3 py-1.5 rounded-full border border-[#e9e5e2]">
                                    Synced with Master Database
                                </span>
                            </div>

                            <div className="mt-6 space-y-3">
                                {dbSchedules.length > 0 ? (
                                    dbSchedules.map((item, i) => (
                                        <div key={item.id || i} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl border border-[#e9e5e2] bg-[#fbfaf9]">
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#745363] text-white text-xs font-bold">
                                                    {i + 1}
                                                </div>
                                                <div>
                                                    <p className="text-xs font-bold text-slate-500">{item.start_time} - {item.end_time}</p>
                                                    <h4 className="text-sm font-bold text-slate-900">{item.facility?.name || 'UIC Reserved Space'}</h4>
                                                    <p className="text-xs text-slate-600">Reserved by: {item.user?.name || item.guest_name || 'UIC Academic Member'}</p>
                                                </div>
                                            </div>
                                            <div>
                                                <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700 border border-rose-200">
                                                    <Lock className="h-3 w-3" /> Reserved
                                                </span>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-8 bg-[#fbfaf9] rounded-2xl border border-dashed border-[#e9e5e2]">
                                        <CalendarIcon className="h-8 w-8 mx-auto text-[#745363] opacity-40 mb-2" />
                                        <p className="text-sm font-bold text-slate-800">No Reservations Logged for Today</p>
                                        <p className="text-xs text-slate-500 mt-1">All spaces are currently open for requests.</p>
                                    </div>
                                )}
                            </div>
                        </section>

                        {/* 5. WORKFLOW SECTION (Target #workflow) */}
                        <section id="workflow" className="mt-16 scroll-mt-24 rounded-[2rem] border border-[#e9e5e2] bg-white/90 p-8 shadow-sm lg:p-10">
                            <div className="space-y-6">
                                <div className="inline-flex items-center gap-2 rounded-full bg-[#745363]/10 px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-[#745363]">
                                    Approval Pipeline
                                </div>
                                <h2 className="text-2xl font-bold text-slate-900">How ReserveIT Processes Your Request</h2>

                                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                                    {TOUR_STEPS.map((item) => {
                                        const IconComponent = item.icon;
                                        return (
                                            <div key={item.step} className="relative rounded-2xl border border-[#e9e5e2] bg-[#fbfaf9] p-5 transition hover:border-[#745363]/40">
                                                <span className="absolute top-4 right-4 text-xs font-extrabold text-[#745363]/30">
                                                    0{item.step}
                                                </span>
                                                <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#745363]/10 text-[#745363]">
                                                    <IconComponent className="h-5 w-5" />
                                                </div>
                                                <h3 className="text-sm font-bold text-slate-900">{item.title}</h3>
                                                <p className="mt-1.5 text-xs leading-relaxed text-slate-600">{item.description}</p>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </section>
                    </div>
                </div>

                {/* 6. INTERACTIVE GUIDED TOUR MODAL */}
                <AnimatePresence>
                    {isTourOpen && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-white p-6 md:p-8 shadow-2xl border border-[#e9e5e2]"
                            >
                                {/* Close Button */}
                                <button
                                    onClick={() => setIsTourOpen(false)}
                                    className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                                >
                                    <X className="h-5 w-5" />
                                </button>

                                {/* Step Progress Indicator */}
                                <div className="flex items-center gap-2 mb-6">
                                    {TOUR_STEPS.map((_, idx) => (
                                        <div
                                            key={idx}
                                            className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                                                idx === currentTourStep ? 'bg-[#745363]' : 'bg-[#e9e5e2]'
                                            }`}
                                        />
                                    ))}
                                </div>

                                {/* Step Content */}
                                <div className="space-y-4">
                                    <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#745363]/10 text-[#745363]">
                                        {React.createElement(TOUR_STEPS[currentTourStep].icon, { className: "h-6 w-6" })}
                                    </div>

                                    <div>
                                        <span className="text-xs font-bold uppercase tracking-wider text-[#745363]">
                                            Step {currentTourStep + 1} of {TOUR_STEPS.length}
                                        </span>
                                        <h3 className="text-xl font-bold text-slate-900 mt-1">
                                            {TOUR_STEPS[currentTourStep].title}
                                        </h3>
                                        <p className="text-xs font-medium text-slate-500">
                                            {TOUR_STEPS[currentTourStep].subtitle}
                                        </p>
                                    </div>

                                    <p className="text-xs leading-relaxed text-slate-600 bg-[#fbfaf9] p-4 rounded-xl border border-[#e9e5e2]">
                                        {TOUR_STEPS[currentTourStep].description}
                                    </p>

                                    <blockquote className="text-[11px] font-medium text-[#745363] bg-[#745363]/5 p-3 rounded-xl border-l-2 border-[#745363]">
                                        💡 <b>Pro Tip:</b> {TOUR_STEPS[currentTourStep].tip}
                                    </blockquote>
                                </div>

                                {/* Navigation Controls */}
                                <div className="mt-8 flex items-center justify-between pt-4 border-t border-slate-100">
                                    <button
                                        onClick={prevTourStep}
                                        disabled={currentTourStep === 0}
                                        className={`inline-flex items-center gap-1 text-xs font-semibold px-4 py-2 rounded-xl transition ${
                                            currentTourStep === 0
                                                ? 'opacity-30 cursor-not-allowed text-slate-400'
                                                : 'text-slate-700 hover:bg-slate-100'
                                        }`}
                                    >
                                        <ChevronLeft className="h-4 w-4" /> Previous
                                    </button>

                                    <button
                                        onClick={nextTourStep}
                                        className="inline-flex items-center gap-1 text-xs font-bold text-white bg-[#745363] px-5 py-2.5 rounded-xl transition hover:bg-[#5d4050] shadow-sm"
                                    >
                                        {currentTourStep === TOUR_STEPS.length - 1 ? 'Got It, Let\'s Start!' : 'Next Step'}
                                        <ChevronRight className="h-4 w-4" />
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>

                {/* 7. MULTI-COLUMN FOOTER */}
                <footer id="support" className="mt-20 border-t border-[#e9e5e2] bg-[#f7f6f4] pt-14 pb-8 text-slate-700">
                    <div className="mx-auto max-w-7xl px-6 lg:px-10">
                        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4 pb-12 border-b border-[#e9e5e2]">
                            
                            <div className="space-y-4">
                                <div className="flex items-center gap-2.5">
                                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#745363] text-white">
                                        <Building2 className="h-4 w-4" />
                                    </div>
                                    <span className="text-lg font-bold text-slate-900">ReserveIT</span>
                                </div>
                                <p className="text-xs leading-relaxed text-slate-600">
                                    The official facility reservation and scheduling management system for UIC-MAIN Campus.
                                </p>
                            </div>

                            <div className="space-y-3">
                                <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                                    <FileText className="h-4 w-4 text-[#745363]" /> Policy & Rules
                                </h4>
                                <ul className="space-y-2 text-xs text-slate-600">
                                    <li>• Minimum 48-hour prior request notice</li>
                                    <li>• Academic priority over non-academic events</li>
                                    <li>• Departmental wing allocation guidelines</li>
                                    <li>• Cancellation & rescheduling rules</li>
                                </ul>
                            </div>

                            <div className="space-y-3">
                                <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                                    <HelpCircle className="h-4 w-4 text-[#745363]" /> System Manual
                                </h4>
                                <ul className="space-y-2 text-xs text-slate-600">
                                    <li>
                                        <button onClick={() => { setIsTourOpen(true); setCurrentTourStep(0); }} className="hover:text-[#745363]">
                                            Open Interactive User Guide
                                        </button>
                                    </li>
                                    <li><Link href="#" className="hover:text-[#745363]">Facility Admin Directory</Link></li>
                                    <li><Link href="#" className="hover:text-[#745363]">Report Equipment Issue</Link></li>
                                </ul>
                            </div>

                            <div className="space-y-3">
                                <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                                    Contact MIS Office
                                </h4>
                                <div className="space-y-2.5 text-xs text-slate-600">
                                    <div className="flex items-start gap-2.5">
                                        <MapPin className="h-4 w-4 text-[#745363] shrink-0 mt-0.5" />
                                        <span>UIC Main Campus, MIS Office</span>
                                    </div>
                                    <div className="flex items-center gap-2.5">
                                        <Mail className="h-4 w-4 text-[#745363] shrink-0" />
                                        <span>mis.support@uic.edu.ph</span>
                                    </div>
                                </div>
                            </div>

                        </div>

                        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
                            <p>© 2026 ReserveIT – University of the Immaculate Conception. All rights reserved.</p>
                        </div>
                    </div>
                </footer>
            </div>
        </>
    );
}