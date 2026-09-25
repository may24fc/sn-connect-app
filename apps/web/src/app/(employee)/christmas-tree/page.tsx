'use client';

import type { ChristmasTreeSnapshot } from '@/hooks/useChristmasTree';
import {
  useChristmasTree,
  useChristmasTreeRealtime,
  useDeleteChristmasOrnament,
  useDeleteChristmasWish,
  useMoveChristmasOrnament,
  usePlaceChristmasOrnament,
  useUpsertChristmasWish,
} from '@/hooks/useChristmasTree';
import {
  CHRISTMAS_ORNAMENT_ASSETS,
  type ChristmasOrnamentPlacementInput,
} from '@/lib/schemas/christmas-tree.schema';
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  cn,
} from '@hr-portal/ui';
import { Gift, LockKeyhole, Maximize, Minimize, Sparkles, Trash2 } from 'lucide-react';
import {
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  useEffect,
  useRef,
  useState,
} from 'react';

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
type OrnamentAsset = (typeof CHRISTMAS_ORNAMENT_ASSETS)[number];

const snowflakes = Array.from({ length: 36 }, (_, index) => ({
  id: index,
  left: (index * 29 + 7) % 100,
  size: 3 + ((index * 7) % 6),
  delay: -((index * 0.73) % 9),
  duration: 7 + ((index * 11) % 8),
  drift: -28 + ((index * 17) % 57),
  opacity: 0.35 + ((index * 13) % 45) / 100,
}));

export default function ChristmasTreePage() {
  const { data, isLoading, error } = useChristmasTree();
  const placeOrnament = usePlaceChristmasOrnament();
  const moveOrnament = useMoveChristmasOrnament();
  const deleteOrnament = useDeleteChristmasOrnament();
  const upsertWish = useUpsertChristmasWish();
  const deleteWish = useDeleteChristmasWish();
  const [selectedOrnament, setSelectedOrnament] = useState<Ornament | null>(null);
  const [selectedAssetType, setSelectedAssetType] = useState<OrnamentAsset | null>(null);
  const [isDraggingNewBall, setIsDraggingNewBall] = useState(false);
  const [newBallDragStart, setNewBallDragStart] = useState<{
    clientX: number;
    clientY: number;
  } | null>(null);
  const [placementMessage, setPlacementMessage] = useState<string | null>(null);
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

  const mutationError =
    placeOrnament.error?.message ??
    moveOrnament.error?.message ??
    upsertWish.error?.message ??
    deleteWish.error?.message;
  const deleteOrnamentError = deleteOrnament.error?.message;
  const handlePlaceOrnament = (assetType: OrnamentAsset, positionX: number, positionY: number) => {
    setPlacementMessage(null);
    setSelectedAssetType(null);
    setIsDraggingNewBall(false);
    setNewBallDragStart(null);
    placeOrnament.mutate({ assetType, positionX, positionY });
  };
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
            isRemoving={deleteOrnament.isPending}
            isUsersOrnament={selectedOrnament?.id === data.myOrnament?.id}
            ornament={selectedOrnament}
            onOpenChange={(open) => !open && setSelectedOrnament(null)}
            onRemove={() =>
              deleteOrnament.mutate(undefined, { onSuccess: () => setSelectedOrnament(null) })
            }
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

      {(mutationError ?? deleteOrnamentError ?? placementMessage) ? (
        <ChristmasTreeError
          message={mutationError ?? deleteOrnamentError ?? placementMessage ?? ''}
        />
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_380px]">
        <ChristmasTreeCanvas
          decoration={data.decoration}
          isDraggingNewBall={isDraggingNewBall}
          isMovePending={moveOrnament.isPending || placeOrnament.isPending}
          isPlacementPending={placeOrnament.isPending}
          ornaments={data.ornaments}
          onInvalidPlacement={() =>
            setPlacementMessage('Drop your Christmas ball on the green branches.')
          }
          onNewBallDragEnd={() => {
            setIsDraggingNewBall(false);
            setNewBallDragStart(null);
          }}
          onPlace={handlePlaceOrnament}
          onMove={(positionX, positionY) => moveOrnament.mutate({ positionX, positionY })}
          onSelect={setSelectedOrnament}
          placementAssetType={data.myOrnament ? null : selectedAssetType}
          newBallDragStart={newBallDragStart}
          usersOrnamentId={
            data.myOrnament && !data.myOrnament.id.startsWith('optimistic-ornament-')
              ? data.myOrnament.id
              : null
          }
        />
        <section className="space-y-6">
          {!data.myOrnament ? (
            <OrnamentPicker
              isPending={placeOrnament.isPending}
              onBeginDrag={(assetType, clientX, clientY) => {
                setSelectedAssetType(assetType);
                setNewBallDragStart({ clientX, clientY });
                setIsDraggingNewBall(true);
              }}
              onSelect={setSelectedAssetType}
              selectedAssetType={selectedAssetType}
            />
          ) : (
            <WishPanel
              data={data}
              isDeleting={deleteWish.isPending}
              isPending={upsertWish.isPending}
              onDelete={deleteWish.mutate}
              onSave={upsertWish.mutate}
            />
          )}
        </section>
      </div>

      <OrnamentDialog
        isRemoving={deleteOrnament.isPending}
        isUsersOrnament={selectedOrnament?.id === data.myOrnament?.id}
        ornament={selectedOrnament}
        onOpenChange={(open) => !open && setSelectedOrnament(null)}
        onRemove={() =>
          deleteOrnament.mutate(undefined, { onSuccess: () => setSelectedOrnament(null) })
        }
      />
    </div>
  );
}

