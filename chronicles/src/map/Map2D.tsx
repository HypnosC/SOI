import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { resolveChinaMapStyle } from '@/map/chinaMapStyle';
import { hasGeo, type TimelineEventNode } from '@/domain/timelineTypes';

type Props = {
  events: TimelineEventNode[];
  selectedId: string | null;
  onSelect: (id: string) => void;
};

/** 中国及周边（含西北、南海），限制拖出太远 */
const CHINA_BOUNDS: [[number, number], [number, number]] = [
  [70, 15],
  [138, 55],
];
const CHINA_CENTER: [number, number] = [104.5, 35.5];

export function Map2D({ events, selectedId, onSelect }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<Map<string, maplibregl.Marker>>(new Map());
  const [tileSource, setTileSource] = useState<'local' | 'gaode' | 'loading'>('loading');

  useEffect(() => {
    const el = containerRef.current;
    if (!el || mapRef.current) return;
    let cancelled = false;

    (async () => {
      const { style, source } = await resolveChinaMapStyle();
      if (cancelled || !containerRef.current) return;

      const map = new maplibregl.Map({
        container: containerRef.current,
        style,
        center: CHINA_CENTER,
        zoom: 4.2,
        minZoom: 3,
        maxZoom: 12,
        maxBounds: CHINA_BOUNDS,
        attributionControl: { compact: true },
      });
      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
      mapRef.current = map;
      setTileSource(source);

      const onLoad = () => {
        map.resize();
        map.fitBounds(CHINA_BOUNDS, { padding: 24, duration: 0 });
      };
      map.on('load', onLoad);
    })();

    return () => {
      cancelled = true;
      markersRef.current.forEach((m) => m.remove());
      markersRef.current.clear();
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const keep = new Set<string>();
    for (const ev of events) {
      if (!hasGeo(ev)) continue;
      keep.add(ev.id);
      let marker = markersRef.current.get(ev.id);
      if (!marker) {
        const node = document.createElement('button');
        node.type = 'button';
        node.className = 'map-pin';
        node.title = `${ev.title}${ev.placeName ? ` · ${ev.placeName}` : ''}`;
        node.innerHTML = `<span class="map-pin-dot"></span><span class="map-pin-label">${escapeHtml(ev.placeName || ev.title)}</span>`;
        node.addEventListener('click', (e) => {
          e.stopPropagation();
          onSelect(ev.id);
        });
        marker = new maplibregl.Marker({ element: node, anchor: 'bottom' })
          .setLngLat([ev.lng, ev.lat])
          .addTo(map);
        markersRef.current.set(ev.id, marker);
      } else {
        marker.setLngLat([ev.lng, ev.lat]);
        const label = marker.getElement().querySelector('.map-pin-label');
        if (label) label.textContent = ev.placeName || ev.title;
      }
      const pinEl = marker.getElement();
      pinEl.classList.toggle('map-pin--active', ev.id === selectedId);
    }

    for (const [id, m] of markersRef.current) {
      if (!keep.has(id)) {
        m.remove();
        markersRef.current.delete(id);
      }
    }
  }, [events, selectedId, onSelect]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedId) return;
    const ev = events.find((e) => e.id === selectedId);
    if (!ev || !hasGeo(ev)) return;
    map.flyTo({ center: [ev.lng, ev.lat], zoom: Math.max(map.getZoom(), 6.5), essential: true });
  }, [selectedId, events]);

  return (
    <div className="map-panel map-panel--2d">
      <div ref={containerRef} className="map-panel-canvas" />
      <div className="map-tile-hint">
        {tileSource === 'loading' && '图源加载中…'}
        {tileSource === 'local' && '底图：本地瓦片 public/tiles'}
        {tileSource === 'gaode' && '底图：高德在线（未检测到本地瓦片）'}
      </div>
    </div>
  );
}

function escapeHtml(s: string): string {
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}
