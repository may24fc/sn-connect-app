import type { ReactNode } from 'react';

export default function OnboardingSetupLayout({
  children,
}: {
  children: ReactNode;
}): ReactNode {
  return (
    <div className="min-h-screen w-full bg-background flex items-center justify-center p-4">
      {children}
    </div>
  );
}
