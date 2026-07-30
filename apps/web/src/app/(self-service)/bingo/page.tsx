'use client';

import type { BingoPartnerOption } from '@/app/api/wellness-bingo/_lib';
import {
  useBingoPartners,
  useCurrentBingo,
  useUpdateBingoBoard,
  useUpdateBingoPartner,
  useUpdateBingoWeeklyRecording,
} from '@/hooks/useBingo';
import {
  BINGO_GRID,
  BINGO_TILE_DEFINITIONS,
  type BingoTileId,
  CUSTOM_HABIT_TILE_ID,
  EMPTY_BINGO_TILE_STATE,
} from '@/lib/bingo';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Progress,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  cn,
} from '@hr-portal/ui';
import { Grid2x2, HeartHandshake, Target, Trophy, X } from 'lucide-react';
import { useEffect, useState } from 'react';

const totalTiles = BINGO_TILE_DEFINITIONS.length;
const flatBingoTileIds = BINGO_GRID.flat();
type BingoSnapshot = NonNullable<ReturnType<typeof useCurrentBingo>['data']>;

export default function BingoPage() {
  const { data, isLoading, error } = useCurrentBingo();
  const { data: partners = [], isLoading: isLoadingPartners } = useBingoPartners();
  const updateBoard = useUpdateBingoBoard();
  const updatePartner = useUpdateBingoPartner();
  const updateRecording = useUpdateBingoWeeklyRecording();
  const [customHabitDraft, setCustomHabitDraft] = useState('');
  const [recordingDraft, setRecordingDraft] = useState('');

  useEffect(() => {
    setCustomHabitDraft(data?.board.customHabitText ?? '');
  }, [data?.board.customHabitText]);

  useEffect(() => {
    setRecordingDraft(data?.currentWeekRecording?.recordingUrl ?? '');
  }, [data?.currentWeekRecording?.recordingUrl]);

  const tileState = data?.board.tileState ?? EMPTY_BINGO_TILE_STATE;
  const completionPct = Math.round(((data?.weeklyScore.completedSquares ?? 0) / totalTiles) * 100);

  const mutationError =
    updateBoard.error?.message ??
    updatePartner.error?.message ??
    updateRecording.error?.message ??
    error?.message;

  const handleTileToggle = (tileId: BingoTileId) => {
    updateBoard.mutate({
      tileId,
      checked: !tileState[tileId],
    });
  };

  const handleCustomHabitSave = () => {
    updateBoard.mutate({
      customHabitText: customHabitDraft.trim() === '' ? null : customHabitDraft.trim(),
    });
  };

  if (isLoading) {
    return <BingoLoadingState />;
  }

  if (!data) {
    return <BingoEmptyState message={mutationError ?? 'Unable to load the current bingo cycle.'} />;
  }

  return (
    <BingoPageContent
      data={data}
      partners={partners}
      isLoadingPartners={isLoadingPartners}
      mutationError={mutationError}
      customHabitDraft={customHabitDraft}
      setCustomHabitDraft={setCustomHabitDraft}
      recordingDraft={recordingDraft}
      setRecordingDraft={setRecordingDraft}
      completionPct={completionPct}
      tileState={tileState}
      isUpdatingBoard={updateBoard.isPending}
      isUpdatingPartner={updatePartner.isPending}
      isUpdatingRecording={updateRecording.isPending}
      onTileToggle={handleTileToggle}
      onCustomHabitSave={handleCustomHabitSave}
      onPartnerChange={(value) => updatePartner.mutate(value)}
      onRecordingSave={() =>
        updateRecording.mutate(recordingDraft.trim() === '' ? null : recordingDraft.trim())
      }
    />
  );
}

function BingoLoadingState() {
  return (
    <div className="space-y-6 p-6">
      <Skeleton className="h-20" />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_360px]">
        <Skeleton className="h-[640px]" />
        <Skeleton className="h-[640px]" />
      </div>
    </div>
  );
}

function BingoEmptyState({ message }: { message: string }) {
  return (
    <div className="space-y-6 p-6">
      <Card className="border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-100">
        <CardContent className="py-4 text-sm">{message}</CardContent>
      </Card>
    </div>
  );
}

