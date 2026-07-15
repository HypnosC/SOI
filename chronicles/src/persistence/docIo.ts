import { TIMELINE_DOC_VERSION, type TimelineDoc, type TimelineNode } from '@/domain/timelineTypes';

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null;
}

function isEventNode(x: unknown): x is TimelineNode {
  if (!isRecord(x)) return false;
  if (x.kind !== 'event') return false;
  if (typeof x.id !== 'string' || typeof x.title !== 'string' || typeof x.year !== 'number') return false;
  if (x.note !== undefined && typeof x.note !== 'string') return false;
  if (x.placeName !== undefined && typeof x.placeName !== 'string') return false;
  if (x.lat !== undefined && typeof x.lat !== 'number') return false;
  if (x.lng !== undefined && typeof x.lng !== 'number') return false;
  return true;
}

export function parseTimelineDocJson(text: string): TimelineDoc | null {
  try {
    const data: unknown = JSON.parse(text);
    if (!isRecord(data)) return null;
    if (data.version !== TIMELINE_DOC_VERSION) return null;
    if (!Array.isArray(data.nodes)) return null;
    const nodes = data.nodes.filter(isEventNode);
    if (nodes.length !== data.nodes.length) return null;
    return { version: TIMELINE_DOC_VERSION, nodes };
  } catch {
    return null;
  }
}

export function serializeDoc(doc: TimelineDoc): string {
  return JSON.stringify(doc, null, 2);
}

export function mergeDocs(base: TimelineDoc, incoming: TimelineDoc): TimelineDoc {
  const seen = new Set(base.nodes.map((n) => n.id));
  const merged = [...base.nodes];
  for (const n of incoming.nodes) {
    if (!seen.has(n.id)) {
      merged.push(n);
      seen.add(n.id);
    }
  }
  return { version: TIMELINE_DOC_VERSION, nodes: merged };
}
