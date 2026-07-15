/** 世界坐标：每年占用的水平像素 */
export const PX_PER_YEAR = 4;

export type TimelineViewport = {
  offsetX: number;
  offsetY: number;
  scale: number;
};

export function tickStep(yearsVisible: number): number {
  const rough = Math.max(yearsVisible / 10, 1);
  const pow10 = 10 ** Math.floor(Math.log10(rough));
  const norm = rough / pow10;
  if (norm < 1.5) return pow10;
  if (norm < 3.5) return 2 * pow10;
  if (norm < 7.5) return 5 * pow10;
  return 10 * pow10;
}

export function screenToWorld(
  sx: number,
  sy: number,
  vp: TimelineViewport,
): { x: number; y: number } {
  return {
    x: (sx - vp.offsetX) / vp.scale,
    y: (sy - vp.offsetY) / vp.scale,
  };
}

export function yearFromScreenX(sx: number, vp: TimelineViewport): number {
  const wx = screenToWorld(sx, 0, vp).x;
  return Math.round(wx / PX_PER_YEAR);
}

export function formatYearLabel(y: number): string {
  if (y < 0) return `前 ${-y} 年`;
  return `公元 ${y} 年`;
}