function BingoPageContent({
  data,
  partners,
  isLoadingPartners,
  mutationError,
  customHabitDraft,
  setCustomHabitDraft,
  recordingDraft,
  setRecordingDraft,
  completionPct,
  tileState,
  isUpdatingBoard,
  isUpdatingPartner,
  isUpdatingRecording,
  onTileToggle,
  onCustomHabitSave,
  onPartnerChange,
  onRecordingSave,
}: {
  data: BingoSnapshot;
  partners: Array<BingoPartnerOption>;
  isLoadingPartners: boolean;
  mutationError: string | undefined;
  customHabitDraft: string;
  setCustomHabitDraft: (value: string) => void;
  recordingDraft: string;
  setRecordingDraft: (value: string) => void;
  completionPct: number;
  tileState: Record<BingoTileId, boolean>;
  isUpdatingBoard: boolean;
  isUpdatingPartner: boolean;
  isUpdatingRecording: boolean;
  onTileToggle: (tileId: BingoTileId) => void;
  onCustomHabitSave: () => void;
  onPartnerChange: (value: string | null) => void;
  onRecordingSave: () => void;
}) {
  return (
    <div className="space-y-6 p-6">
      <BingoHero
        cycleTitle={data.cycle.title}
        weekIndex={data.activeWeek.index}
        totalWeeks={data.activeWeek.totalWeeks}
        weekStartDate={data.activeWeek.startDate}
        weekEndDate={data.activeWeek.endDate}
        startDate={data.cycle.startDate}
        endDate={data.cycle.endDate}
        completedSquares={data.weeklyScore.completedSquares}
        personalPoints={data.personalScore.totalPoints}
        combinedPoints={data.combinedScore}
      />

      {mutationError ? <BingoErrorBanner message={mutationError} /> : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_360px]">
        <section className="space-y-6">
          <BingoBoardCard
            weekIndex={data.activeWeek.index}
            totalWeeks={data.activeWeek.totalWeeks}
            completionPct={completionPct}
            customHabitText={data.board.customHabitText}
            tileState={tileState}
            isPending={isUpdatingBoard}
            onTileToggle={onTileToggle}
          />
          <CustomHabitCard
            value={customHabitDraft}
            disabled={isUpdatingBoard}
            onChange={setCustomHabitDraft}
            onSave={onCustomHabitSave}
          />
        </section>

        <BingoSidebar
          data={data}
          partners={partners}
          isLoadingPartners={isLoadingPartners}
          isUpdatingPartner={isUpdatingPartner}
          recordingDraft={recordingDraft}
          isUpdatingRecording={isUpdatingRecording}
          onPartnerChange={onPartnerChange}
          onRecordingDraftChange={setRecordingDraft}
          onRecordingSave={onRecordingSave}
        />
      </div>

      <AdminWeeklyRecordingsCard items={data.adminWeeklyRecordings} />
    </div>
  );
}

function BingoErrorBanner({ message }: { message: string }) {
  return (
    <Card className="border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-100">
      <CardContent className="py-4 text-sm">{message}</CardContent>
    </Card>
  );
}

function CustomHabitCard({
  value,
  disabled,
  onChange,
  onSave,
}: {
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
  onSave: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Custom Habit</CardTitle>
        <CardDescription>
          Personalize the custom habit square with the behavior you want to reinforce this cycle.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 sm:flex-row">
        <Input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          maxLength={80}
          placeholder="Example: 10-minute evening walk"
        />
        <Button onClick={onSave} disabled={disabled} className="sm:min-w-32">
          Save Habit
        </Button>
      </CardContent>
    </Card>
  );
}

