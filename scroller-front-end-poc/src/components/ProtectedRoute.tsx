'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [loading, router, user]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zelli-bg">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-b-2 border-zelli-primary"></div>
          <p className="mt-4 text-zelli-muted">Loading…</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zelli-bg">
        <div className="text-center">
          <p className="text-zelli-muted">Redirecting to login…</p>
          <button
            onClick={() => router.replace('/login')}
            className="mt-4 rounded-zelli-btn bg-zelli-primary px-4 py-2 font-bold text-white transition-colors hover:bg-zelli-primary-hover"
          >
            Click here if not redirected
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
