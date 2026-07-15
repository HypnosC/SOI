import { useState } from 'react';
import { formatYearLabel } from '@/domain/timelineMath';
import type { TimelineEventNode } from '@/domain/timelineTypes';

type Props = {
  draftYear: number | null;
  selected: TimelineEventNode | null;
  onClearDraft: () => void;
  onAdd: (e: Omit<TimelineEventNode, 'id' | 'kind'>) => void;
  onUpdate: (id: string, patch: Partial<TimelineEventNode>) => void;
  onDelete: (id: string) => void;
};

function initialY(selected: TimelineEventNode | null, draftYear: number | null) {
  return selected ? selected.year : (draftYear ?? new Date().getFullYear());
}

function parseCoord(raw: string): number | undefined {
  const t = raw.trim();
  if (!t) return undefined;
  const n = Number(t);
  return Number.isFinite(n) ? n : undefined;
}

export function EventDock({
  draftYear,
  selected,
  onClearDraft,
  onAdd,
  onUpdate,
  onDelete,
}: Props) {
  const yInit = initialY(selected, draftYear);
  const [title, setTitle] = useState(() => selected?.title ?? '');
  const [bce, setBce] = useState(() => yInit < 0);
  const [yearAbs, setYearAbs] = useState(() => Math.abs(yInit));
  const [note, setNote] = useState(() => selected?.note ?? '');
  const [placeName, setPlaceName] = useState(() => selected?.placeName ?? '');
  const [latStr, setLatStr] = useState(() => (selected?.lat != null ? String(selected.lat) : ''));
  const [lngStr, setLngStr] = useState(() => (selected?.lng != null ? String(selected.lng) : ''));

  const signedYear = bce ? -Math.abs(yearAbs) : Math.abs(yearAbs);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const t = title.trim();
    if (!t) return;
    const lat = parseCoord(latStr);
    const lng = parseCoord(lngStr);
    const payload = {
      title: t,
      year: signedYear,
      note: note.trim() || undefined,
      placeName: placeName.trim() || undefined,
      lat,
      lng,
    };
    if (selected) {
      onUpdate(selected.id, payload);
    } else {
      onAdd(payload);
      onClearDraft();
      setTitle('');
      setNote('');
      setPlaceName('');
      setLatStr('');
      setLngStr('');
    }
  };

  return (
    <aside className="dock">
      <div className="dock-head">{selected ? '编辑事件' : '新事件'}</div>
      <form className="dock-form" onSubmit={submit}>
        <label className="dock-field">
          <span>标题</span>
          <input
            value={title}
            onChange={(ev) => setTitle(ev.target.value)}
            placeholder="简短标题"
            autoComplete="off"
          />
        </label>
        <div className="dock-row">
          <label className="dock-field dock-field--grow">
            <span>年份（绝对值）</span>
            <input
              type="number"
              min={1}
              value={yearAbs}
              onChange={(ev) => setYearAbs(Math.max(1, Number(ev.target.value) || 1))}
            />
          </label>
          <label className="dock-check">
            <input type="checkbox" checked={bce} onChange={(ev) => setBce(ev.target.checked)} />
            公元前
          </label>
        </div>
        <p className="dock-preview">{formatYearLabel(signedYear)}</p>
        <label className="dock-field">
          <span>地名</span>
          <input
            value={placeName}
            onChange={(ev) => setPlaceName(ev.target.value)}
            placeholder="如：咸阳"
            autoComplete="off"
          />
        </label>
        <div className="dock-row">
          <label className="dock-field dock-field--grow">
            <span>纬度 lat</span>
            <input value={latStr} onChange={(ev) => setLatStr(ev.target.value)} placeholder="34.3" />
          </label>
          <label className="dock-field dock-field--grow">
            <span>经度 lng</span>
            <input value={lngStr} onChange={(ev) => setLngStr(ev.target.value)} placeholder="108.9" />
          </label>
        </div>
        <label className="dock-field">
          <span>备注</span>
          <textarea value={note} onChange={(ev) => setNote(ev.target.value)} rows={2} placeholder="可选" />
        </label>
        <div className="dock-actions">
          {selected ? (
            <>
              <button type="button" className="btn btn--ghost" onClick={() => onDelete(selected.id)}>
                删除
              </button>
              <button type="submit" className="btn btn--primary">
                保存
              </button>
            </>
          ) : (
            <button type="submit" className="btn btn--primary">
              添加
            </button>
          )}
        </div>
      </form>
    </aside>
  );
}
