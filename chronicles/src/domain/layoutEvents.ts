import type { TimelineEventNode } from './timelineTypes';
import { PX_PER_YEAR } from './timelineMath';

export const CARD_W = 168;
export const CARD_H = 68;
export const AXIS_WORLD_Y = 248;

/**
 * 卡片基准位置：贴着时间轴「上方」。
 *
 * 原实现是 `CARD_BASE_Y = 8` + `wy = 8 + stack * 76`（向下堆叠），
 * 于是第 4 个同年事件落在 y = 236..304，而轴线在 y = 248 —— 卡片会压住轴线与刻度文字。
 * 改成向上堆叠，任何堆叠层数都不会碰到轴线。
 */
export const CARD_BASE_Y = AXIS_WORLD_Y - CARD_H - 18;
/** 同年事件向上堆叠的步长 */
export const CARD_STACK_DY = 76;

export type PlacedEventCard = {
  id: string;
  node: TimelineEventNode;
  wx: number;
  wy: number;
  w: number;
  h: number;
};

/**
 * 同年多条纵向错开的序号。
 *
 * 排序键从 `id.localeCompare` 改为「标题 → id」：
 * id 是 `crypto.randomUUID()`，用它排序等于顺序随机且不可读；
 * 编年史里同年事件应按标题稳定排列，至少做到「同一份数据每次渲染顺序一致且可预期」。
 */
export function buildYearStackIndex(nodes: TimelineEventNode[]): Map<string, number> {
  const byYear = new Map<number, TimelineEventNode[]>();
  for (const n of nodes) {
    const g = byYear.get(n.year) ?? [];
    g.push(n);
    byYear.set(n.year, g);
  }
  for (const g of byYear.values()) {
    g.sort(
      (a, b) =>
        a.title.localeCompare(b.title, 'zh-Hans-CN') || a.id.localeCompare(b.id),
    );
  }
  const indexInYear = new Map<string, number>();
  for (const g of byYear.values()) {
    g.forEach((n, i) => indexInYear.set(n.id, i));
  }
  return indexInYear;
}

export function placeEventCards(nodes: TimelineEventNode[]): PlacedEventCard[] {
  const idx = buildYearStackIndex(nodes);
  return nodes.map((n) => {
    const stack = idx.get(n.id) ?? 0;
    return {
      id: n.id,
      node: n,
      wx: n.year * PX_PER_YEAR,
      wy: CARD_BASE_Y - stack * CARD_STACK_DY,
      w: CARD_W,
      h: CARD_H,
    };
  });
}

/** 画布命中：后者在上（逆序遍历） */
export function hitTestEventCard(wx: number, wy: number, cards: PlacedEventCard[]): PlacedEventCard | null {
  for (let i = cards.length - 1; i >= 0; i--) {
    const c = cards[i]!;
    if (wx >= c.wx && wx <= c.wx + c.w && wy >= c.wy && wy <= c.wy + c.h) return c;
  }
  return null;
}

/** 预留：日后先测边再测点 */
export type PickHit =
  | { kind: 'node'; id: string }
  | { kind: 'edge'; id: string };

export function pickAtWorld(wx: number, wy: number, cards: PlacedEventCard[]): PickHit | null {
  const card = hitTestEventCard(wx, wy, cards);
  if (card) return { kind: 'node', id: card.id };
  return null;
}
