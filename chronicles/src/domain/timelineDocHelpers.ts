import type { TimelineDoc, TimelineEventNode } from './timelineTypes';

export function getEventNodes(doc: TimelineDoc): TimelineEventNode[] {
  return doc.nodes.filter((n): n is TimelineEventNode => n.kind === 'event');
}
