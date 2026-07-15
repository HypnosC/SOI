import {
  AXIS_WORLD_Y,
  placeEventCards,
  type PlacedEventCard,
} from '@/domain/layoutEvents';
import { formatYearLabel, PX_PER_YEAR, screenToWorld, tickStep, type TimelineViewport } from '@/domain/timelineMath';
import type { TimelineEventNode } from '@/domain/timelineTypes';

export type PaintTimelineOptions = {
  ctx: CanvasRenderingContext2D;
  cssW: number;
  cssH: number;
  dpr: number;
  vp: TimelineViewport;
  events: TimelineEventNode[];
  selectedId: string | null;
};

function drawGridAndAxis(
  ctx: CanvasRenderingContext2D,
  cssW: number,
  cssH: number,
  vp: TimelineViewport,
  tickYears: number[],
) {
  const w0 = screenToWorld(0, 0, vp);
  const w1 = screenToWorld(cssW, cssH, vp);
  const yTop = Math.min(w0.y, w1.y) - 400;
  const yBot = Math.max(w0.y, w1.y) + 400;

  ctx.strokeStyle = 'rgba(42,42,50,0.55)';
  ctx.lineWidth = 1 / vp.scale;
  for (const y of tickYears) {
    const x = y * PX_PER_YEAR;
    ctx.beginPath();
    ctx.moveTo(x, yTop);
    ctx.lineTo(x, yBot);
    ctx.stroke();
  }

  const axisX0 = Math.min(w0.x, w1.x) - 800;
  const axisX1 = Math.max(w0.x, w1.x) + 800;
  ctx.strokeStyle = 'rgba(55,55,65,0.9)';
  ctx.lineWidth = (1 / vp.scale) * 1.2;
  ctx.beginPath();
  ctx.moveTo(axisX0, AXIS_WORLD_Y);
  ctx.lineTo(axisX1, AXIS_WORLD_Y);
  ctx.stroke();
}

function drawTickLabels(
  ctx: CanvasRenderingContext2D,
  tickYears: number[],
) {
  ctx.font = '10px Segoe UI, PingFang SC, Microsoft YaHei, sans-serif';
  ctx.fillStyle = '#7a7a86';
  for (const y of tickYears) {
    const wx = y * PX_PER_YEAR;
    ctx.fillText(formatYearLabel(y), wx + 2, AXIS_WORLD_Y + 14);
  }
}

function drawEventCard(
  ctx: CanvasRenderingContext2D,
  c: PlacedEventCard,
  selected: boolean,
  vp: TimelineViewport,
) {
  ctx.beginPath();
  if (typeof (ctx as CanvasRenderingContext2D & { roundRect?: (x: number, y: number, w: number, h: number, r: number) => void }).roundRect === 'function') {
    ctx.roundRect(c.wx, c.wy, c.w, c.h, 4);
  } else {
    ctx.rect(c.wx, c.wy, c.w, c.h);
  }
  ctx.fillStyle = selected ? 'rgba(26,26,32,0.96)' : 'rgba(26,26,32,0.92)';
  ctx.fill();
  ctx.strokeStyle = selected ? '#c9a227' : '#2a2a32';
  ctx.lineWidth = (selected ? 2 : 1) / vp.scale;
  ctx.stroke();

  ctx.fillStyle = '#c9a227';
  ctx.font = '600 10px Segoe UI, PingFang SC, Microsoft YaHei, sans-serif';
  ctx.fillText(formatYearLabel(c.node.year), c.wx + 8, c.wy + 16);

  ctx.fillStyle = '#e6e6e9';
  ctx.font = '600 13px Segoe UI, PingFang SC, Microsoft YaHei, sans-serif';
  const title = c.node.title.length > 14 ? `${c.node.title.slice(0, 14)}…` : c.node.title;
  ctx.fillText(title, c.wx + 8, c.wy + 34);

  if (c.node.note) {
    ctx.fillStyle = '#7a7a86';
    ctx.font = '11px Segoe UI, PingFang SC, Microsoft YaHei, sans-serif';
    const note = c.node.note.length > 20 ? `${c.node.note.slice(0, 20)}…` : c.node.note;
    ctx.fillText(note, c.wx + 8, c.wy + 52);
  }
}

function computeVisibleTicks(cssW: number, vp: TimelineViewport): number[] {
  const yearsVisible = cssW / vp.scale / PX_PER_YEAR;
  const step = tickStep(yearsVisible);
  const minYear =
    Math.floor(screenToWorld(0, 0, vp).x / PX_PER_YEAR) - step * 2;
  const maxYear =
    Math.ceil(screenToWorld(cssW, 0, vp).x / PX_PER_YEAR) + step * 2;
  const start = Math.floor(minYear / step) * step;
  const out: number[] = [];
  for (let y = start; y <= maxYear; y += step) {
    out.push(y);
  }
  return out;
}

export function paintTimeline2d(opts: PaintTimelineOptions) {
  const { ctx, cssW, cssH, dpr, vp, events, selectedId } = opts;

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, cssW * dpr, cssH * dpr);

  ctx.fillStyle = '#0c0c0e';
  ctx.fillRect(0, 0, cssW * dpr, cssH * dpr);

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.save();
  ctx.translate(vp.offsetX, vp.offsetY);
  ctx.scale(vp.scale, vp.scale);

  const tickYears = computeVisibleTicks(cssW, vp);
  drawGridAndAxis(ctx, cssW, cssH, vp, tickYears);
  drawTickLabels(ctx, tickYears);

  const cards = placeEventCards(events);
  for (const c of cards) {
    drawEventCard(ctx, c, c.id === selectedId, vp);
  }

  ctx.restore();
}

export function drawEmptyStateHint(
  ctx: CanvasRenderingContext2D,
  cssW: number,
  cssH: number,
  dpr: number,
  hasEvents: boolean,
) {
  if (hasEvents) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = 'rgba(122,122,134,0.85)';
  ctx.font = '13px Segoe UI, PingFang SC, Microsoft YaHei, sans-serif';
  const lines = ['暂无事件', '拖拽平移画布 · 滚轮缩放 · 双击空白按年份新建'];
  const startY = cssH / 2 - 20;
  lines.forEach((line, i) => {
    const w = ctx.measureText(line).width;
    ctx.fillText(line, (cssW - w) / 2, startY + i * 22);
  });
}
