import type { ReactNode } from 'react';

export default function AuthLayout({
  children,
}: {
  children: ReactNode;
}): ReactNode {
  return (
    <div className="h-screen flex items-center justify-center bg-background">
      {children}
    </div>
  );
}
