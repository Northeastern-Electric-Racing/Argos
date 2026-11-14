import { GeoJSONSource, LayerSpecification, Map as MapLibreMap, StyleSpecification } from 'maplibre-gl';
import Theme from 'src/services/theme.service';
import { DataValue } from './socket.utils';
import { Coordinate, Fix, Track } from './types.utils';

export const LINES = [
  { kind: 'start', field: 'startLine', color: Theme.battteryHigh, label: 'Start line' },
  { kind: 'finish', field: 'finishLine', color: Theme.accent, label: 'Finish line' }
] as const;
export type LineSpec = (typeof LINES)[number];

const toLngLat = (point: Coordinate): [number, number] => [point.lon, point.lat];

export const fromLngLat = ({ lng, lat }: { lng: number; lat: number }): Coordinate => ({ lat, lon: lng });

export const toFix = (point: DataValue): Fix => ({
  lat: parseFloat(point.values[0]),
  lon: parseFloat(point.values[1]),
  timeMs: Number(point.time)
});

// Don't draw a straight line across missing GPS, e.g. a dropout. A long Run's stored trace comes back as every nth fix,
// so a gap only counts as missing GPS if it is well over its neighbours.
const MIN_MISSING_GPS_MS = 2_000;
const MISSING_GPS_SPACINGS = 3;

export const traceGeoJson = (trace: Fix[]) => {
  const gapsMs = trace.slice(1).map((fix, index) => fix.timeMs - trace[index].timeMs);
  const lines: [number, number][][] = [];
  trace.forEach((fix, index) => {
    const neighbourGapMs = Math.min(gapsMs[index - 2] ?? Infinity, gapsMs[index] ?? Infinity);
    if (index === 0 || gapsMs[index - 1] > Math.max(MIN_MISSING_GPS_MS, MISSING_GPS_SPACINGS * neighbourGapMs))
      lines.push([]);
    lines.at(-1)?.push(toLngLat(fix));
  });
  return { type: 'Feature' as const, properties: {}, geometry: { type: 'MultiLineString' as const, coordinates: lines } };
};

export const pointGeoJson = (point: Coordinate | null) => ({
  type: 'FeatureCollection' as const,
  features: point
    ? [{ type: 'Feature' as const, properties: {}, geometry: { type: 'Point' as const, coordinates: toLngLat(point) } }]
    : []
});

export const linesGeoJson = (track: Track | null) => ({
  type: 'FeatureCollection' as const,
  features: LINES.flatMap(({ kind, field }) => {
    const line = track?.[field];
    return line
      ? [
          {
            type: 'Feature' as const,
            properties: { kind },
            geometry: { type: 'LineString' as const, coordinates: [toLngLat(line.a), toLngLat(line.b)] }
          }
        ]
      : [];
  })
});

export const linePoints = (track: Track): Coordinate[] =>
  LINES.flatMap(({ field }) => {
    const line = track[field];
    return line ? [line.a, line.b] : [];
  });

export const draftLineGeoJson = (pendingEnd: Coordinate | null, cursor: Coordinate | null) => ({
  type: 'FeatureCollection' as const,
  features: pendingEnd
    ? [
        {
          type: 'Feature' as const,
          properties: {},
          geometry: { type: 'Point' as const, coordinates: toLngLat(pendingEnd) }
        },
        ...(cursor
          ? [
              {
                type: 'Feature' as const,
                properties: {},
                geometry: { type: 'LineString' as const, coordinates: [toLngLat(pendingEnd), toLngLat(cursor)] }
              }
            ]
          : [])
      ]
    : []
});

const EARTH_RADIUS_M = 6371000;
const HOVER_RADIUS_PX = 10;
const metresPerDegree = (EARTH_RADIUS_M * Math.PI) / 180;

const distanceMetres = (point: Coordinate, origin: Coordinate) =>
  Math.hypot(
    (point.lon - origin.lon) * Math.cos((origin.lat * Math.PI) / 180) * metresPerDegree,
    (point.lat - origin.lat) * metresPerDegree
  );

/** The trace fix under the cursor, if one is drawn within a few pixels of it */
export const fixAt = <T extends Coordinate>(
  trace: T[],
  cursor: Coordinate,
  toScreen: (point: Coordinate) => { x: number; y: number }
): T | null => {
  const fix = trace.reduce<T | null>(
    (nearest, fix) => (!nearest || distanceMetres(fix, cursor) < distanceMetres(nearest, cursor) ? fix : nearest),
    null
  );
  if (!fix) return null;
  const [fixPx, cursorPx] = [toScreen(fix), toScreen(cursor)];
  return Math.hypot(fixPx.x - cursorPx.x, fixPx.y - cursorPx.y) <= HOVER_RADIUS_PX ? fix : null;
};

