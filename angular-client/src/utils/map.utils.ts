import { GeoJSONSource, LayerSpecification, Map as MapLibreMap, StyleSpecification } from 'maplibre-gl';
import { DataValue } from './socket.utils';
import { SNAP_RADIUS_PX } from './track.utils';
import { Coordinate, Fix, Track } from './types.utils';

export const LINES = [
  { kind: 'start', field: 'startLine', colorVar: '--color-timing-start', label: 'Start line' },
  { kind: 'finish', field: 'finishLine', colorVar: '--color-timing-finish', label: 'Finish line' }
] as const;
export type LineSpec = (typeof LINES)[number];

const toLngLat = (point: Coordinate): [number, number] => [point.lon, point.lat];

export const fromLngLat = ({ lng, lat }: { lng: number; lat: number }): Coordinate => ({ lat, lon: lng });

export const toFix = (point: DataValue): Fix => ({
  lat: parseFloat(point.values[0]),
  lon: parseFloat(point.values[1]),
  timeMs: Number(point.time)
});

// The DB returns a run's points in no particular order.
export const traceFromPoints = (points: DataValue[]): Fix[] => points.map(toFix).sort((a, b) => a.timeMs - b.timeMs);

export const traceGeoJson = (trace: Coordinate[]) => ({
  type: 'Feature' as const,
  properties: {},
  geometry: { type: 'LineString' as const, coordinates: trace.map(toLngLat) }
});

export const pointGeoJson = (point: Coordinate | null) => ({
  type: 'FeatureCollection' as const,
  features: point
    ? [{ type: 'Feature' as const, properties: {}, geometry: { type: 'Point' as const, coordinates: toLngLat(point) } }]
    : []
});

export const carGeoJson = (trace: Coordinate[]) => pointGeoJson(trace.at(-1) ?? null);

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

export const draftLineGeoJson = (a: Coordinate | null, cursor: Coordinate | null) => ({
  type: 'FeatureCollection' as const,
  features: a
    ? [
        { type: 'Feature' as const, properties: {}, geometry: { type: 'Point' as const, coordinates: toLngLat(a) } },
        ...(cursor
          ? [
              {
                type: 'Feature' as const,
                properties: {},
                geometry: { type: 'LineString' as const, coordinates: [toLngLat(a), toLngLat(cursor)] }
              }
            ]
          : [])
      ]
    : []
});

export const OVERLAY_SOURCES = ['trace', 'lines', 'car', 'draft', 'snap'] as const;
type OverlaySource = (typeof OVERLAY_SOURCES)[number];

export const setOverlay = (
  map: MapLibreMap | undefined,
  source: OverlaySource,
  data: Parameters<GeoJSONSource['setData']>[0]
) => map?.getSource<GeoJSONSource>(source)?.setData(data);

export const overlayLayers = (color: (variable: string) => string): LayerSpecification[] => [
  {
    id: 'trace',
    type: 'line',
    source: 'trace',
    layout: { 'line-join': 'round', 'line-cap': 'round' },
    paint: { 'line-color': color('--color-text-secondary'), 'line-width': 7 }
  },
  ...LINES.map(
    ({ kind, colorVar }): LayerSpecification => ({
      id: `${kind}-line`,
      type: 'line',
      source: 'lines',
      filter: ['==', ['get', 'kind'], kind],
      layout: { 'line-cap': 'round' },
      paint: { 'line-color': color(colorVar), 'line-width': 4 }
    })
  ),
  {
    id: 'draft-line',
    type: 'line',
    source: 'draft',
    filter: ['==', ['geometry-type'], 'LineString'],
    paint: { 'line-color': color('--color-text-primary'), 'line-width': 2, 'line-dasharray': [2, 2] }
  },
  {
    id: 'draft-end',
    type: 'circle',
    source: 'draft',
    filter: ['==', ['geometry-type'], 'Point'],
    paint: {
      'circle-radius': 6,
      'circle-color': color('--color-text-primary'),
      'circle-stroke-color': color('--color-background-page'),
      'circle-stroke-width': 2
    }
  },
  {
    id: 'car',
    type: 'circle',
    source: 'car',
    paint: {
      'circle-radius': 7,
      'circle-color': color('--color-timing-finish'),
      'circle-stroke-color': color('--color-text-primary'),
      'circle-stroke-width': 2
    }
  },
  {
    id: 'snap',
    type: 'circle',
    source: 'snap',
    paint: {
      'circle-radius': SNAP_RADIUS_PX,
      'circle-color': 'transparent',
      'circle-stroke-color': color('--color-text-primary'),
      'circle-stroke-width': 2
    }
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

export const mapStyle = (backgroundColor: string, pmtilesUrl: string | undefined): StyleSpecification => {
  const background: LayerSpecification = {
    id: 'background',
    type: 'background',
    paint: { 'background-color': backgroundColor }
  };
  if (!pmtilesUrl) return { version: 8, sources: {}, layers: [background] };
  return {
    version: 8,
    sources: {
      basemap: {
        type: 'vector',
        url: `pmtiles://${pmtilesUrl}`
      }
    },
    layers: [background, ...BASEMAP_LAYERS]
  };
};
