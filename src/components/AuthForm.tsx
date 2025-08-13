'use client';

import {useState} from 'react';
import {supabase} from '@/lib/supabaseClient';
import {useRouter} from 'next/navigation';

export default function AuthForm(){
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    const handleLogin = async (e: React.FormEvent) => {
        // prevent reload for each submission
        e.preventDefault();
        setLoading(true);
        const {error} = await supabase.auth.signInWithOtp({
            email,
            options: {
                emailRedirectTo: 'http://localhost:3000/dashboard',
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
        <form onSubmit = {handleLogin} className = "max-w-md mx-auto mt-20 space-y-4">
            <h1 className="text-2xl font-semibold"> Sign In</h1>
            <input
                type = "email"
                placeholder = "Your email"
                value = {email}
                onChange = {(e) => setEmail(e.target.value)}
                className = "w-full p-2 border rounded"
                required
            />

            <button
                type = "submit"
                className="w-full bg-black text-white py-2 rounded disabled:opacity-50"
                disabled = {loading}
            >
                {loading ? 'Sending Link ...': 'Send Link'}
            </button>
            {message && <p className='text-sm text-center text-gray-600'>{message}</p>}
        </form>
    )
}
