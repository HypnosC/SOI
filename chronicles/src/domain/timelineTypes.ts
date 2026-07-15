/** 文档版本；未来迁移时可递增 */
export const TIMELINE_DOC_VERSION = 1 as const;

export type TimelineEventNode = {
  id: string;
  kind: 'event';
  title: string;
  /** 负数为公元前；无公元 0 年，1 BCE 记为 -1 */
  year: number;
  note?: string;
  /** 地名展示 */
  placeName?: string;
  /** WGS84 */
  lat?: number;
  lng?: number;
};

export type TimelineNode = TimelineEventNode;

export type TimelineDoc = {
  version: typeof TIMELINE_DOC_VERSION;
  nodes: TimelineNode[];
};

export type MapEdition = 'standard' | 'pro';

export function emptyDoc(): TimelineDoc {
  return { version: TIMELINE_DOC_VERSION, nodes: [] };
}

export function hasGeo(n: TimelineEventNode): n is TimelineEventNode & { lat: number; lng: number } {
  return typeof n.lat === 'number' && typeof n.lng === 'number' && Number.isFinite(n.lat) && Number.isFinite(n.lng);
}
