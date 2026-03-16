'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import PreferenceForm from '@/components/PreferenceForm';
import { supabase } from '@/lib/supabaseClient';

export default function Home() {
    const [loading, setLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    useEffect(() => {
        const loadSession = async () => {
            const {
                data: { session },
            } = await supabase.auth.getSession();

            setIsAuthenticated(Boolean(session?.user));
            setLoading(false);
        };

        loadSession();
    }, []);

    if (loading) {
        return (
            <main className="min-h-screen bg-slate-50 text-slate-900">
                <div className="mx-auto flex min-h-screen max-w-4xl items-center justify-center px-6">
                    <p className="text-sm font-medium uppercase tracking-[0.3em] text-slate-500">
                        Loading Finvestor
                    </p>
                </div>
            </main>
        );
    }

    if (isAuthenticated) {
        return (
            <main className="min-h-screen bg-slate-50 px-6 py-12 text-slate-900">
                <div className="mx-auto max-w-3xl">
                    <div className="mb-10 rounded-3xl bg-slate-900 px-8 py-10 text-white shadow-xl">
                        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.25em] text-emerald-300">
                            Finvestor AI
                        </p>
                        <h1 className="text-4xl font-semibold tracking-tight">
                            Build a personalized investment plan in minutes.
                        </h1>
                        <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300">
                            Tell us about your goals, risk tolerance, and timeline. We&apos;ll generate
                            an AI-assisted portfolio recommendation and save it to your dashboard.
                        </p>
                    </div>

                    <div className="rounded-3xl bg-white p-8 shadow-lg ring-1 ring-slate-200">
                        <PreferenceForm />
                    </div>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-[linear-gradient(180deg,#eff6ff_0%,#f8fafc_45%,#ffffff_100%)] px-6 py-12 text-slate-900">
            <div className="mx-auto max-w-5xl">
                <div className="rounded-[2rem] border border-slate-200 bg-white/90 p-8 shadow-[0_25px_80px_-45px_rgba(15,23,42,0.45)] backdrop-blur md:p-12">
                    <p className="text-sm font-semibold uppercase tracking-[0.3em] text-emerald-600">
                        Finvestor AI
                    </p>
                    <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight text-slate-950 md:text-6xl">
                        AI-guided portfolio ideas built around your real financial goals.
                    </h1>
                    <p className="mt-6 max-w-2xl text-base leading-7 text-slate-600">
                        Sign in with a magic link, answer a few questions, and review tailored
                        investment recommendations with a searchable history in your dashboard.
                    </p>

                    <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                        <Link
                            href="/login"
                            className="inline-flex items-center justify-center rounded-full bg-slate-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                        >
                            Sign In to Start
                        </Link>
                        <Link
                            href="/dashboard/history"
                            className="inline-flex items-center justify-center rounded-full border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
                        >
                            View Dashboard
                        </Link>
                    </div>
                </div>
            </div>
        </main>
    );
}
