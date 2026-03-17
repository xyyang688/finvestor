'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { demoUserEmail, isDemoModeEnabled } from '@/lib/demoMode';

interface DashboardLayoutProps {
    children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
    const router = useRouter();
    const pathname = usePathname();
    const [userEmail, setUserEmail] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchUser = async () => {
            const {
                data: { session },
            } = await supabase.auth.getSession();

            if (!session?.user) {
                if (isDemoModeEnabled) {
                    setUserEmail(demoUserEmail);
                    setLoading(false);
                    return;
                }

                router.push('/login');
                return;
            }

            setUserEmail(session.user.email ?? null);
            setLoading(false);
        };

        fetchUser();
    }, [router]);

    const handleLogout = async () => {
        if (isDemoModeEnabled) {
            router.push('/');
            return;
        }

        await supabase.auth.signOut();
        router.push('/login');
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[linear-gradient(180deg,#eff6ff_0%,#f8fafc_45%,#ffffff_100%)] px-6 py-12 text-slate-900">
                <div className="mx-auto max-w-6xl">
                    <div className="rounded-[2rem] border border-slate-200 bg-white/90 px-8 py-10 shadow-sm">
                        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-emerald-600">
                            Finvestor AI
                        </p>
                        <p className="mt-4 text-sm text-slate-600">Loading your dashboard...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[linear-gradient(180deg,#eff6ff_0%,#f8fafc_45%,#ffffff_100%)] text-slate-900">
            <nav className="border-b border-slate-200/80 bg-white/75 backdrop-blur">
                <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:gap-8">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-600">
                                Finvestor AI
                            </p>
                            <h1 className="mt-1 text-xl font-semibold tracking-tight text-slate-950">
                                Portfolio Workspace
                            </h1>
                        </div>

                        <div className="flex flex-wrap gap-2 rounded-full bg-slate-100 p-1.5">
                            <Link
                                href="/dashboard"
                                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                                    pathname === '/dashboard'
                                        ? 'bg-white text-slate-950 shadow-sm'
                                        : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                Latest Recommendation
                            </Link>
                            <Link
                                href="/dashboard/history"
                                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                                    pathname === '/dashboard/history'
                                        ? 'bg-white text-slate-950 shadow-sm'
                                        : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                Portfolio History
                            </Link>
                            <Link
                                href="/dashboard/allocation"
                                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                                    pathname === '/dashboard/allocation'
                                        ? 'bg-white text-slate-950 shadow-sm'
                                        : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                Allocation Studio
                            </Link>
                        </div>
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
                            <span className="block text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                                Active User
                            </span>
                            <span className="mt-1 block text-sm font-medium text-slate-900">{userEmail}</span>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="rounded-2xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-white"
                        >
                            Log out
                        </button>
                    </div>
                </div>
            </nav>

            <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                {children}
            </main>
        </div>
    );
} 
