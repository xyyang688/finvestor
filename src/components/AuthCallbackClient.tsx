'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function AuthCallbackClient() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [message, setMessage] = useState('Signing you in...');

    useEffect(() => {
        const finishSignIn = async () => {
            const code = searchParams.get('code');

            if (!code) {
                setMessage('Missing login code. Please try the email link again.');
                return;
            }

            const { error } = await supabase.auth.exchangeCodeForSession(code);

            if (error) {
                setMessage('We could not complete sign-in. Please request a new login link.');
                return;
            }

            router.replace('/dashboard');
        };

        finishSignIn();
    }, [router, searchParams]);

    return (
        <div className="w-full rounded-3xl bg-white p-8 text-center shadow-lg ring-1 ring-slate-200">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-emerald-600">
                Finvestor AI
            </p>
            <h1 className="mt-4 text-2xl font-semibold">Completing your sign-in</h1>
            <p className="mt-3 text-sm leading-6 text-slate-600">{message}</p>
        </div>
    );
}
