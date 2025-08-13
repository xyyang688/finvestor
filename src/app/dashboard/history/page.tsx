'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import DashboardLayout from '@/components/DashboardLayout';

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
                <div className="flex justify-center items-center h-64">
                    <div className="text-lg">Loading...</div>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="max-w-6xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Portfolio History</h1>
                    <p className="text-gray-600">
                        View all your past investment recommendations and track your financial planning journey
                    </p>
                </div>

                {portfolios.length > 0 ? (
                    <div className="space-y-6">
                        {portfolios.map((portfolio) => (
                            <div
                                key={portfolio.id}
                                className="bg-white shadow-lg rounded-lg border hover:shadow-xl transition-shadow"
                            >
                                <div className="p-6">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex-1">
                                            <div className="flex items-center space-x-4 mb-2">
                                                <h3 className="text-xl font-semibold text-gray-900">
                                                    Investment Recommendation
                                                </h3>
                                                <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                                                    {new Date(portfolio.created_at).toLocaleDateString()}
                                                </span>
                                            </div>
                                            
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                                <div>
                                                    <span className="text-gray-600">Age:</span>
                                                    <span className="ml-2 font-medium">{portfolio.age} years</span>
                                                </div>
                                                <div>
                                                    <span className="text-gray-600">Risk:</span>
                                                    <span className="ml-2 font-medium">{portfolio.risk_tolerance}</span>
                                                </div>
                                                <div>
                                                    <span className="text-gray-600">Goal:</span>
                                                    <span className="ml-2 font-medium">{portfolio.investment_goal}</span>
                                                </div>
                                                <div>
                                                    <span className="text-gray-600">Horizon:</span>
                                                    <span className="ml-2 font-medium">{portfolio.time_horizon} years</span>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <button
                                            onClick={() => toggleExpanded(portfolio.id)}
                                            className="ml-4 text-blue-600 hover:text-blue-800 text-sm font-medium"
                                        >
                                            {expandedPortfolio === portfolio.id ? 'Hide Details' : 'View Details'}
                                        </button>
                                    </div>

                                    {expandedPortfolio === portfolio.id && (
                                        <div className="mt-6 pt-6 border-t border-gray-200">
                                            <div className="bg-gray-50 p-4 rounded-lg">
                                                <h4 className="font-semibold text-gray-900 mb-3">AI Recommendation</h4>
                                                <div className="prose max-w-none">
                                                    <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                                                        {portfolio.ai_recommendation.recommendation}
                                                    </p>
                                                </div>
                                            </div>
                                            
                                            <div className="mt-4 flex justify-between items-center text-sm text-gray-500">
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
                    <div className="bg-white shadow-lg rounded-lg p-8 text-center">
                        <div className="max-w-md mx-auto">
                            <div className="text-gray-400 mb-4">
                                <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-medium text-gray-900 mb-2">No Portfolio History</h3>
                            <p className="text-gray-600 mb-6">
                                You haven't generated any investment recommendations yet. Start building your portfolio history today.
                            </p>
                            <button
                                onClick={() => window.location.href = '/'}
                                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
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