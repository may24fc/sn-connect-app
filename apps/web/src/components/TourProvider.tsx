'use client';

import {
  getTourGroupForPath,
  isTourCompleted,
  markTourCompleted,
  resetTour,
  tourStepsByGroup,
} from '@/lib/tour/tours';
import { usePathname } from 'next/navigation';
import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

// ──────────────────────────────────────────────────────────────
// Context
// ──────────────────────────────────────────────────────────────
interface TourContextValue {
  /** Start (or restart) the tour for the current page */
  startTour: () => void;
  /** Whether a tour is currently active */
  isActive: boolean;
  /** The tour group name for the current page (undefined = no tour) */
  currentGroup: string | undefined;
}

const TourContext = createContext<TourContextValue>({
  startTour: () => {},
  isActive: false,
  currentGroup: undefined,
});

export const useTour = (): TourContextValue => useContext(TourContext);

// ──────────────────────────────────────────────────────────────
// Provider
// ──────────────────────────────────────────────────────────────
interface TourProviderProps {
  children: ReactNode;
  /** Auto-start tour on first visit (default: true) */
  autoStart?: boolean;
}

export function TourProvider({ children, autoStart = true }: TourProviderProps): ReactNode {
  const pathname = usePathname();
  const [isActive, setIsActive] = useState(false);
  const tourClientRef = useRef<InstanceType<
    typeof import('@sjmc11/tourguidejs').TourGuideClient
  > | null>(null);
  const currentGroup = getTourGroupForPath(pathname);

  // Clean up tour instance on unmount
  useEffect(() => {
    return () => {
      if (tourClientRef.current?.isVisible) {
        void tourClientRef.current.exit();
      }
    };
  }, []);

  const startTour = useCallback(async () => {
    if (!currentGroup) return;
    const allSteps = tourStepsByGroup[currentGroup];
    if (!allSteps || allSteps.length === 0) return;

    // Deep-clone steps to avoid TourGuideJS mutating the originals
    // (the library replaces string selectors with HTMLElement references).
    // Then filter out steps whose target elements don't exist in the DOM.
    const steps = allSteps
      .map((step) => ({ ...step }))
      .filter((step) => {
        if (!step.target) return true;
        const selector = typeof step.target === 'string' ? step.target : null;
        if (!selector) return true;
        return document.querySelector(selector) !== null;
      });

    if (steps.length === 0) return;

    // Dynamically import to keep bundle small
    const { TourGuideClient } = await import('@sjmc11/tourguidejs');
    // Import styles
    // @ts-ignore - CSS module import without type declarations
    await import('@sjmc11/tourguidejs/dist/css/tour.min.css');

    // Exit previous tour if active and clean up
    if (tourClientRef.current) {
      try {
        if (tourClientRef.current.isVisible) {
          await tourClientRef.current.exit();
        }
      } catch {
        // ignore exit errors from stale instances
      }
      tourClientRef.current = null;
    }

    // Remove any stale TourGuideJS DOM elements from previous instances
    document.querySelectorAll('.tg-dialog, .tg-backdrop').forEach((el) => el.remove());
    document.body.classList.remove('tg-no-interaction');

    const tg = new TourGuideClient({
      backdropColor: 'rgba(0, 0, 0, 0.5)',
      backdropAnimate: true,
      dialogAnimate: true,
      targetPadding: 8,
      nextLabel: 'Next',
      prevLabel: 'Back',
      finishLabel: 'Done',
      completeOnFinish: false,
      exitOnEscape: true,
      exitOnClickOutside: true,
      showStepDots: true,
      showStepProgress: true,
      closeButton: true,
      keyboardControls: true,
      steps,
    });

    tourClientRef.current = tg;

    tg.onFinish(() => {
      markTourCompleted(currentGroup);
      setIsActive(false);
    });

    tg.onAfterExit(() => {
      setIsActive(false);
    });

    setIsActive(true);
    await tg.start(currentGroup);
  }, [currentGroup]);

  // Auto-start on first visit
  useEffect(() => {
    if (!autoStart || !currentGroup) return;
    if (isTourCompleted(currentGroup)) return;

    // Larger delay to let the page fully render targets (including async data)
    const timer = setTimeout(() => {
      void startTour();
    }, 1500);

    return () => clearTimeout(timer);
    // Only re-run when the page changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, autoStart]);

  const handleStartTour = useCallback(() => {
    if (currentGroup) {
      resetTour(currentGroup);
    }
    void startTour();
  }, [currentGroup, startTour]);

  return (
    <TourContext.Provider
      value={{
        startTour: handleStartTour,
        isActive,
        currentGroup,
      }}
    >
      {children}
    </TourContext.Provider>
  );
}
