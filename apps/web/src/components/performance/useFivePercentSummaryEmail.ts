'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export type FivePercentSummaryEmailTrigger = 'all_submitted' | 'deadline' | 'manual';

export type FivePercentSummaryEmailStatus = {
  monthKey: string;
  recipientsConfigured: boolean;
  recipientCount: number;
  completion: {
    expectedCount: number;
    submittedCount: number;
    pendingNames: Array<string>;
  };
  lastEmail: {
    emailedAt: string;
    trigger: FivePercentSummaryEmailTrigger | null;
    recipientCount: number | null;
  } | null;
};

type StatusResponse = { data?: FivePercentSummaryEmailStatus; error?: string };
type SendResponse = { data?: { recipientCount: number }; error?: string };

type UseFivePercentSummaryEmailOptions = {
  monthKey: string;
  onError: (title: string, description: string) => void;
  onSent: (recipientCount: number) => void;
};

export function useFivePercentSummaryEmail({
  monthKey,
  onError,
  onSent,
}: UseFivePercentSummaryEmailOptions) {
  const [status, setStatus] = useState<FivePercentSummaryEmailStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const onErrorRef = useRef(onError);
  const onSentRef = useRef(onSent);

  useEffect(() => {
    onErrorRef.current = onError;
    onSentRef.current = onSent;
  }, [onError, onSent]);

  const loadStatus = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ monthKey });
      const response = await fetch(
        `/api/performance/five-percent-reflections/summary-email?${params.toString()}`,
        { credentials: 'include' }
      );
      const payload = (await response.json()) as StatusResponse;
      if (!response.ok || !payload.data) {
        throw new Error(payload.error || 'Failed to load summary email status');
      }
      setStatus(payload.data);
    } catch (error) {
      setStatus(null);
      onErrorRef.current?.(
        'Unable to load summary email status',
        error instanceof Error ? error.message : 'Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  }, [monthKey]);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  async function sendEmail(): Promise<boolean> {
    setIsSending(true);
    try {
      const response = await fetch('/api/performance/five-percent-reflections/summary-email', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ monthKey, resend: Boolean(status?.lastEmail) }),
      });
      const payload = (await response.json()) as SendResponse;
      if (!response.ok || !payload.data) {
        throw new Error(payload.error || 'Failed to send the summary email');
      }
      onSentRef.current?.(payload.data.recipientCount);
      await loadStatus();
      return true;
    } catch (error) {
      onErrorRef.current?.(
        'Unable to email summary',
        error instanceof Error ? error.message : 'Please try again.'
      );
      return false;
    } finally {
      setIsSending(false);
    }
  }

  return { status, isLoading, isSending, sendEmail };
}