const OVERLAY_SOURCES = ['trace', 'lines', 'car', 'draft'] as const;
type OverlaySource = (typeof OVERLAY_SOURCES)[number];

export const setOverlay = (
  map: MapLibreMap | undefined,
  source: OverlaySource,
  data: Parameters<GeoJSONSource['setData']>[0]
) => map?.getSource<GeoJSONSource>(source)?.setData(data);

const OVERLAY_LAYERS: LayerSpecification[] = [
  {
    id: 'trace',
    type: 'line',
    source: 'trace',
    layout: { 'line-join': 'round', 'line-cap': 'round' },
    paint: { 'line-color': Theme.fgMuted, 'line-width': 7 }
  },
  ...LINES.map(
    ({ kind, color }): LayerSpecification => ({
      id: `${kind}-line`,
      type: 'line',
      source: 'lines',
      filter: ['==', ['get', 'kind'], kind],
      layout: { 'line-cap': 'round' },
      paint: { 'line-color': color, 'line-width': 4 }
    })
  ),
  {
    id: 'draft-line',
    type: 'line',
    source: 'draft',
    filter: ['==', ['geometry-type'], 'LineString'],
    paint: { 'line-color': Theme.fg, 'line-width': 2, 'line-dasharray': [2, 2] }
  },
  {
    id: 'draft-end',
    type: 'circle',
    source: 'draft',
    filter: ['==', ['geometry-type'], 'Point'],
    paint: { 'circle-radius': 6, 'circle-color': Theme.fg, 'circle-stroke-color': Theme.page, 'circle-stroke-width': 2 }
  },
  {
    id: 'car',
    type: 'circle',
    source: 'car',
    paint: { 'circle-radius': 7, 'circle-color': Theme.accent, 'circle-stroke-color': Theme.fg, 'circle-stroke-width': 2 }
  }
];

const BASEMAP_COLORS = {
  earth: '#1b1b1b',
  green: '#18211b',
  parking: '#262626',
  water: '#0f1b26',
  minorRoad: '#2f2f2f',
  majorRoad: '#3e3e3e',
  building: '#232323'
};
const GREEN_LANDUSE = ['park', 'forest', 'wood', 'grass', 'garden', 'golf_course', 'nature_reserve', 'playground'];

// Fill and line layers only: symbol layers would need font glyphs and sprites from the network.
const BASEMAP_LAYERS: LayerSpecification[] = [
  {
    id: 'earth',
    type: 'fill',
    source: 'basemap',
    'source-layer': 'earth',
    paint: { 'fill-color': BASEMAP_COLORS.earth }
  },
  {
    id: 'landuse',
    type: 'fill',
    source: 'basemap',
    'source-layer': 'landuse',
    filter: ['in', ['get', 'kind'], ['literal', ['parking', ...GREEN_LANDUSE]]],
    paint: {
      'fill-color': ['match', ['get', 'kind'], 'parking', BASEMAP_COLORS.parking, BASEMAP_COLORS.green]
    }
  },
  {
    id: 'water',
    type: 'fill',
    source: 'basemap',
    'source-layer': 'water',
    filter: ['==', ['geometry-type'], 'Polygon'],
    paint: { 'fill-color': BASEMAP_COLORS.water }
  },
  {
    id: 'roads',
    type: 'line',
    source: 'basemap',
    'source-layer': 'roads',
    layout: { 'line-join': 'round', 'line-cap': 'round' },
    paint: {
      'line-color': [
        'match',
        ['get', 'kind'],
        ['highway', 'major_road'],
        BASEMAP_COLORS.majorRoad,
        BASEMAP_COLORS.minorRoad
      ],
      'line-width': ['match', ['get', 'kind'], 'highway', 4, 'major_road', 3, 'minor_road', 2, 1]
    }
  },
  {
    id: 'buildings',
    type: 'fill',
    source: 'basemap',
    'source-layer': 'buildings',
    paint: { 'fill-color': BASEMAP_COLORS.building }
  }
];

// The overlays start empty and setOverlay fills them; the basemap is fetched by utils/fetch-basemap.sh and built into
// the client, so the map needs no internet.
export const MAP_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    basemap: { type: 'vector', url: 'pmtiles:///assets/map/basemap.pmtiles' },
    ...Object.fromEntries(
      OVERLAY_SOURCES.map((source) => [source, { type: 'geojson', data: { type: 'FeatureCollection', features: [] } }])
    )
  },
  layers: [
    { id: 'background', type: 'background', paint: { 'background-color': Theme.page } },
    ...BASEMAP_LAYERS,
    ...OVERLAY_LAYERS
  ]
};
