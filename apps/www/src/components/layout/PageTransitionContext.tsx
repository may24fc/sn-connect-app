'use client';

import { createContext, useContext } from 'react';

type PageTransitionContextType = {
  navigate: (href: string) => void;
};

export const PageTransitionContext = createContext<PageTransitionContextType>({
  navigate: (href) => {
    window.location.href = href;
  },
});

export const usePageTransitionNav = () => useContext(PageTransitionContext);