function BingoSidebar({
  data,
  partners,
  isLoadingPartners,
  isUpdatingPartner,
  recordingDraft,
  isUpdatingRecording,
  onPartnerChange,
  onRecordingDraftChange,
  onRecordingSave,
}: {
  data: BingoSnapshot;
  partners: Array<BingoPartnerOption>;
  isLoadingPartners: boolean;
  isUpdatingPartner: boolean;
  recordingDraft: string;
  isUpdatingRecording: boolean;
  onPartnerChange: (value: string | null) => void;
  onRecordingDraftChange: (value: string) => void;
  onRecordingSave: () => void;
}) {
  return (
    <aside className="space-y-6">
      <PointSystemCard />
      <ScoreboardCard data={data} />
      <PartnerPairingCard
        currentPartner={data.partner}
        partnerScore={data.partnerScore?.totalPoints ?? 0}
        combinedScore={data.combinedScore}
        partners={partners}
        isLoadingPartners={isLoadingPartners}
        isUpdatingPartner={isUpdatingPartner}
        onPartnerChange={onPartnerChange}
      />
      <WeeklyRecordingCard
        hasPartner={Boolean(data.partner)}
        weekIndex={data.activeWeek.index}
        weekStartDate={data.activeWeek.startDate}
        weekEndDate={data.activeWeek.endDate}
        value={recordingDraft}
        existingUrl={data.currentWeekRecording?.recordingUrl ?? null}
        disabled={isUpdatingRecording}
        onChange={onRecordingDraftChange}
        onSave={onRecordingSave}
      />
    </aside>
  );
}

