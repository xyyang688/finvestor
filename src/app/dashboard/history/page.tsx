'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import DashboardLayout from '@/components/DashboardLayout';
import { demoPortfolioHistory, isDemoModeEnabled, loadDemoPortfolios } from '@/lib/demoMode';

interface Portfolio {
    id: string;
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

export default function PortfolioHistory() {
    const [loading, setLoading] = useState(true);
    const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
    const [expandedPortfolio, setExpandedPortfolio] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            const {
                data: { session },
            } = await supabase.auth.getSession();

            if (!session?.user) {
                if (isDemoModeEnabled) {
                    const res = await fetch('/api/portfolios', { cache: 'no-store' });

                    if (res.ok) {
                        const demoPortfolios = await res.json();
                        setPortfolios(demoPortfolios.length > 0 ? demoPortfolios : loadDemoPortfolios() || demoPortfolioHistory);
                    } else {
                        setPortfolios(loadDemoPortfolios() || demoPortfolioHistory);
                    }

                    setLoading(false);
                }
                return;
            }

            // retrieve all user portfolios
            const { data, error } = await supabase
                .from('portfolios')
                .select('*')
                .eq('user_id', session.user.id)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error retrieving portfolios: ', error.message);
            } else {
                setPortfolios(data || []);
            }

            setLoading(false);
        };

        fetchData();
    }, []);

    const toggleExpanded = (portfolioId: string) => {
        setExpandedPortfolio(expandedPortfolio === portfolioId ? null : portfolioId);
    };

    if (loading) {
        return (
            <DashboardLayout>
                <div className="flex h-64 items-center justify-center rounded-[2rem] border border-slate-200 bg-white/90 shadow-sm">
                    <div className="text-lg font-medium text-slate-600">Loading your recommendation history...</div>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="max-w-6xl mx-auto">
                <div className="mb-8 rounded-[2rem] border border-slate-200 bg-white/90 px-8 py-8 shadow-sm">
                    <p className="text-sm font-semibold uppercase tracking-[0.25em] text-emerald-600">
                        Archived Insights
                    </p>
                    <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">Portfolio History</h1>
                    <p className="mt-3 text-sm leading-6 text-slate-600">
                        View all your past investment recommendations and track your financial planning journey
                    </p>
                </div>

                {portfolios.length > 0 ? (
                    <div className="space-y-6">
                        {portfolios.map((portfolio) => (
                            <div
                                key={portfolio.id}
                                className="rounded-[2rem] border border-slate-200 bg-white/95 shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl"
                            >
                                <div className="p-6">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex-1">
                                            <div className="flex items-center space-x-4 mb-2">
                                                <h3 className="text-xl font-semibold text-slate-950">
                                                    Investment Recommendation
                                                </h3>
                                                <span className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-500">
                                                    {new Date(portfolio.created_at).toLocaleDateString()}
                                                </span>
                                            </div>
                                            
                                            <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
                                                <div>
                                                    <span className="text-slate-500">Age:</span>
                                                    <span className="ml-2 font-medium">{portfolio.age} years</span>
                                                </div>
                                                <div>
                                                    <span className="text-slate-500">Risk:</span>
                                                    <span className="ml-2 font-medium">{portfolio.risk_tolerance}</span>
                                                </div>
                                                <div>
                                                    <span className="text-slate-500">Goal:</span>
                                                    <span className="ml-2 font-medium">{portfolio.investment_goal}</span>
                                                </div>
                                                <div>
                                                    <span className="text-slate-500">Horizon:</span>
                                                    <span className="ml-2 font-medium">{portfolio.time_horizon} years</span>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <button
                                            onClick={() => toggleExpanded(portfolio.id)}
                                            className="ml-4 rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                                        >
                                            {expandedPortfolio === portfolio.id ? 'Hide Details' : 'View Details'}
                                        </button>
                                    </div>

                                    {expandedPortfolio === portfolio.id && (
                                        <div className="mt-6 border-t border-slate-200 pt-6">
                                            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                                                <h4 className="mb-3 font-semibold text-slate-950">AI Recommendation</h4>
                                                <div className="prose max-w-none">
                                                    <p className="whitespace-pre-line leading-relaxed text-slate-700">
                                                        {portfolio.ai_recommendation.recommendation}
                                                    </p>
                                                </div>
                                            </div>
                                            
                                            <div className="mt-4 flex items-center justify-between text-sm text-slate-500">
                                                <span>
                                                    Generated: {new Date(portfolio.ai_recommendation.generated_at).toLocaleString()}
                                                </span>
                                                <span>
                                                    Created: {new Date(portfolio.created_at).toLocaleString()}
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="rounded-[2rem] border border-slate-200 bg-white/95 p-8 text-center shadow-lg">
                        <div className="max-w-md mx-auto">
                            <div className="mb-4 text-slate-400">
                                <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                </svg>
                            </div>
                            <h3 className="mb-2 text-lg font-medium text-slate-950">No Portfolio History</h3>
                            <p className="mb-6 text-slate-600">
                                You haven&apos;t generated any investment recommendations yet. Start building your portfolio history today.
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
