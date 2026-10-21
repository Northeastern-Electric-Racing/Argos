import { DrawSeries, GraphRenderer, lighten } from './graph-renderer';
import { View } from './graph-scale';

const HOUR = 60 * 60 * 1000;

describe('GraphRenderer', () => {
  let glCanvas: HTMLCanvasElement;
  let renderer: GraphRenderer;
  let gl: WebGL2RenderingContext;

  beforeEach(() => {
    if (!document.createElement('canvas').getContext('webgl2')) {
      pending('WebGL2 is unavailable in this browser');
    }
    glCanvas = document.createElement('canvas');
    renderer = new GraphRenderer(glCanvas, document.createElement('canvas'));
    gl = glCanvas.getContext('webgl2') as WebGL2RenderingContext;
  });

  afterEach(() => renderer?.destroy());

  const series = (name: string, points: [number, number][]): DrawSeries => ({
    name,
    color: '#ffffff',
    visible: true,
    points: points.map(([x, y]) => ({ x, y }))
  });
  const view = (min: number, max: number): View => ({
    x: { min, max },
    zoomBounds: { min, max },
    axes: [{ min: -2, max: 2 }],
    seriesAxis: [0, 0],
    axisSeries: [-1],
    multiDay: false
  });

  /** Columns of the GL canvas's middle row that the lines lit. */
  function litColumns(width: number): number[] {
    const px = new Uint8Array(width * 4);
    gl.readPixels(0, 5, width, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
    return Array.from({ length: width }, (_, i) => i).filter((i) => px[i * 4 + 3] > 0);
  }

  it('lightens a colour toward white for tick labels', () => {
    expect(lighten('#3F51B5', 0)).toBe('rgb(63, 81, 181)');
    expect(lighten('#000000', 0.5)).toBe('rgb(128, 128, 128)');
  });

  it('sizes the canvases to the exact device-pixel box when the browser reports it', () => {
    renderer.resize(905.6, 400, 2, { width: 1811, height: 800 });
    expect(glCanvas.width).toBe(1811);
    expect(glCanvas.height).toBe(800);
  });

  it('ignores a device-pixel size that disagrees with the pixel ratio', () => {
    // Chrome's device emulation reports the 1x box after switching to 2x
    renderer.resize(905.6, 400, 2, { width: 906, height: 400 });
    expect(glCanvas.width).toBe(1811);
    expect(glCanvas.height).toBe(800);
  });

  it('asks for a WebGL2 drawing buffer without multisampling, depth or stencil', () => {
    // 1px lines need none of these, and each multiplies the drawing buffer's GPU memory
    expect(gl.getContextAttributes()).toEqual(
      jasmine.objectContaining({ antialias: false, depth: false, stencil: false, alpha: true })
    );
  });

  it('draws a line where the axes put it when zoomed far from the start of the data', () => {
    // A 7-day range zoomed to 1 s at its end: x relative to the data's start no longer fits Float32
    renderer.resize(1000, 10, 1);
    const area = { left: 0, top: 0, width: 1000, height: 10 };
    let worst = 0;
    for (let k = 0; k < 40; k++) {
      const t = 168 * HOUR + k * 7.31;
      const data = [
        series('start', [[0, 0]]),
        series('mark', [
          [t, -1],
          [t, 1]
        ])
      ];
      renderer.upload(data);
      renderer.draw(data, view(t - 500, t + 500), area, {});
      const cols = litColumns(1000);
      worst = Math.max(worst, cols.length ? Math.abs(cols[0] - 499.5) - 0.5 : Infinity);
    }
    expect(worst).toBeLessThanOrEqual(1);
  });

  it('writes new points into the existing GPU buffer instead of reallocating it', () => {
    const a = series('A', [
      [0, 0],
      [1000, 1]
    ]);
    const b = series('B', [
      [0, 1],
      [1000, 0]
    ]);
    renderer.upload([a, b]);
    const createBuffer = spyOn(gl, 'createBuffer').and.callThrough();
    const bufferSubData = spyOn(gl, 'bufferSubData').and.callThrough();

    a.points.push({ x: 2000, y: 2 });
    renderer.upload([a, b], new Set(['A']));

    expect(createBuffer).not.toHaveBeenCalled();
    expect(bufferSubData).toHaveBeenCalledTimes(1);
  });

  it('draws a point added in place up to its end, and nothing past it', () => {
    renderer.resize(100, 10, 1);
    const area = { left: 0, top: 0, width: 100, height: 10 };
    // y 0.2 is the middle of the row litColumns reads
    const a = series('A', [
      [0, 0.2],
      [40, 0.2]
    ]);
    renderer.upload([a]);

    a.points.push({ x: 70, y: 0.2 });
    renderer.upload([a], new Set(['A']));
    renderer.draw([a], view(0, 100), area, {});

    const cols = litColumns(100);
    expect(cols[0]).toBe(0);
    expect(cols.at(-1)).toBeGreaterThanOrEqual(69);
    expect(cols.at(-1)).toBeLessThanOrEqual(70);
  });
});
