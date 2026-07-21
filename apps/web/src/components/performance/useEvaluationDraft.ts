'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { FieldValues } from 'react-hook-form';

const STORAGE_PREFIX = 'sn-performance-evaluation-draft';
const AUTO_SAVE_DELAY_MS = 500;

const FORM_KEY_TO_EVALUATION_KIND = {
  'monthly-self-evaluation': 'monthly',
  'monthly-call-feedback': 'monthly_call_feedback',
  'quarterly-temperature-check': 'quarterly',
  'five-percent-reflection': 'five_percent',
} as const;

type EvaluationDraftFormKey = keyof typeof FORM_KEY_TO_EVALUATION_KIND;

export interface StoredEvaluationDraft<TValues extends FieldValues> {
  values: Partial<TValues>;
  savedAt: string;
}

function sanitizeDraftValue(value: unknown): unknown {
  if (value == null) {
    return undefined;
  }

  if (typeof value === 'string') {
    return value.trim().length > 0 ? value : undefined;
  }

  if (Array.isArray(value)) {
    const sanitized = value
      .map((entry) => sanitizeDraftValue(entry))
      .filter((entry): entry is NonNullable<unknown> => entry !== undefined);
    return sanitized.length > 0 ? sanitized : undefined;
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .map(([key, entry]) => [key, sanitizeDraftValue(entry)] as const)
      .filter(([, entry]) => entry !== undefined);

    if (entries.length === 0) {
      return undefined;
    }

    return Object.fromEntries(entries);
  }

  return value;
}

function sanitizeDraftValues<TValues extends FieldValues>(values: TValues): Partial<TValues> {
  const sanitized = sanitizeDraftValue(values);

  if (!sanitized || typeof sanitized !== 'object' || Array.isArray(sanitized)) {
    return {} as Partial<TValues>;
  }

  return sanitized as Partial<TValues>;
}

function buildStorageKey(formKey: EvaluationDraftFormKey, cycleKey: string, identityKey: string): string {
  return `${STORAGE_PREFIX}:${formKey}:${identityKey}:${cycleKey}`;
}

function getLocalEvaluationDraft<TValues extends FieldValues>(
  formKey: EvaluationDraftFormKey,
  cycleKey: string,
  identityKey: string
): StoredEvaluationDraft<TValues> | null {
  if (typeof window === 'undefined' || !cycleKey || !identityKey) {
    return null;
  }

  const storageKey = buildStorageKey(formKey, cycleKey, identityKey);
  const stored = window.sessionStorage.getItem(storageKey);
  if (!stored) {
    return null;
  }

  try {
    const parsed = JSON.parse(stored) as StoredEvaluationDraft<TValues>;
    if (
      !parsed ||
      typeof parsed !== 'object' ||
      parsed.values == null ||
      typeof parsed.savedAt !== 'string'
    ) {
      throw new Error('Invalid evaluation draft payload');
    }

    return parsed;
  } catch {
    window.sessionStorage.removeItem(storageKey);
    return null;
  }
}

function setLocalEvaluationDraft<TValues extends FieldValues>(
  formKey: EvaluationDraftFormKey,
  cycleKey: string,
  identityKey: string,
  draft: StoredEvaluationDraft<TValues>
): void {
  if (typeof window === 'undefined' || !cycleKey || !identityKey) {
    return;
  }

  window.sessionStorage.setItem(buildStorageKey(formKey, cycleKey, identityKey), JSON.stringify(draft));
}

function removeLocalEvaluationDraft(
  formKey: EvaluationDraftFormKey,
  cycleKey: string,
  identityKey: string
): void {
  if (typeof window === 'undefined' || !cycleKey || !identityKey) {
    return;
  }

  window.sessionStorage.removeItem(buildStorageKey(formKey, cycleKey, identityKey));
}

async function fetchRemoteEvaluationDraft<TValues extends FieldValues>(
  formKey: EvaluationDraftFormKey,
  cycleKey: string
): Promise<StoredEvaluationDraft<TValues> | null> {
  if (!cycleKey) {
    return null;
  }

  const params = new URLSearchParams({
    evaluationKind: FORM_KEY_TO_EVALUATION_KIND[formKey],
    cycleKey,
  });

  const response = await fetch(`/api/performance/drafts?${params.toString()}`, {
    method: 'GET',
    credentials: 'include',
  });

  const payload = (await response.json()) as {
    data?: StoredEvaluationDraft<TValues> | null;
    error?: string;
  };

  if (!response.ok) {
    throw new Error(payload.error || 'Failed to load evaluation draft');
  }

  return payload.data ?? null;
}

async function persistRemoteEvaluationDraft<TValues extends FieldValues>(
  formKey: EvaluationDraftFormKey,
  cycleKey: string,
  values: Partial<TValues>
): Promise<string> {
  const response = await fetch('/api/performance/drafts', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      evaluationKind: FORM_KEY_TO_EVALUATION_KIND[formKey],
      cycleKey,
      values,
    }),
  });

  const payload = (await response.json()) as {
    data?: { savedAt: string };
    error?: string;
  };

  if (!response.ok || !payload.data?.savedAt) {
    throw new Error(payload.error || 'Failed to save evaluation draft');
  }

  return payload.data.savedAt;
}