function WeeklyRecordingCard({
  hasPartner,
  weekIndex,
  weekStartDate,
  weekEndDate,
  value,
  existingUrl,
  disabled,
  onChange,
  onSave,
}: {
  hasPartner: boolean;
  weekIndex: number;
  weekStartDate: string;
  weekEndDate: string;
  value: string;
  existingUrl: string | null;
  disabled: boolean;
  onChange: (value: string) => void;
  onSave: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Weekly Partner Recording</CardTitle>
        <CardDescription>
          Week {weekIndex} ({weekStartDate} to {weekEndDate}). Either partner can save one link for
          this week.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="https://your-recording-link"
          disabled={!hasPartner || disabled}
        />
        <Button onClick={onSave} disabled={!hasPartner || disabled} className="w-full">
          Save Weekly Link
        </Button>
        {!hasPartner ? (
          <p className="text-xs text-muted-foreground">
            Pick a partner first to enable weekly recording links.
          </p>
        ) : null}
        {existingUrl ? (
          <a
            href={existingUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex text-xs font-medium text-sky-700 underline underline-offset-4 hover:text-sky-800 dark:text-sky-300 dark:hover:text-sky-200"
          >
            Open current weekly recording
          </a>
        ) : null}
      </CardContent>
    </Card>
  );
}

function AdminWeeklyRecordingsCard({
  items,
}: {
  items: Array<BingoSnapshot['adminWeeklyRecordings'][number]>;
}) {
  if (items.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Admin Weekly Recording Review</CardTitle>
        <CardDescription>
          Weekly links submitted by wellness pairs in the active cycle.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((item) => (
          <div
            key={item.id}
            className="rounded-xl border border-border bg-muted/30 p-3 text-sm shadow-sm"
          >
            <div className="font-medium text-foreground">
              {item.partnerAName} and {item.partnerBName}
            </div>
            <div className="text-xs text-muted-foreground">
              Week {item.weekIndex} ({item.weekStartDate} to {item.weekEndDate})
            </div>
            <a
              href={item.recordingUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-flex text-xs font-medium text-sky-700 underline underline-offset-4 hover:text-sky-800 dark:text-sky-300 dark:hover:text-sky-200"
            >
              Open recording
            </a>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function PointSystemCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Point System</CardTitle>
        <CardDescription>
          Checks reset every Monday and run through Sunday, but your points keep accumulating for
          the full 30-day cycle.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-muted-foreground">
        <RuleLine label="Each completed square" value="1 point per person" />
        <RuleLine label="Vertical bingo (A-D)" value="10 bonus points" />
        <RuleLine label="Horizontal bingo (1-4)" value="5 bonus points" />
        <RuleLine label="Partners combine scores" value="One shared total" />
      </CardContent>
    </Card>
  );
}

function ScoreboardCard({ data }: { data: BingoSnapshot }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Your 30-Day Scoreboard</CardTitle>
        <CardDescription>Accumulated totals across all weekly board refreshes.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <MetricRow label="Completed squares" value={String(data.personalScore.completedSquares)} />
        <MetricRow label="Horizontal bingos" value={String(data.personalScore.horizontalBingos)} />
        <MetricRow label="Vertical bingos" value={String(data.personalScore.verticalBingos)} />
        <MetricRow label="Bonus points" value={String(data.personalScore.bonusPoints)} />
        <MetricRow label="Total points" value={String(data.personalScore.totalPoints)} strong />
      </CardContent>
    </Card>
  );
}

function PartnerPairingCard({
  currentPartner,
  partnerScore,
  combinedScore,
  partners,
  isLoadingPartners,
  isUpdatingPartner,
  onPartnerChange,
}: {
  currentPartner: BingoSnapshot['partner'];
  partnerScore: number;
  combinedScore: number;
  partners: Array<{
    id: string;
    name: string;
    hasPartner: boolean;
    isSelectable: boolean;
  }>;
  isLoadingPartners: boolean;
  isUpdatingPartner: boolean;
  onPartnerChange: (value: string | null) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Partner Pairing</CardTitle>
        <CardDescription>
          Pick one teammate for this cycle. You can switch partners anytime, and combined scores
          update from both boards.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Select
          value={currentPartner?.id ?? 'none'}
          onValueChange={(value) => onPartnerChange(value === 'none' ? null : value)}
          disabled={isLoadingPartners || isUpdatingPartner}
        >
          <SelectTrigger className={cn(currentPartner ? 'pr-9' : undefined)}>
            <SelectValue placeholder="Choose your partner" />
            {currentPartner ? (
              <button
                type="button"
                aria-label="Clear selected partner"
                className="absolute right-2 top-1/2 inline-flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:text-foreground"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  onPartnerChange(null);
                }}
                disabled={isUpdatingPartner}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No partner yet</SelectItem>
            {partners.map((partner) => (
              <SelectItem key={partner.id} value={partner.id}>
                <div className="flex w-full items-center justify-between gap-2">
                  <span>{partner.name}</span>
                  {partner.hasPartner ? (
                    <Badge className="border border-amber-300/80 bg-amber-50 text-[10px] uppercase tracking-[0.2em] text-amber-700 shadow-none dark:border-amber-400/30 dark:bg-amber-500/15 dark:text-amber-100">
                      Paired
                    </Badge>
                  ) : null}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <CurrentPartnerPanel
          partner={currentPartner}
          partnerScore={partnerScore}
          combinedScore={combinedScore}
        />
      </CardContent>
    </Card>
  );
}

function CurrentPartnerPanel({
  partner,
  partnerScore,
  combinedScore,
}: {
  partner: BingoSnapshot['partner'];
  partnerScore: number;
  combinedScore: number;
}) {
  const partnerMeta = partner
    ? `${partner.role.replace('_', ' ')}${partner.email ? ` • ${partner.email}` : ''}`
    : 'Choose a teammate to unlock combined totals.';

  return (
    <div className="rounded-2xl border border-border bg-muted/40 p-4">
      <div className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
        Current partner
      </div>
      <div className="mt-2 text-base font-semibold">{partner?.name ?? 'No partner selected'}</div>
      <div className="mt-1 text-sm text-muted-foreground">{partnerMeta}</div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <PartnerMetric label="Partner 30-day points" value={String(partnerScore)} />
        <PartnerMetric label="Combined 30-day points" value={String(combinedScore)} />
      </div>
    </div>
  );
}

function BingoHero({
  cycleTitle,
  weekIndex,
  totalWeeks,
  weekStartDate,
  weekEndDate,
  startDate,
  endDate,
  completedSquares,
  personalPoints,
  combinedPoints,
}: {
  cycleTitle: string;
  weekIndex: number;
  totalWeeks: number;
  weekStartDate: string;
  weekEndDate: string;
  startDate: string;
  endDate: string;
  completedSquares: number;
  personalPoints: number;
  combinedPoints: number;
}) {
  return (
    <header className="rounded-3xl border border-sky-200/80 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.18),_transparent_34%),radial-gradient(circle_at_top_right,_rgba(16,185,129,0.14),_transparent_28%),linear-gradient(135deg,_rgba(248,250,252,0.98)_0%,_rgba(239,246,255,0.98)_45%,_rgba(236,253,245,0.96)_100%)] p-6 text-slate-900 shadow-[0_18px_50px_rgba(148,163,184,0.18)] dark:border-slate-800 dark:bg-[radial-gradient(circle_at_top_left,_rgba(129,140,248,0.28),_transparent_32%),linear-gradient(135deg,_#0f172a_0%,_#020617_60%,_#111827_100%)] dark:text-slate-50 dark:shadow-[0_20px_60px_rgba(15,23,42,0.35)]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-3">
          <Badge className="w-fit border border-sky-300/80 bg-white/80 text-sky-700 shadow-sm hover:bg-white/80 dark:border-indigo-400/40 dark:bg-indigo-500/15 dark:text-indigo-100 dark:hover:bg-indigo-500/15">
            30-Day Team Wellness Bingo
          </Badge>
          <Badge className="w-fit border border-emerald-300/80 bg-emerald-50/90 text-emerald-700 shadow-sm hover:bg-emerald-50/90 dark:border-emerald-400/30 dark:bg-emerald-500/15 dark:text-emerald-100 dark:hover:bg-emerald-500/15">
            Week {weekIndex} of {totalWeeks}
          </Badge>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Consistency Is Key</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-600 dark:text-slate-300">
              Weekly checks refresh every Monday for a Monday-Sunday board, but your score keeps
              rolling up across the full 30-day challenge. Click any tile to mark it complete, keep
              your custom habit updated, and combine totals with your selected partner.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 text-sm text-slate-600 dark:text-slate-200">
            <span>{cycleTitle}</span>
            <span className="text-slate-300 dark:text-slate-500">|</span>
            <span>
              {startDate} to {endDate}
            </span>
            <span className="text-slate-300 dark:text-slate-500">|</span>
            <span>
              Current week: {weekStartDate} to {weekEndDate}
            </span>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <ScoreChip icon={Target} label="This Week" value={`${completedSquares}/${totalTiles}`} />
          <ScoreChip icon={Trophy} label="30-Day Total" value={`${personalPoints} pts`} />
          <ScoreChip
            icon={HeartHandshake}
            label="30-Day Combined"
            value={`${combinedPoints} pts`}
          />
        </div>
      </div>
    </header>
  );
}

function BingoBoardCard({
  weekIndex,
  totalWeeks,
  completionPct,
  customHabitText,
  tileState,
  isPending,
  onTileToggle,
}: {
  weekIndex: number;
  totalWeeks: number;
  completionPct: number;
  customHabitText: string | null;
  tileState: Record<BingoTileId, boolean>;
  isPending: boolean;
  onTileToggle: (tileId: BingoTileId) => void;
}) {
  return (
    <Card className="overflow-hidden border-sky-100 bg-[linear-gradient(180deg,_rgba(255,255,255,0.98),_rgba(248,250,252,0.96))] text-slate-900 shadow-[0_18px_40px_rgba(148,163,184,0.14)] dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50 dark:shadow-none">
      <CardHeader className="border-b border-sky-100/90 bg-[linear-gradient(180deg,_rgba(255,255,255,0.94),_rgba(239,246,255,0.72))] dark:border-slate-800/80 dark:bg-white/5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Grid2x2 className="h-5 w-5 text-sky-600 dark:text-indigo-300" />
              Your 4x4 Bingo Card
            </CardTitle>
            <CardDescription className="text-slate-500 dark:text-slate-400">
              Week {weekIndex} of {totalWeeks}. Every square is worth 1 point per person, and the
              board refreshes every Monday for the next Monday-Sunday window.
            </CardDescription>
          </div>
          <div className="min-w-36 text-right">
            <div className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
              Progress
            </div>
            <div className="mt-1 text-2xl font-semibold">{completionPct}%</div>
          </div>
        </div>
        <Progress className="mt-4 h-2 bg-sky-100 dark:bg-slate-800" value={completionPct} />
      </CardHeader>
      <CardContent className="p-4 sm:p-5">
        <div className="grid gap-3 md:grid-cols-4">
          {flatBingoTileIds.map((tileId) => {
            const tile = BINGO_TILE_DEFINITIONS.find((entry) => entry.id === tileId);
            if (!tile) return null;

            return (
              <BingoTileButton
                key={tileId}
                tileId={tileId}
                title={tile.title}
                subtitle={tile.subtitle}
                checked={tileState[tileId]}
                customHabitText={customHabitText}
                disabled={isPending}
                onToggle={onTileToggle}
              />
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function BingoTileButton({
  tileId,
  title,
  subtitle,
  checked,
  customHabitText,
  disabled,
  onToggle,
}: {
  tileId: BingoTileId;
  title: string;
  subtitle: string | undefined;
  checked: boolean;
  customHabitText: string | null;
  disabled: boolean;
  onToggle: (tileId: BingoTileId) => void;
}) {
  const isCustomHabit = tileId === CUSTOM_HABIT_TILE_ID;

  return (
    <button
      type="button"
      onClick={() => onToggle(tileId)}
      disabled={disabled}
      className={cn(
        'group relative flex min-h-[168px] flex-col justify-between rounded-[22px] border px-4 py-4 text-left transition duration-200',
        checked
          ? 'border-sky-300 bg-[linear-gradient(180deg,_rgba(56,189,248,0.9),_rgba(59,130,246,0.82))] text-white shadow-[0_18px_36px_rgba(59,130,246,0.24)] dark:border-indigo-300 dark:bg-[linear-gradient(180deg,_rgba(129,140,248,0.82),_rgba(59,130,246,0.72))] dark:shadow-[0_18px_36px_rgba(99,102,241,0.32)]'
          : 'border-sky-100 bg-[linear-gradient(180deg,_rgba(255,255,255,0.98),_rgba(241,245,249,0.98))] text-slate-900 shadow-[0_10px_24px_rgba(148,163,184,0.12)] hover:border-sky-200 hover:bg-[linear-gradient(180deg,_rgba(255,255,255,1),_rgba(239,246,255,0.98))] dark:border-slate-700 dark:bg-[linear-gradient(180deg,_rgba(30,41,59,0.9),_rgba(15,23,42,0.96))] dark:text-slate-100 dark:shadow-none dark:hover:border-slate-500 dark:hover:bg-slate-900'
      )}
    >
      <span
        className={cn(
          'text-xs font-semibold uppercase tracking-[0.25em]',
          checked ? 'text-white/80' : 'text-sky-700 dark:text-slate-400'
        )}
      >
        1 PT
      </span>
      <div className="space-y-2">
        <div className="text-[1.05rem] font-semibold leading-tight">{title}</div>
        {subtitle ? (
          <div
            className={cn(
              'text-sm leading-snug',
              checked ? 'text-white/85' : 'text-slate-600 dark:text-slate-300'
            )}
          >
            {subtitle}
          </div>
        ) : null}
        {isCustomHabit && customHabitText ? (
          <div
            className={cn(
              'rounded-xl px-2 py-1 text-xs',
              checked
                ? 'bg-white/15 text-white'
                : 'bg-sky-50 text-slate-700 dark:bg-slate-800 dark:text-slate-200'
            )}
          >
            {customHabitText}
          </div>
        ) : null}
      </div>
      <div
        className={cn(
          'text-xs uppercase tracking-[0.2em]',
          checked ? 'text-white/80' : 'text-slate-500 dark:text-slate-500'
        )}
      >
        {checked ? 'Completed' : 'Tap to check'}
      </div>
    </button>
  );
}

function ScoreChip({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Target;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-sky-200/70 bg-white/72 px-4 py-3 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/5 dark:shadow-none">
      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-300">
        <Icon className="h-4 w-4 text-sky-600 dark:text-indigo-200" />
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">{value}</div>
    </div>
  );
}

function RuleLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-border/60 bg-background/70 px-3 py-2">
      <span className="font-medium text-foreground">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  );
}

function MetricRow({
  label,
  value,
  strong = false,
}: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-muted/40 px-3 py-2">
      <span className={cn('text-muted-foreground', strong && 'font-semibold text-foreground')}>
        {label}
      </span>
      <span className={cn('font-medium', strong && 'text-lg')}>{value}</span>
    </div>
  );
}

function PartnerMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/80 px-3 py-2 shadow-sm dark:bg-background dark:shadow-none">
      <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{label}</div>
      <div className="mt-1 text-xl font-semibold">{value}</div>
    </div>
  );
}
