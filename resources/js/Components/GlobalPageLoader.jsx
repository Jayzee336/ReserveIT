import { router } from '@inertiajs/react';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export default function GlobalPageLoader() {
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const start = () => setLoading(true);
        const finish = () => setLoading(false);

        router.on('start', start);
        router.on('finish', finish);

        return () => {
            router.off('start', start);
            router.off('finish', finish);
        };
    }, []);

    return (
        <AnimatePresence>
            {loading && (
                <motion.div
                    key="global-page-loader"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="fixed inset-0 z-[9999] flex items-center justify-center bg-white/40 backdrop-blur-sm"
                    aria-live="polite"
                    aria-busy="true"
                >
                    <div className="flex flex-col items-center gap-3 rounded-2xl bg-white/80 px-6 py-5 shadow-xl ring-1 ring-black/5">
                        <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-[#C65B8A]/20 border-t-[#C65B8A]" />
                        <p className="text-xs font-medium text-slate-500">Loading…</p>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}