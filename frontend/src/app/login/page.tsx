'use client';
import { useState } from 'react';
import { AuthAPI } from '@/lib/api';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = isRegister
        ? await AuthAPI.register(email, password, name)
        : await AuthAPI.login(email, password);

      const data = res.data;
      localStorage.setItem('vide_token', data.token);
      localStorage.setItem('vide_user', JSON.stringify(data.user));
      router.push('/');
    } catch {
      setError('Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-8">
      <div className="w-full max-w-md bg-neutral-950 border border-neutral-800 rounded-2xl p-8 shadow-2xl">
        <h1 className="text-3xl font-black bg-gradient-to-r from-purple-400 via-pink-500 to-orange-400 bg-clip-text text-transparent mb-2">
          VIDE
        </h1>
        <p className="text-neutral-500 mb-8">{isRegister ? 'Create an account' : 'Sign in to continue'}</p>

        {error && (
          <div className="bg-red-900/30 border border-red-800 text-red-300 px-4 py-3 rounded-xl mb-6 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {isRegister && (
            <input
              type="text"
              placeholder="Full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-white outline-none focus:border-purple-500 transition-colors"
              required
            />
          )}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-white outline-none focus:border-purple-500 transition-colors"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-white outline-none focus:border-purple-500 transition-colors"
            required
            minLength={6}
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 py-3 rounded-xl font-bold tracking-wide transition-all active:scale-[0.98]"
          >
            {loading ? 'Processing...' : isRegister ? 'Create Account' : 'Sign In'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => { setIsRegister(!isRegister); setError(''); }}
            className="text-sm text-neutral-500 hover:text-neutral-300 transition-colors"
          >
            {isRegister ? 'Already have an account? Sign in' : "Don't have an account? Register"}
          </button>
        </div>
      </div>
    </div>
  );
}
