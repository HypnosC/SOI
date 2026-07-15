import { useEffect, useRef } from 'react';
import ThreeGlobe from 'three-globe';
import {
  AmbientLight,
  Color,
  DirectionalLight,
  PerspectiveCamera,
  Scene,
  Vector3,
  WebGLRenderer,
} from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { hasGeo, type TimelineEventNode } from '@/domain/timelineTypes';

type Props = {
  events: TimelineEventNode[];
  selectedId: string | null;
  onSelect: (id: string) => void;
};

type Point = { id: string; lat: number; lng: number; title: string };

function latLngToVector3(lat: number, lng: number, radius: number): Vector3 {
  const phi = ((90 - lat) * Math.PI) / 180;
  const theta = ((lng + 90) * Math.PI) / 180;
  return new Vector3(
    radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  );
}

export function Map3D({ events, selectedId, onSelect }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const globeRef = useRef<ThreeGlobe | null>(null);
  const cameraRef = useRef<PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const w = el.clientWidth || 400;
    const h = el.clientHeight || 300;

    const scene = new Scene();
    scene.background = new Color(0x0c0c0e);

    const camera = new PerspectiveCamera(45, w / h, 0.1, 2000);
    // 默认对准中国一带
    camera.position.copy(latLngToVector3(35, 105, 240));
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    const renderer = new WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(w, h);
    el.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.minDistance = 160;
    controls.maxDistance = 420;
    controlsRef.current = controls;

    scene.add(new AmbientLight(0xffffff, 1.6));
    const dir = new DirectionalLight(0xffffff, 1.8);
    dir.position.set(2, 1, 1);
    scene.add(dir);

    // ponytail: 声明文件不全，运行时 API 用 any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const globe: any = new ThreeGlobe();
    // 更清晰的日间地表纹理
    globe.globeImageUrl('https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg');
    globe.bumpImageUrl('https://unpkg.com/three-globe/example/img/earth-topology.png');
    globe.showAtmosphere(true);
    globe.atmosphereColor('#8ecae6');
    globe.atmosphereAltitude(0.18);
    globe.pointAltitude(0.04);
    globe.pointRadius(0.9);
    globe.pointsData([]);
    globe.pointColor(() => '#e63946');
    globe.onPointClick((d: object) => {
      const p = d as Point;
      if (p?.id) onSelectRef.current(p.id);
    });

    scene.add(globe);
    globeRef.current = globe as ThreeGlobe;

    let raf = 0;
    const tick = () => {
      controls.update();
      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    };
    tick();

    const ro = new ResizeObserver(() => {
      const nw = el.clientWidth;
      const nh = el.clientHeight;
      if (nw < 2 || nh < 2) return;
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    });
    ro.observe(el);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      controls.dispose();
      renderer.dispose();
      el.removeChild(renderer.domElement);
      globeRef.current = null;
      cameraRef.current = null;
      controlsRef.current = null;
    };
  }, []);

  useEffect(() => {
    const globe = globeRef.current;
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!globe) return;

    const pts: Point[] = events.filter(hasGeo).map((e) => ({
      id: e.id,
      lat: e.lat,
      lng: e.lng,
      title: e.title,
    }));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const g: any = globe;
    g.pointsData(pts);
    g.pointColor((d: object) => ((d as Point).id === selectedId ? '#ffd60a' : '#e63946'));

    if (selectedId && camera && controls) {
      const hit = pts.find((p) => p.id === selectedId);
      if (hit) {
        const target = latLngToVector3(hit.lat, hit.lng, 220);
        camera.position.copy(target);
        camera.lookAt(0, 0, 0);
        controls.update();
      }
    }
  }, [events, selectedId]);

  return <div ref={containerRef} className="map-panel map-panel--3d" />;
}
