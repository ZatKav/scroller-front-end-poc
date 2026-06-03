import type { ReactNode } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import { verifyToken } from '@/lib/auth';

interface ProtectedLayoutProps {
  children: ReactNode;
}

export default async function ProtectedLayout({ children }: ProtectedLayoutProps) {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth-token')?.value;

  if (!token || !verifyToken(token)) {
    // Use a base-path-relative route here: Next's server `redirect` re-applies
    // NEXT_PUBLIC_BASE_PATH itself, so passing `appPath('/login')` would yield a
    // duplicated `/scroller/scroller/login`. `appPath` stays for browser fetches
    // and absolute browser navigations, which do NOT get the base path applied.
    redirect('/login');
  }

  return <ProtectedRoute>{children}</ProtectedRoute>;
}
