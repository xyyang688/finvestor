'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import DashboardLayout from '@/components/DashboardLayout';
import { demoPortfolio, isDemoModeEnabled, loadDemoPortfolios, saveDemoPortfolio } from '@/lib/demoMode';

interface Portfolio{
    age: number;
    risk_tolerance: string;
    investment_goal: string;
    time_horizon: number;
    ai_recommendation: {
        recommendation: string;
        generated_at: string;
    };
    created_at: string;
}

export default function Dashboard() {
    const [loading, setLoading] = useState(true);
    const [portfolio, setPortfolio] = useState<Portfolio | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            const {
                data: {session},
            } = await supabase.auth.getSession();

            // not logged in
            if (!session?.user){
                if (isDemoModeEnabled) {
                    const res = await fetch('/api/portfolios', { cache: 'no-store' });

                    if (res.ok) {
                        const demoPortfolios = await res.json();
                        const latestPortfolio = demoPortfolios[0];

                        if (latestPortfolio) {
                            saveDemoPortfolio(latestPortfolio);
                            setPortfolio(latestPortfolio);
                        } else {
                            const [cachedPortfolio] = loadDemoPortfolios();
                            setPortfolio(cachedPortfolio ?? demoPortfolio);
                        }
                    } else {
                        const [cachedPortfolio] = loadDemoPortfolios();
                        setPortfolio(cachedPortfolio ?? demoPortfolio);
                    }

                    setLoading(false);
                }
                return;
            }

            // retrieve user's latest portfolio
            const {data, error} = await supabase
                .from('portfolios')
                .select('*')
                .eq('user_id', session.user.id)
                .order('created_at', {ascending: false})
                .limit(1)
                .single();
            
            if (error){
                console.error('Error retrieving portfolio: ', error.message);
            }
            else{
                setPortfolio(data);
            }

            setLoading(false);
        }

        fetchData();
    }, []);

    if (loading) {
        return (
            <DashboardLayout>
                <div className="flex h-64 items-center justify-center rounded-[2rem] border border-slate-200 bg-white/90 shadow-sm">
                    <div className="text-lg font-medium text-slate-600">Loading your latest recommendation...</div>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="max-w-4xl mx-auto">
                <div className="mb-8 rounded-[2rem] border border-slate-200 bg-white/90 px-8 py-8 shadow-sm">
                    <p className="text-sm font-semibold uppercase tracking-[0.25em] text-emerald-600">
                        Recommendation Overview
                    </p>
                    <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
                        Latest Investment Recommendation
                    </h1>
                    <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                        Your most recent AI-generated portfolio advice, including the underlying profile and timestamp.
                    </p>
                </div>

                {portfolio ? (
                    <div className="space-y-6 rounded-[2rem] border border-slate-200 bg-white/95 p-8 shadow-lg">
                        <div className="flex justify-between items-start">
                            <h2 className="text-2xl font-semibold text-slate-950">AI Investment Recommendation</h2>
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-500">
                                {new Date(portfolio.created_at).toLocaleDateString()}
                            </span>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                                    <h3 className="mb-3 font-semibold text-slate-950">Your Profile</h3>
                                    <div className="space-y-2 text-sm">
                                        <p><strong>Age:</strong> {portfolio.age} years</p>
                                        <p><strong>Risk Tolerance:</strong> {portfolio.risk_tolerance}</p>
                                        <p><strong>Investment Goal:</strong> {portfolio.investment_goal}</p>
                                        <p><strong>Time Horizon:</strong> {portfolio.time_horizon} years</p>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="space-y-4">
                                <div className="rounded-3xl border border-emerald-100 bg-emerald-50 p-5">
                                    <h3 className="mb-3 font-semibold text-emerald-900">AI Analysis</h3>
                                    <p className="text-sm text-emerald-800">
                                        Generated on: {new Date(portfolio.ai_recommendation.generated_at).toLocaleString()}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
                            <h3 className="mb-4 font-semibold text-slate-950">Investment Recommendation</h3>
                            <div className="prose max-w-none">
                                <p className="whitespace-pre-line leading-relaxed text-slate-700">
                                    {portfolio.ai_recommendation.recommendation}
                                </p>
                            </div>
                        </div>

                        <div className="flex justify-between items-center border-t border-slate-200 pt-4">
                            <p className="text-sm text-slate-500">
                                Last updated: {new Date(portfolio.created_at).toLocaleString()}
                            </p>
                            <button
                                onClick={() => window.location.href = '/'}
                                className="rounded-2xl bg-slate-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                            >
                                Get New Recommendation
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="rounded-[2rem] border border-slate-200 bg-white/95 p-8 text-center shadow-lg">
                        <div className="max-w-md mx-auto">
                            <div className="mb-4 text-slate-400">
                                <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </div>
                            <h3 className="mb-2 text-lg font-medium text-slate-950">No Recommendations Yet</h3>
                            <p className="mb-6 text-slate-600">
                                Get your first AI-powered investment recommendation to start your financial planning journey.
                            </p>
                            <button
                                onClick={() => window.location.href = '/'}
                                className="rounded-2xl bg-slate-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                            >
                                Get Your First Recommendation
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
