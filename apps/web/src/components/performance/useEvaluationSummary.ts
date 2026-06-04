'use client';

import { type PerformanceEvaluationDraftKind } from '@/lib/schemas/performance.schema';
import { useEffect, useState, useRef } from 'react';

type SummaryRecord = {
  evaluationKind: PerformanceEvaluationDraftKind;
  periodKey: string;
  summaryMarkdown: string;
  totalSubmissionsAnalyzed: number;
  sentimentDistribution: Record<string, number> | null;
  sourceSnapshotHash: string;
  generatedAt: string;
  generatedBy: string | null;
  isStale: boolean;
};

type SummaryLookupResult = {
  summary: SummaryRecord | null;
  totalSubmissionsAnalyzed: number;
  hasSourceData: boolean;
};

type SummaryLookupResponse = {
  data?: SummaryLookupResult;
  error?: string;
};

type SummaryGenerateResponse = {
  data?: SummaryRecord;
  error?: string;
};

type UseEvaluationSummaryOptions = {
  evaluationKind: PerformanceEvaluationDraftKind;
  periodKey: string;
  enabled?: boolean;
  onError: (title: string, description: string) => void;
};

export function useEvaluationSummary({
  evaluationKind,
  periodKey,
  enabled = true,
  onError,
}: UseEvaluationSummaryOptions) {
  const [summary, setSummary] = useState<SummaryRecord | null>(null);
  const [hasSourceData, setHasSourceData] = useState(false);
  const [isLoadingStatus, setIsLoadingStatus] = useState(enabled);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isViewingSummary, setIsViewingSummary] = useState(false);
  const onErrorRef = useRef(onError);

  // keep latest onError in a ref so we don't re-run effects when parent
  // passes a new inline function on every render
  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  useEffect(() => {
    setIsViewingSummary(false);
  }, [evaluationKind, periodKey]);

  useEffect(() => {
    if (!enabled) {
      setSummary(null);
      setHasSourceData(false);
      setIsLoadingStatus(false);
      return;
    }

    let active = true;

    async function loadSummary() {
      setIsLoadingStatus(true);

      try {
        const params = new URLSearchParams({ evaluationKind, periodKey });
        const response = await fetch(`/api/performance/evaluation-summaries?${params.toString()}`, {
          credentials: 'include',
        });
        const payload = (await response.json()) as SummaryLookupResponse;

        if (!response.ok || !payload.data) {
          throw new Error(payload.error || 'Failed to load saved summary');
        }

        if (!active) {
          return;
        }

        setSummary(payload.data.summary);
        setHasSourceData(payload.data.hasSourceData);
      } catch (error) {
        if (!active) {
          return;
        }

        // use ref to call the latest onError without forcing effect re-run
        onErrorRef.current?.(
          'Unable to load saved summary',
          error instanceof Error ? error.message : 'Please try again.'
        );
      } finally {
        if (active) {
          setIsLoadingStatus(false);
        }
      }
    }

    void loadSummary();

    return () => {
      active = false;
    };
  }, [enabled, evaluationKind, periodKey]);

  async function generateSummary(forceRegenerate = false): Promise<void> {
    setIsGenerating(true);

    try {
      const response = await fetch('/api/performance/evaluation-summaries', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          evaluationKind,
          periodKey,
          forceRegenerate,
        }),
      });
      const payload = (await response.json()) as SummaryGenerateResponse;

      if (!response.ok || !payload.data) {
        throw new Error(payload.error || 'Failed to generate summary');
      }

      setSummary(payload.data);
      setHasSourceData(true);
      setIsViewingSummary(true);
    } catch (error) {
      onErrorRef.current?.(
        'Unable to generate summary',
        error instanceof Error ? error.message : 'Please try again.'
      );
    } finally {
      setIsGenerating(false);
    }
  }

  async function handlePrimaryAction(): Promise<void> {
    if (summary) {
      setIsViewingSummary(true);
      return;
    }

    await generateSummary(false);
  }

  return {
    summary,
    hasSummary: Boolean(summary),
    hasSourceData,
    isLoadingStatus,
    isGenerating,
    isViewingSummary,
    primaryActionLabel: isGenerating
      ? 'Generating Summary...'
      : summary
        ? 'View AI Summary'
        : 'Generate AI Summary',
    handlePrimaryAction,
    hideSummary: () => setIsViewingSummary(false),
    regenerateSummary: () => generateSummary(true),
  };
}