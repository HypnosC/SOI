import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { TimelineCanvas } from '@/canvas/TimelineCanvas';
import {
  emptyDoc,
  type MapEdition,
  type TimelineDoc,
  type TimelineEventNode,
} from '@/domain/timelineTypes';
import type { TimelineViewport } from '@/domain/timelineMath';
import { getEventNodes } from '@/domain/timelineDocHelpers';
import { Map2D } from '@/map/Map2D';
import { Map3D } from '@/map/Map3D';
import { mergeDocs, parseTimelineDocJson, serializeDoc } from '@/persistence/docIo';
import { loadDocFromIdb, saveDocToIdb } from '@/persistence/indexedDbStore';
import { EventDock } from '@/ui/EventDock';
import './App.css';

function uid() {
  return crypto.randomUUID();
}

function initialViewport(w: number, h: number): TimelineViewport {
  const scale = 0.55;
  const wx = 1 * 4;
  const wy = 56;
  return {
    scale,
    offsetX: w / 2 - wx * scale,
    offsetY: h / 2 - wy * scale,
  };
}

export default function App() {
  const [doc, setDoc] = useState<TimelineDoc>(() => emptyDoc());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draftYear, setDraftYear] = useState<number | null>(null);
  const [hoverYear, setHoverYear] = useState<number | null>(null);
  const [viewport, setViewport] = useState<TimelineViewport>(() => initialViewport(800, 280));
  const [hydrated, setHydrated] = useState(false);
  const [edition, setEdition] = useState<MapEdition>('standard');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const timelinePaneRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const loaded = await loadDocFromIdb();
      if (cancelled) return;
      if (loaded) setDoc(loaded);
      setHydrated(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const t = window.setTimeout(() => {
      void saveDocToIdb(doc).catch((e) => console.error('save idb', e));
    }, 250);
    return () => window.clearTimeout(t);
  }, [doc, hydrated]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
        e.preventDefault();
        setDoc((d) => ({ ...d, nodes: d.nodes.filter((n) => n.id !== selectedId) }));
        setSelectedId(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedId]);

  const selected = useMemo(() => {
    if (!selectedId) return null;
    const n = doc.nodes.find((x) => x.id === selectedId);
    return n && n.kind === 'event' ? n : null;
  }, [doc.nodes, selectedId]);

  const events = useMemo(() => getEventNodes(doc), [doc]);

  const onAdd = useCallback((payload: Omit<TimelineEventNode, 'id' | 'kind'>) => {
    const node: TimelineEventNode = { ...payload, id: uid(), kind: 'event' };
    setDoc((d) => ({ ...d, nodes: [...d.nodes, node] }));
    setSelectedId(node.id);
  }, []);

  const onUpdate = useCallback((id: string, patch: Partial<TimelineEventNode>) => {
    setDoc((d) => ({
      ...d,
      nodes: d.nodes.map((n) => (n.id === id && n.kind === 'event' ? { ...n, ...patch } : n)),
    }));
  }, []);

  const onDelete = useCallback((id: string) => {
    setDoc((d) => ({ ...d, nodes: d.nodes.filter((n) => n.id !== id) }));
    setSelectedId(null);
  }, []);

  const loadDemo = () => {
    if (doc.nodes.length > 0 && !window.confirm('将追加带坐标的示例事件，继续？')) return;
    const demo: TimelineEventNode[] = [
      {
        id: uid(),
        kind: 'event',
        title: '平王东迁',
        year: -770,
        note: '东周始',
        placeName: '洛邑',
        lat: 34.62,
        lng: 112.45,
      },
      {
        id: uid(),
        kind: 'event',
        title: '秦灭六国',
        year: -221,
        note: '秦统一',
        placeName: '咸阳',
        lat: 34.35,
        lng: 108.72,
      },
      {
        id: uid(),
        kind: 'event',
        title: '蔡伦改进造纸',
        year: 105,
        note: '技术史',
        placeName: '洛阳',
        lat: 34.68,
        lng: 112.45,
      },
    ];
    setDoc((d) => ({ ...d, nodes: [...d.nodes, ...demo] }));
  };

  const exportJson = () => {
    const blob = new Blob([serializeDoc(doc)], { type: 'application/json;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'chronicles-soi-doc.json';
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const onImportFile: React.ChangeEventHandler<HTMLInputElement> = (ev) => {
    const file = ev.target.files?.[0];
    ev.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === 'string' ? reader.result : '';
      const parsed = parseTimelineDocJson(text);
      if (!parsed) {
        window.alert('JSON 格式无效');
        return;
      }
      const merge = doc.nodes.length > 0 && window.confirm('与当前事件合并？选「取消」则覆盖当前文档。');
      if (merge) setDoc((d) => mergeDocs(d, parsed));
      else {
        setDoc(parsed);
        setSelectedId(null);
      }
    };
    reader.readAsText(file, 'utf-8');
  };

  useLayoutEffect(() => {
    const el = timelinePaneRef.current;
    if (!el || !hydrated) return;
    setViewport(initialViewport(el.clientWidth, el.clientHeight));
  }, [hydrated]);

  return (
    <div className="app">
      <header className="bar">
        <div className="bar-title">
          <h1>Chronicles of SOI</h1>
          <span className="bar-sub">无知编年 · 时空</span>
        </div>
        <div className="bar-meta">
          {hoverYear != null ? (
            <span className="bar-hover">{hoverYear < 0 ? `前 ${-hoverYear} 年` : `公元 ${hoverYear} 年`}</span>
          ) : null}
          <span className="bar-hint">时间轴选事件 → 地图飞到地点 · 点地图标记 → 时间轴选中</span>
        </div>
        <div className="edition-toggle" role="group" aria-label="地图版本">
          <button
            type="button"
            className={edition === 'standard' ? 'btn btn--primary' : 'btn btn--ghost'}
            onClick={() => setEdition('standard')}
          >
            普通版 · 2D
          </button>
          <button
            type="button"
            className={edition === 'pro' ? 'btn btn--primary' : 'btn btn--ghost'}
            onClick={() => setEdition('pro')}
          >
            高级版 · 3D
          </button>
        </div>
        <div className="bar-actions">
          <button type="button" className="btn btn--ghost" onClick={loadDemo}>
            示例
          </button>
          <button type="button" className="btn btn--ghost" onClick={exportJson} disabled={doc.nodes.length === 0}>
            导出
          </button>
          <button type="button" className="btn btn--ghost" onClick={() => fileInputRef.current?.click()}>
            导入
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            className="sr-only"
            aria-hidden
            onChange={onImportFile}
          />
        </div>
      </header>

      <div className="workspace">
        <section ref={timelinePaneRef} className="pane pane--timeline">
          <TimelineCanvas
            doc={doc}
            selectedId={selectedId}
            viewport={viewport}
            setViewport={setViewport}
            onSelect={setSelectedId}
            onCreateAtYear={(y) => {
              setDraftYear(y);
              setSelectedId(null);
            }}
            onHoverYear={setHoverYear}
          />
        </section>
        <section className="pane pane--map">
          {edition === 'standard' ? (
            <Map2D events={events} selectedId={selectedId} onSelect={setSelectedId} />
          ) : (
            <Map3D events={events} selectedId={selectedId} onSelect={setSelectedId} />
          )}
          <div className="map-badge">
            {edition === 'standard'
              ? '普通版 · 中国 2D（本地瓦片优先 / 高德回退）'
              : '高级版 · 地球 3D（默认朝向中国）'}
          </div>
        </section>
      </div>

      <EventDock
        key={selected ? selected.id : `new-${draftYear ?? 'y'}`}
        draftYear={draftYear}
        selected={selected}
        onClearDraft={() => setDraftYear(null)}
        onAdd={onAdd}
        onUpdate={onUpdate}
        onDelete={onDelete}
      />
    </div>
  );
}
