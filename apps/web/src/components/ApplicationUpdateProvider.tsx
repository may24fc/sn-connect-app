'use client';

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@hr-portal/ui';
import type { ReactNode } from 'react';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';

interface VersionResponse {
  version?: string;
  generatedAt?: string;
  summaryTitle?: string;
  summaryItems?: string[];
}

interface ApplicationUpdateProviderProps {
  children: ReactNode;
  initialVersion: string;
  pollIntervalMs?: number;
}

const DEFAULT_POLL_INTERVAL_MS = 5 * 60 * 1000;
const DEFAULT_SUMMARY_TITLE = "What's new in SN Connect";
const DEFAULT_SUMMARY_ITEMS = [
  'Improved portal performance across dashboards and shared layouts.',
  'Refined deployment update handling so new builds are easier to review before refresh.',
  'Applied stability fixes for report and navigation flows.',
];
const FORCE_UPDATE_STORAGE_KEY = 'sn:force-update-available';
const FORCE_UPDATE_SUMMARY_STORAGE_KEY = 'sn:force-update-summary';

interface ApplicationUpdateContextValue {
  updateAvailable: boolean;
  reloadToUpdate: () => void;
  summaryTitle: string;
  summaryItems: string[];
  generatedAt: string | null;
}

const ApplicationUpdateContext = createContext<ApplicationUpdateContextValue | null>(null);

export function ApplicationUpdateProvider({
  children,
  initialVersion,
  pollIntervalMs = DEFAULT_POLL_INTERVAL_MS,
}: ApplicationUpdateProviderProps): ReactNode {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [updateDetails, setUpdateDetails] = useState<{
    summaryTitle: string;
    summaryItems: string[];
    generatedAt: string | null;
  }>({
    summaryTitle: DEFAULT_SUMMARY_TITLE,
    summaryItems: DEFAULT_SUMMARY_ITEMS,
    generatedAt: null,
  });

  const reloadToUpdate = (): void => {
    window.location.reload();
  };

  const parseForcedSummaryItems = useCallback((): string[] => {
    const rawSummary = window.localStorage.getItem(FORCE_UPDATE_SUMMARY_STORAGE_KEY)?.trim();

    if (!rawSummary) {
      return DEFAULT_SUMMARY_ITEMS;
    }

    const items = rawSummary
      .split(/\r?\n|\|/)
      .map((item) => item.trim())
      .filter(Boolean);

    return items.length > 0 ? items : DEFAULT_SUMMARY_ITEMS;
  }, []);

  const checkForApplicationUpdate = useCallback(async (signal?: AbortSignal) => {
    try {
      if (
        process.env.NODE_ENV !== 'production' &&
        window.localStorage.getItem(FORCE_UPDATE_STORAGE_KEY) === '1'
      ) {
        setUpdateDetails({
          summaryTitle: 'Local update test',
          summaryItems: parseForcedSummaryItems(),
          generatedAt: new Date().toISOString(),
        });
        setUpdateAvailable(true);
        return;
      }

      const response = await fetch('/version.json', {
        cache: 'no-store',
        headers: {
          Accept: 'application/json',
        },
        ...(signal ? { signal } : {}),
      });

      if (!response.ok) {
        return;
      }

      const payload = (await response.json()) as VersionResponse;

      if (payload.version && payload.version !== initialVersion) {
        setUpdateDetails({
          summaryTitle: payload.summaryTitle?.trim() || DEFAULT_SUMMARY_TITLE,
          summaryItems:
            payload.summaryItems && payload.summaryItems.length > 0
              ? payload.summaryItems
              : DEFAULT_SUMMARY_ITEMS,
          generatedAt: payload.generatedAt ?? null,
        });
        setUpdateAvailable(true);
      }
    } catch (error) {
      if (signal?.aborted) {
        return;
      }

      if (process.env.NODE_ENV !== 'production') {
        console.warn('Failed to check for application updates.', error);
      }
    }
  }, [initialVersion, parseForcedSummaryItems]);

  useEffect(() => {
    if (updateAvailable) {
      return;
    }

    const controller = new AbortController();
    void checkForApplicationUpdate(controller.signal);

    const intervalId = window.setInterval(() => {
      void checkForApplicationUpdate();
    }, pollIntervalMs);

    return () => {
      controller.abort();
      window.clearInterval(intervalId);
    };
  }, [checkForApplicationUpdate, pollIntervalMs, updateAvailable]);

  return (
    <ApplicationUpdateContext.Provider
      value={{
        updateAvailable,
        reloadToUpdate,
        summaryTitle: updateDetails.summaryTitle,
        summaryItems: updateDetails.summaryItems,
        generatedAt: updateDetails.generatedAt,
      }}
    >
      {children}
    </ApplicationUpdateContext.Provider>
  );
}

export function useApplicationUpdate(): ApplicationUpdateContextValue {
  const context = useContext(ApplicationUpdateContext);

  if (!context) {
    throw new Error('useApplicationUpdate must be used within an ApplicationUpdateProvider.');
  }

  return context;
}

export function ApplicationUpdateHeaderAction(): ReactNode {
  const { updateAvailable, reloadToUpdate, summaryTitle, summaryItems, generatedAt } =
    useApplicationUpdate();
  const [dialogOpen, setDialogOpen] = useState(false);

  if (!updateAvailable) {
    return null;
  }

  return (
    <>
      <div className="flex items-center gap-2" aria-live="polite" role="status">
        <div className="hidden max-w-[24rem] items-center gap-3 rounded-lg border border-border/70 bg-background/80 px-3 py-2 text-foreground shadow-sm lg:flex">
          <p className="text-xs font-medium leading-5 text-foreground">
            Application Update Available
          </p>
          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={() => setDialogOpen(true)}
            className="shrink-0"
          >
            Refresh to Update
          </Button>
        </div>
        <Button
          type="button"
          variant="default"
          size="sm"
          onClick={() => setDialogOpen(true)}
          className="md:hidden"
        >
          Refresh to Update
        </Button>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Application update ready</DialogTitle>
            <DialogDescription>
              Review the release updates below, then refresh when you are ready to load the latest version.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-lg border border-border/70 bg-background/60 px-4 py-3">
              <p className="text-sm font-semibold text-foreground">{summaryTitle}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Application Update Available
              </p>
              {generatedAt ? (
                <p className="mt-2 text-[11px] text-muted-foreground">
                  Detected deployment time: {new Date(generatedAt).toLocaleString()}
                </p>
              ) : null}
            </div>

            <ul className="space-y-2 text-sm text-foreground">
              {summaryItems.map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-400 dark:bg-zinc-500" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <DialogFooter className="gap-2 sm:justify-end">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Not now
            </Button>
            <Button variant="default" onClick={reloadToUpdate} className="font-semibold">
              Refresh to Update
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}