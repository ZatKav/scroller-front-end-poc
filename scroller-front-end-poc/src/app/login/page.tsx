'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { usePreferences } from '@/contexts/PreferencesContext';
import ZelliWordmark from '@/components/ZelliWordmark';

export default function LoginPage() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login, user, loading: authLoading } = useAuth();
    const { onboardingComplete } = usePreferences();
    const router = useRouter();

    // New sign-ins go through onboarding to build their search filters; once
    // that's done (persisted in the preferences store) we send them straight to
    // their feed instead.
    const postLoginRoute = onboardingComplete ? '/listings' : '/onboarding';

    useEffect(() => {
        if (user) {
            router.replace(postLoginRoute);
        }
    }, [user, router, postLoginRoute]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const success = await login(username, password);
            if (success) {
                router.replace(postLoginRoute);
            } else {
                setError('Invalid username or password');
            }
        } catch (err) {
            setError('An error occurred during login');
        } finally {
            setLoading(false);
        }
    };

    if (authLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-zelli-bg">
                <div className="text-center">
                    <div className="mx-auto h-10 w-10 animate-spin rounded-full border-b-2 border-zelli-primary"></div>
                    <p className="mt-4 text-zelli-muted">Checking session…</p>
                </div>
            </div>
        );
    }

    const inputClasses =
        'mt-2 h-[52px] w-full rounded-zelli-input border border-zelli-border bg-zelli-surface px-4 text-[15px] text-zelli-ink placeholder:text-zelli-placeholder focus:border-zelli-primary focus:outline-none focus:ring-2 focus:ring-zelli-primary/30';

    return (
        <div className="flex min-h-screen justify-center bg-zelli-bg px-6 py-12">
            <div className="flex w-full max-w-[393px] flex-col">
                <ZelliWordmark />

                <div className="mt-20">
                    <h1 className="text-3xl font-bold leading-tight text-zelli-ink">
                        Welcome back
                    </h1>
                    <p className="mt-4 text-base text-zelli-ink">
                        Sign in to continue finding homes that fit.
                    </p>
                </div>

                <form className="mt-10 space-y-5" onSubmit={handleSubmit}>
                    <div>
                        <label
                            htmlFor="username"
                            className="block text-[13px] font-bold text-zelli-ink"
                        >
                            Username
                        </label>
                        <input
                            id="username"
                            name="username"
                            type="text"
                            required
                            autoComplete="username"
                            className={inputClasses}
                            placeholder="you@example.com"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                        />
                    </div>

                    <div>
                        <label
                            htmlFor="password"
                            className="block text-[13px] font-bold text-zelli-ink"
                        >
                            Password
                        </label>
                        <input
                            id="password"
                            name="password"
                            type="password"
                            required
                            autoComplete="current-password"
                            className={inputClasses}
                            placeholder="Your password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>

                    {error && (
                        <div
                            role="alert"
                            className="rounded-zelli-input bg-zelli-primary-soft px-4 py-3 text-sm text-zelli-primary"
                        >
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="h-[52px] w-full rounded-zelli-btn bg-zelli-primary text-base font-bold text-white transition-colors hover:bg-zelli-primary-hover focus:outline-none focus:ring-2 focus:ring-zelli-primary focus:ring-offset-2 focus:ring-offset-zelli-bg disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {loading ? 'Signing in…' : 'Sign in'}
                    </button>
                </form>

                <p className="mt-auto pt-12 text-[11px] leading-4 text-zelli-muted/60">
                    By continuing, you agree to Zelli&rsquo;s Terms and Privacy Policy.
                </p>
            </div>
        </div>
    );
}
