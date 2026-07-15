import type { StyleSpecification } from 'maplibre-gl';

/** 高德矢量道路图（国内可访问；仅作本地瓦片缺失时的回退） */
export function gaodeRasterStyle(): StyleSpecification {
  return {
    version: 8,
    name: 'gaode-china',
    sources: {
      gaode: {
        type: 'raster',
        tiles: [
          'https://webrd01.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}',
          'https://webrd02.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}',
          'https://webrd03.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}',
          'https://webrd04.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}',
        ],
        tileSize: 256,
        attribution: '© 高德地图',
        maxzoom: 18,
      },
    },
    layers: [{ id: 'gaode', type: 'raster', source: 'gaode' }],
  };
}

/** 本地瓦片：放在 public/tiles/{z}/{x}/{y}.png */
export function localRasterStyle(): StyleSpecification {
  return {
    version: 8,
    name: 'local-china',
    sources: {
      local: {
        type: 'raster',
        tiles: [`${import.meta.env.BASE_URL}tiles/{z}/{x}/{y}.png`],
        tileSize: 256,
        attribution: '本地瓦片',
        maxzoom: 12,
      },
    },
    layers: [{ id: 'local', type: 'raster', source: 'local' }],
  };
}

/** 有 public/tiles/meta.json 且 ready:true 时用本地，否则高德 */
export async function resolveChinaMapStyle(): Promise<{
  style: StyleSpecification;
  source: 'local' | 'gaode';
}> {
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}tiles/meta.json`, { cache: 'no-store' });
    if (res.ok) {
      const meta = (await res.json()) as { ready?: boolean };
      if (meta.ready) {
        return { style: localRasterStyle(), source: 'local' };
      }
    }
  } catch {
    /* fall through */
  }
  return { style: gaodeRasterStyle(), source: 'gaode' };
}
