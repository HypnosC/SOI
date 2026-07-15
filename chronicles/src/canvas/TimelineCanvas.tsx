import { useCallback, useLayoutEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { drawEmptyStateHint, paintTimeline2d } from '@/canvas/drawTimeline2d';
import { pickAtWorld } from '@/domain/layoutEvents';
import { placeEventCards } from '@/domain/layoutEvents';
import { screenToWorld, yearFromScreenX, type TimelineViewport } from '@/domain/timelineMath';
import { getEventNodes } from '@/domain/timelineDocHelpers';
import type { TimelineDoc } from '@/domain/timelineTypes';

type Props = {
  doc: TimelineDoc;
  selectedId: string | null;
  viewport: TimelineViewport;
  setViewport: Dispatch<SetStateAction<TimelineViewport>>;
  onSelect: (id: string | null) => void;
  onCreateAtYear: (year: number) => void;
  onHoverYear: (y: number | null) => void;
};

export function TimelineCanvas({
  doc,
  selectedId,
  viewport,
  setViewport,
  onSelect,
  onCreateAtYear,
  onHoverYear,
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState({ w: 800, h: 600 });
  const dprRef = useRef(1);
  const pan = useRef({ active: false, px: 0, py: 0, pickedNode: false });

  const events = getEventNodes(doc);

  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setSize({ w: el.clientWidth, h: el.clientHeight });
    });
    ro.observe(el);
    setSize({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  const syncCanvasBitmap = useCallback(() => {
    const c = canvasRef.current;
    if (!c) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    dprRef.current = dpr;
    c.width = Math.floor(size.w * dpr);
    c.height = Math.floor(size.h * dpr);
    c.style.width = `${size.w}px`;
    c.style.height = `${size.h}px`;
  }, [size.h, size.w]);

  const paint = useCallback(() => {
    syncCanvasBitmap();
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    const dpr = dprRef.current;
    paintTimeline2d({
      ctx,
      cssW: size.w,
      cssH: size.h,
      dpr,
      vp: viewport,
      events,
      selectedId,
    });
    drawEmptyStateHint(ctx, size.w, size.h, dpr, events.length > 0);
  }, [events, selectedId, size.h, size.w, syncCanvasBitmap, viewport]);

  useLayoutEffect(() => {
    paint();
  }, [paint]);

  const clientToLocal = (clientX: number, clientY: number) => {
    const el = wrapRef.current!;
    const r = el.getBoundingClientRect();
    return { sx: clientX - r.left, sy: clientY - r.top };
  };

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const { sx, sy } = clientToLocal(e.clientX, e.clientY);
    const factor = e.deltaY > 0 ? 0.92 : 1.09;
    setViewport((vp) => {
      const wx = (sx - vp.offsetX) / vp.scale;
      const wy = (sy - vp.offsetY) / vp.scale;
      const nextScale = Math.min(6, Math.max(0.04, vp.scale * factor));
      return {
        offsetX: sx - wx * nextScale,
        offsetY: sy - wy * nextScale,
        scale: nextScale,
      };
    });
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    const { sx, sy } = clientToLocal(e.clientX, e.clientY);
    const w = screenToWorld(sx, sy, viewport);
    const cards = placeEventCards(events);
    const pick = pickAtWorld(w.x, w.y, cards);
    if (pick?.kind === 'node') {
      pan.current = { active: false, px: e.clientX, py: e.clientY, pickedNode: true };
      onSelect(pick.id);
      return;
    }
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    pan.current = { active: true, px: e.clientX, py: e.clientY, pickedNode: false };
    onSelect(null);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const { sx } = clientToLocal(e.clientX, e.clientY);
    onHoverYear(yearFromScreenX(sx, viewport));

    if (pan.current.pickedNode) return;
    if (!pan.current.active) return;
    const dx = e.clientX - pan.current.px;
    const dy = e.clientY - pan.current.py;
    pan.current.px = e.clientX;
    pan.current.py = e.clientY;
    setViewport((vp) => ({
      ...vp,
      offsetX: vp.offsetX + dx,
      offsetY: vp.offsetY + dy,
    }));
  };

  const endPan = () => {
    pan.current.active = false;
    pan.current.pickedNode = false;
  };

  const onDoubleClick = (e: React.MouseEvent) => {
    const { sx, sy } = clientToLocal(e.clientX, e.clientY);
    const w = screenToWorld(sx, sy, viewport);
    const cards = placeEventCards(events);
    if (pickAtWorld(w.x, w.y, cards)) return;
    onCreateAtYear(yearFromScreenX(sx, viewport));
  };

  return (
    <div
      ref={wrapRef}
      className="timeline-wrap"
      onWheel={onWheel}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endPan}
      onPointerCancel={endPan}
      onPointerLeave={() => {
        endPan();
        onHoverYear(null);
      }}
      onDoubleClick={onDoubleClick}
    >
      <canvas ref={canvasRef} className="timeline-canvas" />
    </div>
  );
}
