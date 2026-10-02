import { AuthProvider } from '@/contexts/AuthContext';
import type { ReactNode } from 'react';

export default function AwaitingApprovalLayout({ children }: { children: ReactNode }): ReactNode {
  return <AuthProvider>{children}</AuthProvider>;
}
