'use client';

import * as React from 'react';

type AnchorProps = React.AnchorHTMLAttributes<HTMLAnchorElement>;

/**
 * Anything that renders an anchor and accepts `href` — e.g. Next.js `Link`.
 * Must forward refs so it can sit under Radix `asChild` slots. Typed loosely
 * because router link prop types don't line up under `exactOptionalPropertyTypes`.
 */
export type LinkComponentType = React.ElementType;

const LinkComponentContext = React.createContext<LinkComponentType | null>(null);

export interface LinkProviderProps {
  /** Router-aware link used for internal hrefs (pass `next/link`'s default export). */
  component: LinkComponentType;
  children: React.ReactNode;
}

/**
 * Lets the host app inject its router-aware link so `@hr-portal/ui` components
 * navigate client-side (keeping the layout mounted) without depending on Next.js.
 */
export function LinkProvider({ component, children }: LinkProviderProps): React.ReactNode {
  return (
    <LinkComponentContext.Provider value={component}>{children}</LinkComponentContext.Provider>
  );
}

export interface AppLinkProps extends AnchorProps {
  href: string;
}

function isInternalHref(href: string): boolean {
  return href.startsWith('/') && !href.startsWith('//');
}

/**
 * Anchor that uses the injected router link for internal paths, and a plain
 * `<a>` for external URLs or when no `LinkProvider` is mounted.
 */
export const AppLink = React.forwardRef<HTMLAnchorElement, AppLinkProps>(
  ({ href, target, ...props }, ref) => {
    const LinkComponent = React.useContext(LinkComponentContext);

    if (LinkComponent && isInternalHref(href) && (!target || target === '_self')) {
      return <LinkComponent ref={ref} href={href} target={target} {...props} />;
    }

    return <a ref={ref} href={href} target={target} {...props} />;
  }
);
AppLink.displayName = 'AppLink';
