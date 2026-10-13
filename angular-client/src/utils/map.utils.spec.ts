import { LayerSpecification } from 'maplibre-gl';
import {
  carGeoJson,
  draftLineGeoJson,
  linesGeoJson,
  mapStyle,
  overlayLayers,
  pointGeoJson,
  toFix,
  traceFromPoints,
  traceGeoJson
} from './map.utils';
import { DataValue } from './socket.utils';
import { Track } from './types.utils';

const point = (lat: string, lon: string, time: string): DataValue => ({ values: [lat, lon], time, unit: 'deg' });

const track: Track = {
  id: 1,
  name: 'Loop',
  startLine: { a: { lat: 42, lon: -84 }, b: { lat: 42.1, lon: -84.1 } },
  finishLine: { a: { lat: 43, lon: -85 }, b: { lat: 43.1, lon: -85.1 } }
};

describe('toFix', () => {
  it('reads latitude then longitude from the point values, and the time in ms', () => {
    expect(toFix(point('42.5', '-84.25', '1712345678901'))).toEqual({ lat: 42.5, lon: -84.25, timeMs: 1712345678901 });
  });
});

describe('traceFromPoints', () => {
  it('orders points by time', () => {
    const trace = traceFromPoints([point('3', '30', '300'), point('1', '10', '100'), point('2', '20', '200')]);

    expect(trace).toEqual([
      { lat: 1, lon: 10, timeMs: 100 },
      { lat: 2, lon: 20, timeMs: 200 },
      { lat: 3, lon: 30, timeMs: 300 }
    ]);
  });

  it('is empty without points', () => {
    expect(traceFromPoints([])).toEqual([]);
  });
});

describe('traceGeoJson', () => {
  it('draws the trace as a line in longitude, latitude order', () => {
    expect(
      traceGeoJson([
        { lat: 1, lon: 10 },
        { lat: 2, lon: 20 }
      ])
    ).toEqual({
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'LineString',
        coordinates: [
          [10, 1],
          [20, 2]
        ]
      }
    });
  });
});

describe('carGeoJson', () => {
  it('puts the car at the last point of the trace', () => {
    expect(
      carGeoJson([
        { lat: 1, lon: 10 },
        { lat: 2, lon: 20 }
      ])
    ).toEqual({
      type: 'FeatureCollection',
      features: [{ type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [20, 2] } }]
    });
  });

  it('has no car without a trace', () => {
    expect(carGeoJson([])).toEqual({ type: 'FeatureCollection', features: [] });
  });
});

describe('pointGeoJson', () => {
  it('draws the point in longitude, latitude order', () => {
    expect(pointGeoJson({ lat: 2, lon: 20 })).toEqual({
      type: 'FeatureCollection',
      features: [{ type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [20, 2] } }]
    });
  });

  it('draws nothing without a point', () => {
    expect(pointGeoJson(null)).toEqual({ type: 'FeatureCollection', features: [] });
  });
});

describe('linesGeoJson', () => {
  it('draws the start and finish lines tagged by kind', () => {
    expect(linesGeoJson(track)).toEqual({
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: { kind: 'start' },
          geometry: {
            type: 'LineString',
            coordinates: [
              [-84, 42],
              [-84.1, 42.1]
            ]
          }
        },
        {
          type: 'Feature',
          properties: { kind: 'finish' },
          geometry: {
            type: 'LineString',
            coordinates: [
              [-85, 43],
              [-85.1, 43.1]
            ]
          }
        }
      ]
    });
  });

  it('draws only the start line when there is no finish line', () => {
    expect(linesGeoJson({ ...track, finishLine: null }).features.map((feature) => feature.properties.kind)).toEqual([
      'start'
    ]);
  });

  it('draws only the finish line when there is no start line', () => {
    expect(linesGeoJson({ ...track, startLine: null }).features.map((feature) => feature.properties.kind)).toEqual([
      'finish'
    ]);
  });

  it('draws nothing without a track', () => {
    expect(linesGeoJson(null)).toEqual({ type: 'FeatureCollection', features: [] });
  });
});

describe('draftLineGeoJson', () => {
  const a = { lat: 42, lon: -84 };

  it('draws the pending end and a preview segment to the cursor', () => {
    expect(draftLineGeoJson(a, { lat: 42.1, lon: -84.1 })).toEqual({
      type: 'FeatureCollection',
      features: [
        { type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [-84, 42] } },
        {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: [
              [-84, 42],
              [-84.1, 42.1]
            ]
          }
        }
      ]
    });
  });

  it('draws only the pending end when the cursor is off the map', () => {
    expect(draftLineGeoJson(a, null).features.map((feature) => feature.geometry.type)).toEqual(['Point']);
  });

  it('draws nothing before the first end is placed', () => {
    expect(draftLineGeoJson(null, a)).toEqual({ type: 'FeatureCollection', features: [] });
  });
});

describe('mapStyle', () => {
  const background: LayerSpecification = {
    id: 'background',
    type: 'background',
    paint: { 'background-color': '#101010' }
  };

  it('is the background alone without a PMTiles file', () => {
    expect(mapStyle('#101010', undefined)).toEqual({ version: 8, sources: {}, layers: [background] });
    expect(mapStyle('#101010', '')).toEqual({ version: 8, sources: {}, layers: [background] });
  });

  it('draws the OpenStreetMap basemap from the PMTiles file with fill and line layers only', () => {
    const style = mapStyle('#101010', '/assets/map/venue.pmtiles');

    expect(style.sources).toEqual({
      basemap: {
        type: 'vector',
        url: 'pmtiles:///assets/map/venue.pmtiles'
      }
    });
    expect(style.layers[0]).toEqual(background);
    expect(style.layers.map((layer) => [layer.id, layer.type])).toEqual([
      ['background', 'background'],
      ['earth', 'fill'],
      ['landuse', 'fill'],
      ['water', 'fill'],
      ['roads', 'line'],
      ['buildings', 'fill']
    ]);
    expect(style.glyphs).toBeUndefined();
    expect(style.sprite).toBeUndefined();
  });
});

describe('overlayLayers', () => {
  it('stacks the overlays from the trace up to the snap ring', () => {
    expect(overlayLayers((variable) => variable).map((layer) => layer.id)).toEqual([
      'trace',
      'start-line',
      'finish-line',
      'draft-line',
      'draft-end',
      'car',
      'snap'
    ]);
  });

  it('draws each timing line in its color', () => {
    const line = (kind: string, color: string): LayerSpecification => ({
      id: `${kind}-line`,
      type: 'line',
      source: 'lines',
      filter: ['==', ['get', 'kind'], kind],
      layout: { 'line-cap': 'round' },
      paint: { 'line-color': color, 'line-width': 4 }
    });
    const layers = overlayLayers((variable) => variable);

    expect(layers.filter((layer) => layer.type === 'line' && layer.source === 'lines')).toEqual([
      line('start', '--color-timing-start'),
      line('finish', '--color-timing-finish')
    ]);
  });
});
