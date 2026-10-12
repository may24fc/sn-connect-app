'use client';

import { useState, type ReactNode } from 'react';

export function FinanceDetailDisclosure({
  title,
  children,
  description,
}: { title: string; children: ReactNode; description?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <details
      className="rounded-xl border bg-card p-5"
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary className="cursor-pointer text-sm font-semibold text-[#16505f]">{title}</summary>
      {open ? (
        <>
          {description ? <p className="mt-2 text-xs text-muted-foreground">{description}</p> : null}
          {children}
        </>
      ) : null}
    </details>
  );
}