async function deleteRemoteEvaluationDraft(
  formKey: EvaluationDraftFormKey,
  cycleKey: string
): Promise<void> {
  if (!cycleKey) {
    return;
  }

  const params = new URLSearchParams({
    evaluationKind: FORM_KEY_TO_EVALUATION_KIND[formKey],
    cycleKey,
  });

  const response = await fetch(`/api/performance/drafts?${params.toString()}`, {
    method: 'DELETE',
    credentials: 'include',
  });

  if (!response.ok) {
    const payload = (await response.json()) as { error?: string };
    throw new Error(payload.error || 'Failed to clear evaluation draft');
  }
}

export async function getEvaluationDraft<TValues extends FieldValues>(
  formKey: EvaluationDraftFormKey,
  cycleKey: string,
  identityKey: string
): Promise<StoredEvaluationDraft<TValues> | null> {
  const localDraft = getLocalEvaluationDraft<TValues>(formKey, cycleKey, identityKey);

  try {
    const remoteDraft = await fetchRemoteEvaluationDraft<TValues>(formKey, cycleKey);
    if (!remoteDraft && !localDraft) {
      return null;
    }

    if (!remoteDraft) {
      return localDraft;
    }

    if (!localDraft) {
      setLocalEvaluationDraft(formKey, cycleKey, identityKey, remoteDraft);
      return remoteDraft;
    }

    if (Date.parse(remoteDraft.savedAt) >= Date.parse(localDraft.savedAt)) {
      setLocalEvaluationDraft(formKey, cycleKey, identityKey, remoteDraft);
      return remoteDraft;
    }

    return localDraft;
  } catch (error) {
    console.error('[performance] Failed to load remote evaluation draft:', error);
    return localDraft;
  }
}

export async function clearEvaluationDraft(
  formKey: EvaluationDraftFormKey,
  cycleKey: string,
  identityKey: string
): Promise<void> {
  removeLocalEvaluationDraft(formKey, cycleKey, identityKey);

  try {
    await deleteRemoteEvaluationDraft(formKey, cycleKey);
  } catch (error) {
    console.error('[performance] Failed to clear remote evaluation draft:', error);
  }
}

export function shouldRestoreEvaluationDraft(
  draftSavedAt: string,
  latestServerSavedAt?: string | null
): boolean {
  const draftTimestamp = Date.parse(draftSavedAt);
  if (Number.isNaN(draftTimestamp)) {
    return false;
  }

  if (!latestServerSavedAt) {
    return true;
  }

  const serverTimestamp = Date.parse(latestServerSavedAt);
  if (Number.isNaN(serverTimestamp)) {
    return true;
  }

  return draftTimestamp > serverTimestamp;
}

export function formatEvaluationDraftSavedAt(savedAt: string): string {
  const timestamp = Date.parse(savedAt);
  if (Number.isNaN(timestamp)) {
    return 'recently';
  }

  return new Date(timestamp).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

interface UseAutoSaveEvaluationDraftOptions<TValues extends FieldValues> {
  formKey: EvaluationDraftFormKey;
  cycleKey: string;
  identityKey: string;
  values: TValues;
  enabled: boolean;
}

export function useAutoSaveEvaluationDraft<TValues extends FieldValues>({
  formKey,
  cycleKey,
  identityKey,
  values,
  enabled,
}: UseAutoSaveEvaluationDraftOptions<TValues>) {
  const [autoSavedAt, setAutoSavedAt] = useState<string | null>(null);
  const lastQueuedSnapshotRef = useRef<string>('');

  const clearDraft = useCallback(async () => {
    await clearEvaluationDraft(formKey, cycleKey, identityKey);
    lastQueuedSnapshotRef.current = '';
    setAutoSavedAt(null);
  }, [cycleKey, formKey, identityKey]);

  useEffect(() => {
    lastQueuedSnapshotRef.current = '';
  }, [cycleKey, formKey, identityKey]);

  useEffect(() => {
    if (typeof window === 'undefined' || !enabled || !cycleKey || !identityKey) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      const sanitizedValues = sanitizeDraftValues(values);
      const snapshot = JSON.stringify(sanitizedValues);

      if (snapshot === lastQueuedSnapshotRef.current) {
        return;
      }

      lastQueuedSnapshotRef.current = snapshot;

      const savedAt = new Date().toISOString();
      const payload: StoredEvaluationDraft<TValues> = {
        values: sanitizedValues,
        savedAt,
      };

      setLocalEvaluationDraft(formKey, cycleKey, identityKey, payload);
      setAutoSavedAt(savedAt);

      void persistRemoteEvaluationDraft(formKey, cycleKey, sanitizedValues)
        .then((remoteSavedAt) => {
          setLocalEvaluationDraft(formKey, cycleKey, identityKey, {
            values: sanitizedValues,
            savedAt: remoteSavedAt,
          });
          setAutoSavedAt(remoteSavedAt);
        })
        .catch((error) => {
          console.error('[performance] Failed to sync evaluation draft to server:', error);
        });
    }, AUTO_SAVE_DELAY_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [cycleKey, enabled, formKey, identityKey, values]);

  return {
    autoSavedAt,
    clearDraft,
  };
}