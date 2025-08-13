'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import DashboardLayout from '@/components/DashboardLayout';

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
                <div className="flex justify-center items-center h-64">
                    <div className="text-lg">Loading...</div>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="max-w-4xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Latest Investment Recommendation</h1>
                    <p className="text-gray-600">Your most recent AI-generated investment portfolio advice</p>
                </div>

                {portfolio ? (
                    <div className="bg-white shadow-lg rounded-lg p-8 space-y-6 border">
                        <div className="flex justify-between items-start">
                            <h2 className="text-2xl font-semibold text-gray-900">AI Investment Recommendation</h2>
                            <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                                {new Date(portfolio.created_at).toLocaleDateString()}
                            </span>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <div className="bg-blue-50 p-4 rounded-lg">
                                    <h3 className="font-semibold text-blue-900 mb-2">Your Profile</h3>
                                    <div className="space-y-2 text-sm">
                                        <p><strong>Age:</strong> {portfolio.age} years</p>
                                        <p><strong>Risk Tolerance:</strong> {portfolio.risk_tolerance}</p>
                                        <p><strong>Investment Goal:</strong> {portfolio.investment_goal}</p>
                                        <p><strong>Time Horizon:</strong> {portfolio.time_horizon} years</p>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="space-y-4">
                                <div className="bg-green-50 p-4 rounded-lg">
                                    <h3 className="font-semibold text-green-900 mb-2">AI Analysis</h3>
                                    <p className="text-sm text-green-800">
                                        Generated on: {new Date(portfolio.ai_recommendation.generated_at).toLocaleString()}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-gray-50 p-6 rounded-lg">
                            <h3 className="font-semibold text-gray-900 mb-4">Investment Recommendation</h3>
                            <div className="prose max-w-none">
                                <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                                    {portfolio.ai_recommendation.recommendation}
                                </p>
                            </div>
                        </div>

                        <div className="flex justify-between items-center pt-4 border-t">
                            <p className="text-sm text-gray-500">
                                Last updated: {new Date(portfolio.created_at).toLocaleString()}
                            </p>
                            <button
                                onClick={() => window.location.href = '/'}
                                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                Get New Recommendation
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="bg-white shadow-lg rounded-lg p-8 text-center">
                        <div className="max-w-md mx-auto">
                            <div className="text-gray-400 mb-4">
                                <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-medium text-gray-900 mb-2">No Recommendations Yet</h3>
                            <p className="text-gray-600 mb-6">
                                Get your first AI-powered investment recommendation to start your financial planning journey.
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