function ChristmasTreeCanvas({
  decoration,
  ornaments,
  onSelect,
  fillHeight = false,
  placementAssetType,
  newBallDragStart,
  isDraggingNewBall = false,
  isPlacementPending = false,
  isMovePending = false,
  onPlace,
  onMove,
  onInvalidPlacement,
  onNewBallDragEnd,
  usersOrnamentId = null,
}: {
  decoration: ChristmasTreeSnapshot['decoration'];
  ornaments: Array<Ornament>;
  onSelect: (ornament: Ornament) => void;
  fillHeight?: boolean;
  placementAssetType?: OrnamentAsset | null;
  newBallDragStart?: { clientX: number; clientY: number } | null;
  isDraggingNewBall?: boolean;
  isPlacementPending?: boolean;
  isMovePending?: boolean;
  onPlace?: (assetType: OrnamentAsset, positionX: number, positionY: number) => void;
  onMove?: (positionX: number, positionY: number) => void;
  onInvalidPlacement?: () => void;
  onNewBallDragEnd?: () => void;
  usersOrnamentId?: string | null;
}) {
  const treeRef = useRef<HTMLDivElement>(null);
  const [previewPosition, setPreviewPosition] = useState<{
    assetType: OrnamentAsset;
    positionX: number;
    positionY: number;
  } | null>(null);
  const movingOrnamentRef = useRef<{
    ornament: Ornament;
    pointerId: number;
    startClientX: number;
    startClientY: number;
    hasMoved: boolean;
    position: Pick<ChristmasOrnamentPlacementInput, 'positionX' | 'positionY'> | null;
  } | null>(null);
  const [movingOrnamentId, setMovingOrnamentId] = useState<string | null>(null);
  const canPlace = Boolean(onPlace && !isPlacementPending);
  const canMove = Boolean(onMove && !isMovePending);

  useEffect(() => {
    if (!(placementAssetType || movingOrnamentRef.current)) setPreviewPosition(null);
  }, [placementAssetType]);

  const placeAtClientPoint = (assetType: OrnamentAsset, clientX: number, clientY: number) => {
    const position = getChristmasTreeDropPosition(treeRef.current, clientX, clientY);
    if (!position) {
      onInvalidPlacement?.();
      return;
    }
    onPlace?.(assetType, position.positionX, position.positionY);
  };

  const updateNewBallPreview = (clientX: number, clientY: number) => {
    if (!placementAssetType) return;
    const position = getChristmasTreeDropPosition(treeRef.current, clientX, clientY);
    setPreviewPosition(position ? { assetType: placementAssetType, ...position } : null);
  };

  const beginMovingOrnament = (event: ReactPointerEvent<HTMLButtonElement>, ornament: Ornament) => {
    if (!(ornament.id === usersOrnamentId && canMove)) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    movingOrnamentRef.current = {
      ornament,
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      hasMoved: false,
      position: { positionX: Number(ornament.positionX), positionY: Number(ornament.positionY) },
    };
    setMovingOrnamentId(ornament.id);
  };

  const moveExistingOrnament = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const moving = movingOrnamentRef.current;
    if (!moving || moving.pointerId !== event.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    const position = getChristmasTreeDropPosition(treeRef.current, event.clientX, event.clientY);
    const hasMoved =
      moving.hasMoved ||
      Math.hypot(event.clientX - moving.startClientX, event.clientY - moving.startClientY) > 4;
    movingOrnamentRef.current = { ...moving, hasMoved, position };
    setPreviewPosition(
      position ? { assetType: moving.ornament.assetType as OrnamentAsset, ...position } : null
    );
  };

  const finishMovingOrnament = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const moving = movingOrnamentRef.current;
    if (!moving || moving.pointerId !== event.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (moving.hasMoved) {
      if (moving.position) onMove?.(moving.position.positionX, moving.position.positionY);
      else onInvalidPlacement?.();
    } else {
      onSelect(moving.ornament);
    }
    movingOrnamentRef.current = null;
    setMovingOrnamentId(null);
    setPreviewPosition(null);
  };

  const cancelMovingOrnament = () => {
    movingOrnamentRef.current = null;
    setMovingOrnamentId(null);
    setPreviewPosition(null);
  };

  useEffect(() => {
    if (!(isDraggingNewBall && placementAssetType && canPlace && newBallDragStart)) return;

    let hasMoved = false;

    const handlePointerMove = (event: PointerEvent) => {
      hasMoved =
        hasMoved ||
        Math.hypot(
          event.clientX - newBallDragStart.clientX,
          event.clientY - newBallDragStart.clientY
        ) > 4;
      if (!hasMoved) return;
      const position = getChristmasTreeDropPosition(treeRef.current, event.clientX, event.clientY);
      setPreviewPosition(position ? { assetType: placementAssetType, ...position } : null);
    };
    const handlePointerUp = (event: PointerEvent) => {
      if (hasMoved) {
        const position = getChristmasTreeDropPosition(
          treeRef.current,
          event.clientX,
          event.clientY
        );
        if (position) onPlace?.(placementAssetType, position.positionX, position.positionY);
        else onInvalidPlacement?.();
      }
      setPreviewPosition(null);
      onNewBallDragEnd?.();
    };
    const handlePointerCancel = () => {
      setPreviewPosition(null);
      onNewBallDragEnd?.();
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerCancel);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerCancel);
    };
  }, [
    canPlace,
    isDraggingNewBall,
    newBallDragStart,
    onInvalidPlacement,
    onNewBallDragEnd,
    onPlace,
    placementAssetType,
  ]);

  return (
    <section
      className={cn(
        'relative min-h-[500px] overflow-hidden rounded-xl border border-slate-950/20 bg-[linear-gradient(180deg,#527586_0%,#6f919d_55%,#91aab2_100%)] shadow-sm sm:min-h-[550px]',
        fillHeight && 'flex-1'
      )}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(253,230,138,.12),transparent_58%)]" />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-12 h-28 overflow-hidden"
      >
        <div className="absolute -inset-x-8 -bottom-12 h-28 rounded-[50%] bg-[linear-gradient(180deg,rgba(255,255,255,.92)_0%,rgba(235,244,245,.84)_58%,rgba(208,225,229,.68)_100%)] shadow-[0_-12px_30px_rgba(255,255,255,.28)]" />
        <div className="absolute left-[8%] top-7 h-10 w-[46%] rounded-full bg-white/35 blur-xl" />
        <div className="absolute right-[5%] top-10 h-8 w-[38%] rounded-full bg-white/25 blur-xl" />
      </div>
      <div className="absolute inset-x-5 bottom-16 top-7 sm:inset-x-12 sm:bottom-20 sm:top-8">
        <div
          className={cn(
            'relative mx-auto h-full w-full max-w-[640px] touch-none transition',
            canPlace && placementAssetType && 'cursor-crosshair'
          )}
          onClick={(event) => {
            if (placementAssetType && canPlace) {
              placeAtClientPoint(placementAssetType, event.clientX, event.clientY);
            }
          }}
          onKeyDown={(event) => {
            if (!(placementAssetType && canPlace) || !['Enter', ' '].includes(event.key)) return;
            event.preventDefault();
            const rect = event.currentTarget.getBoundingClientRect();
            placeAtClientPoint(
              placementAssetType,
              rect.left + rect.width / 2,
              rect.top + rect.height / 2
            );
          }}
          onPointerLeave={() => {
            if (!movingOrnamentRef.current) setPreviewPosition(null);
          }}
          onPointerMove={(event) => {
            if (!movingOrnamentRef.current) updateNewBallPreview(event.clientX, event.clientY);
          }}
          ref={treeRef}
          role={placementAssetType && canPlace ? 'button' : undefined}
          tabIndex={placementAssetType && canPlace ? 0 : undefined}
        >
          <svg
            aria-hidden="true"
            className="absolute inset-0 h-full w-full drop-shadow-[0_16px_18px_rgba(6,78,59,.14)]"
            preserveAspectRatio="none"
            viewBox="0 0 100 100"
          >
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
              aria-label={
                ornament.id === usersOrnamentId
                  ? 'Open or move your Christmas ball'
                  : `Open ${ornament.ownerName}'s Christmas ball`
              }
              title={`${ornament.ownerName} · ${ornament.wishes.length} ${ornament.wishes.length === 1 ? 'wish' : 'wishes'}`}
              className={cn(
                'group absolute z-10 grid h-10 w-10 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 border-white/90 shadow-md transition before:absolute before:bottom-full before:left-1/2 before:h-3 before:w-px before:-translate-x-1/2 before:bg-amber-700 after:absolute after:-top-1.5 after:left-1/2 after:h-2 after:w-4 after:-translate-x-1/2 after:rounded-t-sm after:bg-amber-500 hover:z-30 hover:scale-110 focus-visible:z-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2',
                ornament.id === usersOrnamentId &&
                  canMove &&
                  'touch-none cursor-grab active:cursor-grabbing',
                movingOrnamentId === ornament.id && 'opacity-25',
                ornamentColors[ornament.assetType as keyof typeof ornamentColors]
              )}
              key={ornament.id}
              onClick={(event) => {
                event.stopPropagation();
                if (ornament.id !== usersOrnamentId || event.detail === 0) onSelect(ornament);
              }}
              onPointerCancel={cancelMovingOrnament}
              onPointerDown={(event) => beginMovingOrnament(event, ornament)}
              onPointerMove={moveExistingOrnament}
              onPointerUp={finishMovingOrnament}
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
                  {ornament.id === usersOrnamentId
                    ? 'Drag to move · Click to open'
                    : ornament.wishes.length
                      ? `${ornament.wishes.length} ${ornament.wishes.length === 1 ? 'wish' : 'wishes'}`
                      : 'No wishes yet'}
                </span>
              </span>
            </button>
          ))}
          {previewPosition ? (
            <div
              aria-hidden="true"
              className={cn(
                'pointer-events-none absolute z-40 grid h-10 w-10 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 border-white/80 opacity-55 shadow-lg ring-2 ring-amber-300 after:absolute after:-top-1.5 after:left-1/2 after:h-2 after:w-4 after:-translate-x-1/2 after:rounded-t-sm after:bg-amber-500',
                ornamentColors[previewPosition.assetType]
              )}
              style={{
                left: `${previewPosition.positionX}%`,
                top: `${previewPosition.positionY}%`,
              }}
            >
              <span className="h-2 w-2 rounded-full bg-white/80" />
            </div>
          ) : null}
        </div>
      </div>
      <Snowfall />
      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-4 border-t border-emerald-950/10 bg-[rgba(244,248,247,.92)] px-4 py-3 text-sm text-emerald-950 backdrop-blur-sm sm:px-5 dark:bg-zinc-950/70 dark:text-emerald-50">
        <span>
          <span className="font-medium">{ornaments.length} team members</span> have placed a
          Christmas ball.
        </span>
        {ornaments.length ? (
          <span className="hidden text-xs text-muted-foreground sm:inline">
            Select a ball to read; drag your own ball to move it
          </span>
        ) : null}
      </div>
      {placementAssetType ? (
        <div className="absolute inset-x-4 bottom-14 z-20 rounded-md bg-emerald-950/90 px-3 py-2 text-center text-xs font-medium text-white shadow-sm sm:inset-x-auto sm:right-5">
          Your {placementAssetType} ball is selected. Move over the tree to preview it, then release
          or click to place it.
        </div>
      ) : null}
    </section>
  );
}

