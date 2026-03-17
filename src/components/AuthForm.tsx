'use client';

import {useState} from 'react';
import {supabase} from '@/lib/supabaseClient';

export default function AuthForm(){
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const siteUrl =
        typeof window !== 'undefined'
            ? window.location.origin
            : process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3100';

    const handleLogin = async (e: React.FormEvent) => {
        // prevent reload for each submission
        e.preventDefault();
        setLoading(true);
        const {error} = await supabase.auth.signInWithOtp({
            email,
            options: {
                emailRedirectTo: `${siteUrl}/auth/callback`,
            }
        });

        // handle error
        if (error){
            setMessage(error.message);
        }
        else{
            setMessage('Check your email for the login link!');
        }

        setLoading(false);
    }

    return (
        <form
            onSubmit={handleLogin}
            className="rounded-[2rem] border border-slate-200 bg-white/95 p-8 shadow-[0_25px_80px_-45px_rgba(15,23,42,0.45)] backdrop-blur"
        >
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-emerald-600">
                Secure Login
            </p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950">
                Sign in with a magic link
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
                We&apos;ll email you a one-time login link so you can access your dashboard without a password.
            </p>

            <div className="mt-8 space-y-4">
                <label className="block text-sm font-medium text-slate-700">
                    Email address
                </label>
                <input
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100"
                    required
                />

                <button
                    type="submit"
                    className="w-full rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={loading}
                >
                    {loading ? 'Sending link...' : 'Email me the login link'}
                </button>
            </div>

            {message && (
                <p className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                    {message}
                </p>
            )}
        </form>
    )
}
