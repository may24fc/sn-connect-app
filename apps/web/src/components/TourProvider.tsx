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
  const failsafeTimerRef = useRef<number | null>(null);
  const currentGroup = getTourGroupForPath(pathname);

  /**
   * Forcefully remove all TourGuideJS overlay remnants from the DOM.
   * This prevents the "frozen UI" bug where orphaned overlays block interaction.
   */
  const forceCleanupTourDOM = useCallback(() => {
    // Exclude document.body from removal — TourGuideJS adds "tg-no-interaction" to
    // it, so the [class*="tg-"] selector would otherwise match the body element and
    // call body.remove(), causing document.body to become null on the next line.
    document.querySelectorAll('.tg-dialog, .tg-backdrop, .tg-overlay, [class*="tg-"]').forEach((el) => {
      if (el !== document.body) el.remove();
    });
    document.body?.classList.remove('tg-no-interaction');
    document.body?.style.removeProperty('pointer-events');
    document.body?.style.removeProperty('overflow');
    // Also reset any element-level pointer-events that the library may set
    document.querySelectorAll('[style*="pointer-events: none"]').forEach((el) => {
      if (el instanceof HTMLElement && el !== document.body) {
        el.style.removeProperty('pointer-events');
      }
    });
  }, []);

  // Clean up tour instance on unmount
  useEffect(() => {
    return () => {
      if (tourClientRef.current?.isVisible) {
        void tourClientRef.current.exit();
      }
      forceCleanupTourDOM();
      if (failsafeTimerRef.current) {
        clearTimeout(failsafeTimerRef.current);
        failsafeTimerRef.current = null;
      }
    };
  }, [forceCleanupTourDOM]);

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
    forceCleanupTourDOM();

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

    const onTourEnd = (): void => {
      setIsActive(false);
      forceCleanupTourDOM();
      tourClientRef.current = null;
      // Clear failsafe timer if it's still pending
      if (failsafeTimerRef.current) {
        clearTimeout(failsafeTimerRef.current);
        failsafeTimerRef.current = null;
      }
    };

    tg.onFinish(() => {
      markTourCompleted(currentGroup);
      onTourEnd();
    });

    tg.onAfterExit(() => {
      onTourEnd();
    });

    setIsActive(true);
    await tg.start(currentGroup);

    // Failsafe: if overlay/backdrop still present 3 seconds after tour
    // callbacks fire or if tour gets stuck, force-remove everything.
    // This catches edge cases like rapid clicking or browser back during tour.
    failsafeTimerRef.current = window.setTimeout(() => {
      if (!tourClientRef.current?.isVisible) {
        forceCleanupTourDOM();
        setIsActive(false);
      }
    }, 3000);
  }, [currentGroup, forceCleanupTourDOM]);

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

  // Force-exit tour on route change (prevents orphaned overlays when user
  // clicks a link or presses the browser back button during an active tour)
  useEffect(() => {
    if (!isActive) return;
    // pathname changed while tour was active → cleanup
    if (tourClientRef.current) {
      try {
        if (tourClientRef.current.isVisible) {
          void tourClientRef.current.exit();
        }
      } catch {
        // ignore
      }
      tourClientRef.current = null;
    }
    forceCleanupTourDOM();
    setIsActive(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

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
