'use client';

import { TourModal } from './TourModal';
import {
  getTourGroupForPath,
  isTourAutoStartDisabled,
  isTourCompleted,
  markTourCompleted,
  tourStepsByGroup,
} from '@/lib/tour/tours';
import { usePathname } from 'next/navigation';
import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
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
  /** Auto-start tour on first visit (default: false) */
  autoStart?: boolean;
}

export function TourProvider({ children, autoStart = false }: TourProviderProps): ReactNode {
  const pathname = usePathname();
  const [isActive, setIsActive] = useState(false);
  const currentGroup = getTourGroupForPath(pathname);
  const steps = currentGroup ? tourStepsByGroup[currentGroup] : undefined;

  // Auto-start tour on first visit
  useEffect(() => {
    if (
      autoStart &&
      currentGroup &&
      steps &&
      !isTourCompleted(currentGroup) &&
      !isTourAutoStartDisabled()
    ) {
      // Small delay to ensure page is fully loaded
      const timer = setTimeout(() => {
        setIsActive(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [currentGroup, autoStart, steps]);

  const startTour = useCallback(() => {
    setIsActive(true);
  }, []);

  const handleTourClose = useCallback(() => {
    setIsActive(false);
    if (currentGroup) {
      markTourCompleted(currentGroup);
    }
  }, [currentGroup]);

  return (
    <TourContext.Provider value={{ startTour, isActive, currentGroup }}>
      {children}
      {steps && currentGroup && (
        <TourModal isOpen={isActive} steps={steps} onClose={handleTourClose} tourName={currentGroup} />
      )}
    </TourContext.Provider>
  );
}
