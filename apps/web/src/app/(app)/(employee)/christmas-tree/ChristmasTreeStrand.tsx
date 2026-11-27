'use client';

import type { ChristmasStrandGeometry } from '@/lib/schemas/christmas-tree.schema';
import { christmasStrandGeometrySchema } from '@/lib/schemas/christmas-tree.schema';
import { type PointerEvent as ReactPointerEvent, useEffect, useRef, useState } from 'react';

export type StrandKind = 'garland' | 'lights';

type Point = { x: number; y: number };
type DragMode = 'start' | 'end' | 'body';

export function pointFromClient(
  tree: HTMLElement | null,
  clientX: number,
  clientY: number,
  clampToBranches = true
): Point | null {
  if (!tree) return null;
  const rect = tree.getBoundingClientRect();
  const rawX = ((clientX - rect.left) / rect.width) * 100;
  const rawY = ((clientY - rect.top) / rect.height) * 100;
  if (!clampToBranches) return { x: rawX, y: rawY };
  const y = Math.max(20, Math.min(78, rawY));
  const spread = (y - 7) * 0.57;
  const x = Math.max(50 - spread, Math.min(50 + spread, rawX));
  return { x, y };
}

function positionOnCurve(geometry: ChristmasStrandGeometry, t: number): Point {
  const span = geometry.endX - geometry.startX;
  // The extra cable grows with its span, so the middle hangs lower without scaling its thickness.
  const sag = Math.max(3, Math.min(9, span * 0.12));
  return {
    x: geometry.startX + span * t,
    y: geometry.startY * (1 - t) + geometry.endY * t + 4 * sag * t * (1 - t),
  };
}

export function ChristmasTreeStrand({
  geometry,
  editable,
  treeElement,
  onSave,
}: {
  geometry: ChristmasStrandGeometry;
  editable: boolean;
  treeElement: HTMLElement | null;
  onSave?: (geometry: ChristmasStrandGeometry) => Promise<boolean>;
}) {
  const [draft, setDraft] = useState<ChristmasStrandGeometry | null>(null);
  const dragRef = useRef<{
    pointerId: number;
    mode: DragMode;
    original: ChristmasStrandGeometry;
    originClientX: number;
    originClientY: number;
    latest: ChristmasStrandGeometry;
  } | null>(null);
  const visible = draft ?? geometry;

  useEffect(() => {
    if (draft && !dragRef.current && JSON.stringify(draft) === JSON.stringify(geometry)) {
      setDraft(null);
    }
  }, [draft, geometry]);

  const start = positionOnCurve(visible, 0);
  const end = positionOnCurve(visible, 1);
  const middle = positionOnCurve(visible, 0.5);
  const path = `M ${start.x} ${start.y} Q ${(start.x + end.x) / 2} ${middle.y * 2 - (start.y + end.y) / 2} ${end.x} ${end.y}`;

  const beginDrag = (
    event: ReactPointerEvent<SVGPathElement | HTMLButtonElement>,
    mode: DragMode
  ) => {
    if (!(editable && treeElement && onSave)) return;
    const point = pointFromClient(treeElement, event.clientX, event.clientY);
    if (!point) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      mode,
      original: visible,
      originClientX: event.clientX,
      originClientY: event.clientY,
      latest: visible,
    };
  };

  const moveDrag = (event: ReactPointerEvent<SVGPathElement | HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId || !treeElement) return;
    const point = pointFromClient(treeElement, event.clientX, event.clientY);
    if (!point) return;
    event.preventDefault();
    event.stopPropagation();
    let next = drag.original;
    if (drag.mode === 'start') {
      next = { ...next, startX: Math.min(point.x, next.endX - 12), startY: point.y };
    } else if (drag.mode === 'end') {
      next = { ...next, endX: Math.max(point.x, next.startX + 12), endY: point.y };
    } else {
      const dx = ((event.clientX - drag.originClientX) / treeElement.clientWidth) * 100;
      const dy = ((event.clientY - drag.originClientY) / treeElement.clientHeight) * 100;
      // Translate both anchors together. Reject positions that detach either end from the branches.
      const candidate = {
        startX: drag.original.startX + dx,
        startY: drag.original.startY + dy,
        endX: drag.original.endX + dx,
        endY: drag.original.endY + dy,
      };
      if (christmasStrandGeometrySchema.safeParse(candidate).success) next = candidate;
    }
    if (!christmasStrandGeometrySchema.safeParse(next).success) return;
    drag.latest = next;
    setDraft(next);
  };

  const finishDrag = (event: ReactPointerEvent<SVGPathElement | HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    dragRef.current = null;
    if (JSON.stringify(drag.latest) === JSON.stringify(drag.original)) {
      setDraft(null);
      return;
    }
    setDraft(drag.latest);
    const save = onSave?.(drag.latest);
    void save?.then((saved) => {
      if (!saved) setDraft((current) => (current === drag.latest ? null : current));
    });
  };

  const cancelDrag = () => {
    dragRef.current = null;
    setDraft(null);
  };

  const moveWithKeyboard = (mode: 'start' | 'end', key: string) => {
    const delta =
      key === 'ArrowLeft'
        ? [-2, 0]
        : key === 'ArrowRight'
          ? [2, 0]
          : key === 'ArrowUp'
            ? [0, -2]
            : [0, 2];
    const next = {
      ...visible,
      [`${mode}X`]: visible[`${mode}X`] + (delta[0] ?? 0),
      [`${mode}Y`]: visible[`${mode}Y`] + (delta[1] ?? 0),
    };
    if (christmasStrandGeometrySchema.safeParse(next).success) onSave?.(next);
  };

  return (
    <div
      className="pointer-events-none absolute inset-0 z-[5]"
      data-testid="christmas-tree-garland"
    >
      <svg
        aria-hidden="true"
        className="absolute inset-0 h-full w-full overflow-visible"
        preserveAspectRatio="none"
        viewBox="0 0 100 100"
      >
        <path
          d={path}
          fill="none"
          stroke="#f9d66a"
          strokeLinecap="round"
          strokeWidth={3}
          vectorEffect="non-scaling-stroke"
        />
        {editable ? (
          <path
            className="pointer-events-auto cursor-grab touch-none"
            d={path}
            fill="none"
            onPointerDown={(event) => beginDrag(event, 'body')}
            onPointerMove={moveDrag}
            onPointerUp={finishDrag}
            onPointerCancel={cancelDrag}
            stroke="transparent"
            strokeWidth="18"
            vectorEffect="non-scaling-stroke"
          />
        ) : null}
      </svg>
      {editable
        ? (['start', 'end'] as const).map((mode) => (
            <button
              aria-label={`Move garland ${mode} end`}
              className="pointer-events-auto absolute z-20 flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 touch-none cursor-grab items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
              key={mode}
              onKeyDown={(event) => {
                if (event.key.startsWith('Arrow')) {
                  event.preventDefault();
                  moveWithKeyboard(mode, event.key);
                }
              }}
              onPointerDown={(event) => beginDrag(event, mode)}
              onPointerMove={moveDrag}
              onPointerUp={finishDrag}
              onPointerCancel={cancelDrag}
              style={{ left: `${visible[`${mode}X`]}%`, top: `${visible[`${mode}Y`]}%` }}
              title="Drag to lengthen or reposition this end"
              type="button"
            >
              <span className="h-3 w-3 rounded-full border border-white bg-amber-400 shadow-sm ring-1 ring-emerald-900/70" />
            </button>
          ))
        : null}
    </div>
  );
}
