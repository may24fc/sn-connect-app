'use client';

import { useAuth } from '@/contexts/AuthContext';
import {
  ROLE_TYPE_REGISTRY,
  useCreateKPIEntry,
  useKPIEntries,
  useRoleMetadata,
} from '@/hooks/useRoleMetadata';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  useToast,
} from '@hr-portal/ui';
import { BarChart3, Calendar, Check, Loader2, Plus, TrendingUp } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

interface KPIFormEntry {
  kpi_name: string;
  kpi_value: string;
  kpi_unit: string;
  notes: string;
}

export default function KPIEntryWidget(): ReactNode {
  const { user } = useAuth();
  const { data: metadataRecords = [] } = useRoleMetadata(user?.id);
  const createEntry = useCreateKPIEntry(user?.id);
  const { addToast } = useToast();

  // Determine which role types have KPI metrics
  const roleTypesWithKPIs = useMemo(() => {
    return metadataRecords
      .map((r) => r.role_type)
      .filter((rt) => {
        const config = ROLE_TYPE_REGISTRY[rt as keyof typeof ROLE_TYPE_REGISTRY];
        return config?.kpiMetrics && config.kpiMetrics.length > 0;
      });
  }, [metadataRecords]);

  const firstRoleType: string =
    roleTypesWithKPIs.length > 0 ? (roleTypesWithKPIs[0] as string) : '';
  const [selectedRoleType, setSelectedRoleType] = useState<string>(firstRoleType);
  const todayStr: string = new Date().toISOString().split('T')[0] as string;
  const [entryDate, setEntryDate] = useState<string>(todayStr);
  const [entries, setEntries] = useState<KPIFormEntry[]>([]);
  const [savingIndex, setSavingIndex] = useState<number | null>(null);
  const [savedIndices, setSavedIndices] = useState<Set<number>>(new Set());

  // Get KPI metrics for the selected role
  const selectedConfig = selectedRoleType
    ? ROLE_TYPE_REGISTRY[selectedRoleType as keyof typeof ROLE_TYPE_REGISTRY]
    : null;
  const kpiMetrics = selectedConfig?.kpiMetrics ?? [];

  // Fetch existing entries for context
  const kpiFilters = useMemo(() => {
    const f: { from_date: string; to_date: string; role_type?: string } = {
      from_date: entryDate,
      to_date: entryDate,
    };
    if (selectedRoleType) {
      f.role_type = selectedRoleType;
    }
    return f;
  }, [selectedRoleType, entryDate]);
  const { data: existingEntries = [] } = useKPIEntries(user?.id, kpiFilters);

  // Initialize entries when role type changes
  const initializeEntries = useCallback(() => {
    if (kpiMetrics.length > 0) {
      setEntries(
        kpiMetrics.map((metric) => {
          // Pre-fill with existing data if available
          const existing = existingEntries.find(
            (e) => e.kpi_name === metric.name && e.entry_date === entryDate
          );
          return {
            kpi_name: metric.name,
            kpi_value: existing ? String(existing.kpi_value) : '',
            kpi_unit: metric.unit,
            notes: existing?.notes ?? '',
          };
        })
      );
      setSavedIndices(new Set());
    }
  }, [kpiMetrics, existingEntries, entryDate]);

  // Re-initialize when role type or date changes
  useMemo(() => {
    initializeEntries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRoleType, entryDate, existingEntries.length]);

  const handleEntryChange = (index: number, field: keyof KPIFormEntry, value: string): void => {
    setEntries((prev) => {
      const updated = [...prev];
      const current = updated[index];
      if (current) {
        updated[index] = { ...current, [field]: value };
      }
      return updated;
    });
    // Mark as unsaved
    setSavedIndices((prev) => {
      const next = new Set(prev);
      next.delete(index);
      return next;
    });
  };

  const handleSaveEntry = async (index: number): Promise<void> => {
    const entry = entries[index];
    if (!entry || !entry.kpi_value || !selectedRoleType) return;

    setSavingIndex(index);
    try {
      const payload: {
        role_type: string;
        entry_date: string;
        kpi_name: string;
        kpi_value: number;
        kpi_unit: string;
        notes?: string;
      } = {
        role_type: selectedRoleType,
        entry_date: entryDate,
        kpi_name: entry.kpi_name,
        kpi_value: Number(entry.kpi_value),
        kpi_unit: entry.kpi_unit,
      };
      if (entry.notes) {
        payload.notes = entry.notes;
      }
      await createEntry.mutateAsync(payload);
      setSavedIndices((prev) => new Set(prev).add(index));
    } catch {
      addToast({ title: 'Failed to save KPI entry', variant: 'error' });
    } finally {
      setSavingIndex(null);
    }
  };

  const handleSaveAll = async (): Promise<void> => {
    for (let i = 0; i < entries.length; i++) {
      const e = entries[i];
      if (e && e.kpi_value && !savedIndices.has(i)) {
        await handleSaveEntry(i);
      }
    }
  };

  if (roleTypesWithKPIs.length === 0) {
    return null; // Don't render if user has no KPI-capable roles
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3
              className="h-4.5 w-4.5 text-indigo-600 dark:text-indigo-400"
              strokeWidth={1.5}
            />
            <div>
              <CardTitle className="text-base">Log KPI Values</CardTitle>
              <CardDescription className="text-xs">
                Record your daily/weekly performance metrics
              </CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Role Type & Date Selectors */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="kpi-role-type" className="text-sm">
              Role Type
            </Label>
            <Select value={selectedRoleType} onValueChange={setSelectedRoleType}>
              <SelectTrigger id="kpi-role-type">
                <SelectValue placeholder="Select role..." />
              </SelectTrigger>
              <SelectContent>
                {roleTypesWithKPIs.map((rt) => {
                  const config = ROLE_TYPE_REGISTRY[rt as keyof typeof ROLE_TYPE_REGISTRY];
                  return (
                    <SelectItem key={rt} value={rt}>
                      {config?.label ?? rt}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="kpi-entry-date" className="text-sm">
              Entry Date
            </Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="kpi-entry-date"
                type="date"
                value={entryDate}
                onChange={(e) => setEntryDate(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </div>

        {/* KPI Entry Fields */}
        {selectedRoleType && kpiMetrics.length > 0 && (
          <div className="space-y-3">
            {entries.map((entry, index) => {
              const metricConfig = kpiMetrics.find((m) => m.name === entry.kpi_name);
              const isSaving = savingIndex === index;
              const isSaved = savedIndices.has(index);

              return (
                <div
                  key={entry.kpi_name}
                  className="flex items-end gap-3 rounded-lg border border-zinc-200 dark:border-zinc-800 p-3"
                >
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <Label className="text-sm font-medium">
                        {metricConfig?.label ?? entry.kpi_name}
                      </Label>
                      <Badge variant="outline" className="text-[10px] h-4 px-1">
                        {entry.kpi_unit}
                      </Badge>
                    </div>
                    {metricConfig?.description && (
                      <p className="text-[11px] text-zinc-400 dark:text-zinc-500">
                        {metricConfig.description}
                      </p>
                    )}
                    <Input
                      type="number"
                      step="any"
                      value={entry.kpi_value}
                      onChange={(e) => handleEntryChange(index, 'kpi_value', e.target.value)}
                      placeholder={`Enter ${metricConfig?.label ?? entry.kpi_name}...`}
                      className="h-9"
                    />
                  </div>
                  <Button
                    variant={isSaved ? 'outline' : 'default'}
                    size="sm"
                    onClick={() => handleSaveEntry(index)}
                    disabled={isSaving || !entry.kpi_value}
                    className="h-9 w-9 p-0 flex-shrink-0"
                  >
                    {isSaving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : isSaved ? (
                      <Check className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              );
            })}

            {/* Save All Button */}
            <div className="flex justify-end pt-1">
              <Button
                onClick={handleSaveAll}
                disabled={
                  entries.every((_, i) => savedIndices.has(i)) || entries.every((e) => !e.kpi_value)
                }
                size="sm"
                className="gap-2"
              >
                <TrendingUp className="h-4 w-4" />
                Save All Entries
              </Button>
            </div>
          </div>
        )}

        {selectedRoleType && kpiMetrics.length === 0 && (
          <p className="text-sm text-zinc-500 dark:text-zinc-400 text-center py-4">
            No KPI metrics configured for this role type.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
