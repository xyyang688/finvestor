import { Suspense } from 'react';
import AuthCallbackClient from '@/components/AuthCallbackClient';

export default function AuthCallbackPage() {
    return (
        <main className="min-h-screen bg-slate-50 px-6 py-12 text-slate-900">
            <div className="mx-auto flex min-h-[60vh] max-w-xl items-center justify-center">
                <Suspense
                    fallback={
                        <div className="w-full rounded-3xl bg-white p-8 text-center shadow-lg ring-1 ring-slate-200">
                            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-emerald-600">
                                Finvestor AI
                            </p>
                            <h1 className="mt-4 text-2xl font-semibold">Completing your sign-in</h1>
                            <p className="mt-3 text-sm leading-6 text-slate-600">Preparing secure login...</p>
                        </div>
                    }
                >
                    <AuthCallbackClient />
                </Suspense>
            </div>
        </main>
    );
}
