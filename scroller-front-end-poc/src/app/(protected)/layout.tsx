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
    redirect('/login');
  }

  return <ProtectedRoute>{children}</ProtectedRoute>;
}
