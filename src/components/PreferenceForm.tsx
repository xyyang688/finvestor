'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function PreferenceForm(){
    const router = useRouter();
    const [form, setForm] = useState({
        age: '',
        risk: 'Moderate',
        goal: '',
        time: ''
    })

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setForm({ ...form, [e.target.name]: e.target.value});
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        const {
            data: {session},
        } = await supabase.auth.getSession();

        if (!session){
            setError('No active session');
            setLoading(false);
            return;
        }

        const res = await fetch('/api/portfolios', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
                age: parseInt(form.age),
                risk_tolerance: form.risk,
                investment_goal: form.goal,
                time_horizon: parseFloat(form.time),
                ai_recommendation: {},
            })
        })

        const result = await res.json();

        if (res.ok){
            router.push('/dashboard');
        }
        else{
            setError(result.error || 'Submission Failed');
        }

        setLoading(false);
    }

    return (
        <form onSubmit={handleSubmit} className="max-w-xl mx-auto mt-10 space-y-4">
            <h2 className="text-xl font-semibold">Your Investment Preference</h2>
            
            <input
                type="number"
                name="age"
                placeholder="Your age"
                value={form.age}
                onChange={handleChange}
                required
                className="w-full border p-2 rounded"
            />

            <select name="risk" value={form.risk} onChange={handleChange} className="w-full border p-2 rounded">
                <option value="Very Conservative">Very Conservative</option>
                <option value="Conservative">Conservative</option>
                <option value="Moderately Conservative">Moderately Conservative</option>
                <option value="Moderate">Moderate</option>
                <option value="Moderately Aggressive">Moderately Aggressive</option>
                <option value="Aggressive">Aggressive</option>
                <option value="Very Aggressive">Very Aggressive</option>
            </select>

            <input
                type="text"
                name="goal"
                placeholder="Investment goal (e.g. pay off student loans, beat inflation after taxes)"
                value={form.goal}
                onChange={handleChange}
                required
                className="w-full border p-2 rounded"
            />

            <input
                type="number"
                name="time"
                placeholder="Time horizon (years)"
                value={form.time}
                onChange={handleChange}
                required
                className="w-full border p-2 rounded"
            />

            <button
                type="submit"
                disabled={loading}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
            >
                {loading ? 'Submitting...' : 'Submit'}
            </button>

            {error && <p className="text-red-500 text-sm">{error}</p>}

        </form>
    )
}