function OrnamentPicker({
  isPending,
  onBeginDrag,
  onSelect,
  selectedAssetType,
}: {
  isPending: boolean;
  onBeginDrag: (assetType: OrnamentAsset, clientX: number, clientY: number) => void;
  onSelect: (assetType: OrnamentAsset) => void;
  selectedAssetType: OrnamentAsset | null;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Place your Christmas ball</CardTitle>
        <CardDescription>
          Drag a ball onto an open spot on the tree. You can also select one, then click the
          branches.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-4 gap-3">
        {CHRISTMAS_ORNAMENT_ASSETS.map((assetType) => (
          <button
            aria-label={`Place ${assetType} Christmas ball`}
            className={cn(
              'aspect-square touch-none cursor-grab rounded-full border-4 border-white shadow ring-2 transition hover:scale-105 active:cursor-grabbing focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 disabled:cursor-not-allowed disabled:opacity-50',
              selectedAssetType === assetType && 'scale-105 ring-amber-400 ring-offset-2',
              ornamentColors[assetType]
            )}
            disabled={isPending}
            key={assetType}
            onClick={() => onSelect(assetType)}
            onPointerDown={(event) => {
              if (event.button !== 0) return;
              event.preventDefault();
              onBeginDrag(assetType, event.clientX, event.clientY);
            }}
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
  isDeleting,
  onSave,
  onDelete,
}: {
  data: ChristmasTreeSnapshot;
  isPending: boolean;
  isDeleting: boolean;
  onSave: (payload: { category: WishCategory; itemNumber: number; content: string }) => void;
  onDelete: (payload: { category: WishCategory; itemNumber: number }) => void;
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
  const myWishes =
    data.ornaments.find((ornament) => ornament.id === data.myOrnament?.id)?.wishes ?? [];
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
                  const hasDraft = Boolean(drafts[key]?.trim());
                  const savedWish = myWishes.find(
                    (wish) => wish.category === category && wish.item_number === itemNumber
                  );
                  return (
                    <div className="space-y-2" key={key}>
                      <Textarea
                        disabled={!state.isEditable || isPending || isDeleting}
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
                      <div className="flex flex-wrap gap-2">
                        <Button
                          disabled={!state.isEditable || isPending || isDeleting || !hasDraft}
                          onClick={() =>
                            onSave({ category, itemNumber, content: (drafts[key] ?? '').trim() })
                          }
                          size="sm"
                          type="button"
                        >
                          {savedWish ? 'Save changes' : 'Save wish'}
                        </Button>
                        {savedWish ? (
                          <Button
                            disabled={!state.isEditable || isPending || isDeleting}
                            onClick={() => onDelete({ category, itemNumber })}
                            size="sm"
                            type="button"
                            variant="ghost"
                          >
                            <Trash2 className="mr-1.5 h-4 w-4" />
                            Remove
                          </Button>
                        ) : null}
                      </div>
                      {savedWish && state.isEditable ? (
                        <p className="text-xs text-muted-foreground">
                          Removing it hides the wish from the tree; you can add a new one while this
                          window is open.
                        </p>
                      ) : null}
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
  isUsersOrnament,
  isRemoving,
  onRemove,
}: {
  ornament: Ornament | null;
  onOpenChange: (open: boolean) => void;
  isUsersOrnament: boolean;
  isRemoving: boolean;
  onRemove: () => void;
}) {
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
            {isUsersOrnament ? (
              <div className="border-t pt-4">
                <Button disabled={isRemoving} onClick={onRemove} type="button" variant="outline">
                  <Trash2 className="mr-2 h-4 w-4" />
                  {isRemoving ? 'Removing…' : 'Remove my Christmas ball'}
                </Button>
                <p className="mt-2 text-xs text-muted-foreground">
                  This removes your ball and its visible wishes from the tree. You can place a new
                  ball afterward.
                </p>
              </div>
            ) : null}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function MilestoneBadges({ decoration }: { decoration: ChristmasTreeSnapshot['decoration'] }) {
  const activeParticipantCount = Number(decoration?.active_participant_count ?? 0);
  const milestones = [
    {
      label: 'Garland',
      unlocked: decoration?.garland_unlocked,
      completed: Number(decoration?.october_complete_count ?? 0),
      requirement: 'every active team member submits their three Personal Wishes',
    },
    {
      label: 'Lights',
      unlocked: decoration?.lights_unlocked,
      completed: Number(decoration?.november_complete_count ?? 0),
      requirement: 'every active team member submits a Wish for Others',
    },
    {
      label: 'Tree star',
      unlocked: decoration?.star_unlocked,
      completed: Number(decoration?.december_complete_count ?? 0),
      requirement: 'every active team member submits a Wish for SN',
    },
  ];

  return (
    <TooltipProvider delayDuration={150}>
      <div className="flex flex-wrap gap-2">
        {milestones.map((milestone) => {
          const progress = `${milestone.completed}/${activeParticipantCount}`;
          const tooltip = milestone.unlocked
            ? `Unlocked — ${progress} team members completed this milestone.`
            : `Locked until ${milestone.requirement}. Progress: ${progress}.`;
          return (
            <Tooltip key={milestone.label}>
              <TooltipTrigger asChild>
                <span>
                  <Badge
                    className={milestone.unlocked ? 'bg-emerald-700 text-white' : 'cursor-help'}
                    variant={milestone.unlocked ? 'default' : 'secondary'}
                  >
                    {milestone.unlocked ? (
                      <Gift className="mr-1 h-3 w-3" />
                    ) : (
                      <LockKeyhole className="mr-1 h-3 w-3" />
                    )}
                    {milestone.label}
                  </Badge>
                </span>
              </TooltipTrigger>
              <TooltipContent className="max-w-64 text-center">{tooltip}</TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}

function Snowfall() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 bottom-12 top-0 z-20 overflow-hidden"
    >
      {snowflakes.map((flake) => (
        <span
          className="christmas-snowflake absolute -top-4 rounded-full bg-white shadow-[0_1px_5px_rgba(15,53,68,.35),0_0_4px_rgba(255,255,255,.7)]"
          key={flake.id}
          style={
            {
              '--snow-drift': `${flake.drift}px`,
              animationDelay: `${flake.delay}s`,
              animationDuration: `${flake.duration}s`,
              height: `${flake.size}px`,
              left: `${flake.left}%`,
              opacity: flake.opacity,
              width: `${flake.size}px`,
            } as CSSProperties
          }
        />
      ))}
      <style jsx>{`
        .christmas-snowflake {
          animation-name: christmas-snowfall;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
          will-change: transform;
        }
        @keyframes christmas-snowfall {
          0% {
            transform: translate3d(0, -24px, 0) rotate(0deg);
          }
          100% {
            transform: translate3d(var(--snow-drift), calc(100vh + 80px), 0) rotate(360deg);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .christmas-snowflake {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}

function getChristmasTreeDropPosition(
  element: HTMLDivElement | null,
  clientX: number,
  clientY: number
): Pick<ChristmasOrnamentPlacementInput, 'positionX' | 'positionY'> | null {
  if (!element) return null;
  const rect = element.getBoundingClientRect();
  const positionX = ((clientX - rect.left) / rect.width) * 100;
  const positionY = ((clientY - rect.top) / rect.height) * 100;
  const horizontalSpread = (positionY - 7) * 0.57;
  const isOnTree =
    positionY >= 10 &&
    positionY <= 80 &&
    positionX >= 50 - horizontalSpread &&
    positionX <= 50 + horizontalSpread;

  return isOnTree ? { positionX, positionY } : null;
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
