'use client';

import type { ChristmasTreeSnapshot } from '@/hooks/useChristmasTree';
import {
  useChristmasTree,
  useChristmasTreeRealtime,
  usePlaceChristmasOrnament,
  useUpsertChristmasWish,
} from '@/hooks/useChristmasTree';
import { CHRISTMAS_ORNAMENT_ASSETS } from '@/lib/schemas/christmas-tree.schema';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Skeleton,
  Textarea,
  cn,
} from '@hr-portal/ui';
import { Gift, LockKeyhole, Maximize, Minimize, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';

const ornamentColors: Record<(typeof CHRISTMAS_ORNAMENT_ASSETS)[number], string> = {
  red: 'bg-red-600 ring-red-200',
  gold: 'bg-amber-400 ring-amber-200',
  silver: 'bg-slate-300 ring-slate-100',
  green: 'bg-emerald-600 ring-emerald-200',
  blue: 'bg-sky-600 ring-sky-200',
  pearl: 'bg-stone-100 ring-stone-300',
  burgundy: 'bg-rose-950 ring-rose-200',
  champagne: 'bg-yellow-200 ring-yellow-100',
};

const categoryDetails = {
  personal: {
    title: 'Personal Wish',
    description: 'Share your three wishes for yourself.',
    count: 3,
  },
  for_others: { title: 'Wish for Others', description: 'Share a wish for someone else.', count: 1 },
  for_sn: { title: 'Wish for SN', description: 'Share a wish for SN and the team.', count: 1 },
} as const;

type Ornament = ChristmasTreeSnapshot['ornaments'][number];
type WishCategory = keyof typeof categoryDetails;

export default function ChristmasTreePage() {
  const { data, isLoading, error } = useChristmasTree();
  const placeOrnament = usePlaceChristmasOrnament();
  const upsertWish = useUpsertChristmasWish();
  const [selectedOrnament, setSelectedOrnament] = useState<Ornament | null>(null);
  const [isPresentationMode, setIsPresentationMode] = useState(false);
  const realtimeStatus = useChristmasTreeRealtime(true);

  useEffect(() => {
    const handleFullscreenChange = () => setIsPresentationMode(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  if (isLoading) return <ChristmasTreeLoading />;
  if (!data)
    return <ChristmasTreeError message={error?.message ?? 'Unable to load the Christmas Tree.'} />;

  const mutationError = placeOrnament.error?.message ?? upsertWish.error?.message;
  const togglePresentationMode = async () => {
    if (isPresentationMode) {
      if (document.fullscreenElement) await document.exitFullscreen();
      setIsPresentationMode(false);
      return;
    }
    setIsPresentationMode(true);
    try {
      await document.documentElement.requestFullscreen();
    } catch {
      // Presentation mode remains usable when the browser blocks fullscreen.
    }
  };

  if (isPresentationMode) {
    return (
      <div className="h-full bg-[#f4f7ef] p-4 dark:bg-emerald-950">
        <div className="mx-auto flex h-full max-w-7xl flex-col gap-3">
          <div className="flex items-center justify-between px-2">
            <h1 className="text-lg font-semibold text-emerald-950 dark:text-emerald-50">
              {data.event.title}
            </h1>
            <div className="flex items-center gap-2">
              <RealtimeIndicator status={realtimeStatus} />
              <Button
                aria-label="Exit fullscreen presentation"
                onClick={() => void togglePresentationMode()}
                size="icon"
                variant="ghost"
              >
                <Minimize />
              </Button>
            </div>
          </div>
          <ChristmasTreeCanvas
            decoration={data.decoration}
            fillHeight
            ornaments={data.ornaments}
            onSelect={setSelectedOrnament}
          />
          <OrnamentDialog
            ornament={selectedOrnament}
            onOpenChange={(open) => !open && setSelectedOrnament(null)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-8">
      <header className="flex flex-col justify-between gap-4 border-b border-emerald-900/15 pb-5 sm:flex-row sm:items-end">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-300">
            <Sparkles className="h-4 w-4" /> SN Holiday Activity
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
            {data.event.title}
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            A shared tree that comes to life as the team adds their wishes.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <RealtimeIndicator status={realtimeStatus} />
          <Button onClick={() => void togglePresentationMode()} size="sm" variant="outline">
            <Maximize /> Present tree
          </Button>
          <MilestoneBadges decoration={data.decoration} />
        </div>
      </header>

      {mutationError ? <ChristmasTreeError message={mutationError} /> : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_380px]">
        <ChristmasTreeCanvas
          decoration={data.decoration}
          ornaments={data.ornaments}
          onSelect={setSelectedOrnament}
        />
        <section className="space-y-6">
          {!data.myOrnament ? (
            <OrnamentPicker
              isPending={placeOrnament.isPending}
              onSelect={(assetType) => placeOrnament.mutate({ assetType })}
            />
          ) : (
            <WishPanel data={data} isPending={upsertWish.isPending} onSave={upsertWish.mutate} />
          )}
        </section>
      </div>

      <OrnamentDialog
        ornament={selectedOrnament}
        onOpenChange={(open) => !open && setSelectedOrnament(null)}
      />
    </div>
  );
}

function ChristmasTreeCanvas({
  decoration,
  ornaments,
  onSelect,
  fillHeight = false,
}: {
  decoration: ChristmasTreeSnapshot['decoration'];
  ornaments: Array<Ornament>;
  onSelect: (ornament: Ornament) => void;
  fillHeight?: boolean;
}) {
  return (
    <section
      className={cn(
        'relative min-h-[500px] overflow-hidden rounded-xl border border-emerald-950/15 bg-[#f4f7ef] shadow-sm sm:min-h-[550px] dark:bg-emerald-950/20',
        fillHeight && 'flex-1'
      )}
    >
      <div className="absolute inset-x-0 top-0 h-36 bg-[radial-gradient(circle_at_top_left,rgba(253,230,138,.42),transparent_62%)]" />
      <div className="absolute inset-x-5 bottom-16 top-7 sm:inset-x-12 sm:bottom-20 sm:top-8">
        <div className="relative mx-auto h-full w-full max-w-[640px]">
          <svg
            aria-hidden="true"
            className="absolute inset-0 h-full w-full drop-shadow-[0_16px_18px_rgba(6,78,59,.14)]"
            preserveAspectRatio="none"
            viewBox="0 0 100 100"
          >
            <ellipse cx="50" cy="94" fill="rgba(6,78,59,.10)" rx="39" ry="3" />
            <path d="M46.5 81h7v13h-7z" fill="#78350f" />
            <path d="M50 37 C41 48 24 68 7 84 Q50 79 93 84 C76 68 59 48 50 37Z" fill="#064e3b" />
            <path d="M50 22 C43 31 29 49 13 68 Q50 63 87 68 C71 49 57 31 50 22Z" fill="#06694f" />
            <path d="M50 7 C45 15 32 34 17 55 Q50 51 83 55 C68 34 55 15 50 7Z" fill="#078662" />
          </svg>
          {decoration?.garland_unlocked ? (
            <div className="pointer-events-none absolute left-[17%] right-[17%] top-[44%] h-[13%] rotate-2 rounded-b-[50%] border-b-4 border-amber-300 drop-shadow-sm" />
          ) : null}
          {decoration?.lights_unlocked ? (
            <div className="pointer-events-none absolute left-[10%] right-[10%] top-[59%] h-[12%] -rotate-2 rounded-b-[50%] border-b-4 border-yellow-200 shadow-[0_5px_14px_rgba(253,224,71,.9)]" />
          ) : null}
          {decoration?.star_unlocked ? (
            <Sparkles className="absolute left-1/2 top-[2%] z-20 h-12 w-12 -translate-x-1/2 -translate-y-1/2 fill-amber-300 text-amber-400 drop-shadow" />
          ) : null}
          {ornaments.map((ornament) => (
            <button
              aria-label={`Open ${ornament.ownerName}'s Christmas ball`}
              title={`${ornament.ownerName} · ${ornament.wishes.length} ${ornament.wishes.length === 1 ? 'wish' : 'wishes'}`}
              className={cn(
                'group absolute z-10 grid h-10 w-10 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 border-white/90 shadow-md transition before:absolute before:bottom-full before:left-1/2 before:h-3 before:w-px before:-translate-x-1/2 before:bg-amber-700 after:absolute after:-top-1.5 after:left-1/2 after:h-2 after:w-4 after:-translate-x-1/2 after:rounded-t-sm after:bg-amber-500 hover:z-30 hover:scale-110 focus-visible:z-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2',
                ornamentColors[ornament.assetType as keyof typeof ornamentColors]
              )}
              key={ornament.id}
              onClick={() => onSelect(ornament)}
              style={{ left: `${ornament.positionX}%`, top: `${ornament.positionY}%` }}
              type="button"
            >
              <span className="h-2 w-2 rounded-full bg-white/80" />
              {ornament.wishes.length ? (
                <span className="absolute -bottom-2 -right-2 grid h-5 min-w-5 place-items-center rounded-full border-2 border-white bg-emerald-950 px-1 text-[10px] font-semibold leading-none text-white shadow-sm">
                  {ornament.wishes.length}
                </span>
              ) : null}
              <span className="pointer-events-none absolute left-1/2 top-[calc(100%+0.75rem)] w-max max-w-40 -translate-x-1/2 rounded-md bg-emerald-950 px-2 py-1 text-center text-[11px] font-medium leading-tight text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                {ornament.ownerName}
                <span className="mt-0.5 block font-normal text-emerald-100">
                  {ornament.wishes.length
                    ? `${ornament.wishes.length} ${ornament.wishes.length === 1 ? 'wish' : 'wishes'}`
                    : 'No wishes yet'}
                </span>
              </span>
            </button>
          ))}
        </div>
      </div>
      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-4 border-t border-emerald-950/10 bg-white/80 px-4 py-3 text-sm text-emerald-950 backdrop-blur-sm sm:px-5 dark:bg-zinc-950/70 dark:text-emerald-50">
        <span>
          <span className="font-medium">{ornaments.length} team members</span> have placed a
          Christmas ball.
        </span>
        {ornaments.length ? (
          <span className="hidden text-xs text-muted-foreground sm:inline">
            Select a ball to read its wishes
          </span>
        ) : null}
      </div>
    </section>
  );
}

function OrnamentPicker({
  isPending,
  onSelect,
}: {
  isPending: boolean;
  onSelect: (assetType: (typeof CHRISTMAS_ORNAMENT_ASSETS)[number]) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Choose your Christmas ball</CardTitle>
        <CardDescription>Your name is added from your Control Hub profile.</CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-4 gap-3">
        {CHRISTMAS_ORNAMENT_ASSETS.map((assetType) => (
          <button
            aria-label={`Place ${assetType} Christmas ball`}
            className={cn(
              'aspect-square rounded-full border-4 border-white shadow ring-2 transition hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 disabled:opacity-50',
              ornamentColors[assetType]
            )}
            disabled={isPending}
            key={assetType}
            onClick={() => onSelect(assetType)}
            type="button"
          />
        ))}
      </CardContent>
    </Card>
  );
}

function WishPanel({
  data,
  isPending,
  onSave,
}: {
  data: ChristmasTreeSnapshot;
  isPending: boolean;
  onSave: (payload: { category: WishCategory; itemNumber: number; content: string }) => void;
}) {
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  useEffect(() => {
    setDrafts(
      Object.fromEntries(
        data.ornaments
          .find((ornament) => ornament.id === data.myOrnament?.id)
          ?.wishes.map((wish) => [`${wish.category}-${wish.item_number}`, wish.content]) ?? []
      )
    );
  }, [data]);
  return (
    <Card className="overflow-hidden border-emerald-950/15 shadow-sm">
      <CardHeader className="border-b border-emerald-950/10 bg-emerald-50/60 dark:bg-emerald-950/20">
        <CardTitle className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-red-600 ring-2 ring-red-100" />
          Your Christmas Wishes
        </CardTitle>
        <CardDescription>
          Wishes become visible to the team as soon as you submit them.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {(Object.keys(categoryDetails) as Array<WishCategory>).map((category) => {
          const detail = categoryDetails[category];
          const state = getCategoryState(data, category);
          return (
            <section className="space-y-3" key={category}>
              <div>
                <h2 className="font-medium">{detail.title}</h2>
                <p className="text-sm text-muted-foreground">{detail.description}</p>
              </div>
              {!state.isUnlocked ? (
                <div className="flex items-center gap-2 rounded-md border border-dashed p-3 text-sm text-muted-foreground">
                  <LockKeyhole className="h-4 w-4" />
                  {state.teaser}
                </div>
              ) : (
                Array.from({ length: detail.count }, (_, index) => {
                  const itemNumber = index + 1;
                  const key = `${category}-${itemNumber}`;
                  return (
                    <div className="space-y-2" key={key}>
                      <Textarea
                        disabled={!state.isEditable || isPending}
                        maxLength={500}
                        onChange={(event) =>
                          setDrafts((current) => ({ ...current, [key]: event.target.value }))
                        }
                        placeholder={
                          detail.count > 1 ? `Personal wish ${itemNumber}` : 'Write your wish'
                        }
                        showCounter={false}
                        value={drafts[key] ?? ''}
                      />
                      <Button
                        disabled={!state.isEditable || isPending || !(drafts[key] ?? '').trim()}
                        onClick={() =>
                          onSave({ category, itemNumber, content: (drafts[key] ?? '').trim() })
                        }
                        size="sm"
                        type="button"
                      >
                        Save wish
                      </Button>
                      {!state.isEditable ? (
                        <p className="text-xs text-muted-foreground">{state.teaser}</p>
                      ) : null}
                    </div>
                  );
                })
              )}
            </section>
          );
        })}
      </CardContent>
    </Card>
  );
}

function OrnamentDialog({
  ornament,
  onOpenChange,
}: { ornament: Ornament | null; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog onOpenChange={onOpenChange} open={Boolean(ornament)}>
      <DialogContent>
        <DialogHeader>
          <div className="flex items-center gap-3 pr-6">
            {ornament ? (
              <span
                aria-hidden="true"
                className={cn(
                  'relative grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 border-white shadow ring-2 after:absolute after:-top-1.5 after:left-1/2 after:h-2 after:w-3 after:-translate-x-1/2 after:rounded-t-sm after:bg-amber-500',
                  ornamentColors[ornament.assetType as keyof typeof ornamentColors]
                )}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-white/80" />
              </span>
            ) : null}
            <div>
              <DialogTitle>{ornament?.ownerName ?? 'Team member'}'s Christmas Wishes</DialogTitle>
              <DialogDescription>Wishes attached to this Christmas ball.</DialogDescription>
            </div>
          </div>
        </DialogHeader>
        {ornament ? (
          <div className="space-y-4">
            {ornament.wishes.length ? (
              ornament.wishes.map((wish) => (
                <div className="rounded-md border p-3" key={`${wish.category}-${wish.item_number}`}>
                  <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">
                    {categoryDetails[wish.category].title}
                  </p>
                  <p className="text-sm">{wish.content}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No wishes are available yet.</p>
            )}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function MilestoneBadges({ decoration }: { decoration: ChristmasTreeSnapshot['decoration'] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {[
        ['Garland', decoration?.garland_unlocked],
        ['Lights', decoration?.lights_unlocked],
        ['Tree star', decoration?.star_unlocked],
      ].map(([label, unlocked]) => (
        <Badge
          className={unlocked ? 'bg-emerald-700 text-white' : ''}
          key={String(label)}
          variant={unlocked ? 'default' : 'secondary'}
        >
          {unlocked ? <Gift className="mr-1 h-3 w-3" /> : <LockKeyhole className="mr-1 h-3 w-3" />}
          {label}
        </Badge>
      ))}
    </div>
  );
}

function RealtimeIndicator({ status }: { status: ReturnType<typeof useChristmasTreeRealtime> }) {
  const label =
    status === 'connected'
      ? 'Live updates on'
      : status === 'connecting'
        ? 'Connecting'
        : status === 'fallback'
          ? 'Refreshing every 30 seconds'
          : 'Refresh to update';
  return <Badge variant="secondary">{label}</Badge>;
}

function ChristmasTreeLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-24" />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_380px]">
        <Skeleton className="h-[580px]" />
        <Skeleton className="h-[420px]" />
      </div>
    </div>
  );
}
function ChristmasTreeError({ message }: { message: string }) {
  return (
    <Card className="border-rose-200 bg-rose-50 text-rose-900">
      <CardContent className="py-4 text-sm">{message}</CardContent>
    </Card>
  );
}

function getCategoryState(data: ChristmasTreeSnapshot, category: WishCategory) {
  const state = data.event.categories[category];
  if (!state) throw new Error(`Missing Christmas wish category state: ${category}`);
  return state;
}
