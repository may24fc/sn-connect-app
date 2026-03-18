'use client';

import { HelpCircle } from 'lucide-react';

interface HelpLinkProps {
  href: string;
  label?: string;
  /** Render function for internal links (pass Next.js Link). Falls back to <a>. */
  LinkComponent?: React.ComponentType<{ href: string; className?: string; children: React.ReactNode }>;
}

export function HelpLink({ href, label = 'Help & FAQ', LinkComponent }: HelpLinkProps) {
  const className = 'inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors';
  const children = (
    <>
      <HelpCircle className="h-4 w-4" />
      {label}
    </>
  );

  if (LinkComponent) {
    return (
      <LinkComponent href={href} className={className}>
        {children}
      </LinkComponent>
    );
  }

  return (
    <a href={href} className={className}>
      {children}
    </a>
  );
}
