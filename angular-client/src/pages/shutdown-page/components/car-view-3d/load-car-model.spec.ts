import { CarSceneError } from './car-view-3d.utils';
import { GLB_MAGIC, isGlb, loadCarModel } from './load-car-model';

const glb = (length = 64) => {
  const bytes = new Uint8Array(length);
  new DataView(bytes.buffer).setUint32(0, GLB_MAGIC, true);
  return bytes;
};
const respond =
  (body: BodyInit | null, init: ResponseInit = {}): typeof fetch =>
  () =>
    Promise.resolve(new Response(body, init));
const parsed = { scene: 'car' };
const parse = vi.fn(() => Promise.resolve(parsed));

describe('isGlb', () => {
  it('recognises the glTF magic and nothing else', () => {
    expect(isGlb(glb().buffer)).toBe(true);
    expect(isGlb(new TextEncoder().encode('<!doctype html>').buffer as ArrayBuffer)).toBe(false);
    expect(isGlb(new ArrayBuffer(2))).toBe(false);
  });
});

describe('loadCarModel', () => {
  beforeEach(() => parse.mockClear());
  afterEach(() => vi.useRealTimers());

  it('loads and parses a GLB, revalidating with the server', async () => {
    const fetch = vi.fn(respond(glb(), { status: 200 }));
    await expect(loadCarModel('assets/models/car.glb', parse, { fetch })).resolves.toEqual({
      kind: 'loaded',
      model: parsed
    });
    expect(fetch).toHaveBeenCalledWith('assets/models/car.glb', expect.objectContaining({ cache: 'no-cache' }));
    expect(parse).toHaveBeenCalledWith(expect.any(ArrayBuffer), expect.stringMatching(/\/assets\/models\/$/));
  });

  it('treats no URL as absent without fetching', async () => {
    const fetch = vi.fn();
    await expect(loadCarModel(null, parse, { fetch })).resolves.toMatchObject({ kind: 'absent' });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('treats a 404 as absent', async () => {
    const result = await loadCarModel('car.glb', parse, { fetch: respond('Not found', { status: 404 }) });
    expect(result).toEqual({ kind: 'absent', reason: 'HTTP 404' });
    expect(parse).not.toHaveBeenCalled();
  });

  it('treats index.html served with 200 (SPA fallback) as absent, not as a broken model', async () => {
    const html = respond('<!doctype html><html></html>', { status: 200, headers: { 'content-type': 'text/html' } });
    const result = await loadCarModel('car.glb', parse, { fetch: html });
    expect(result).toEqual({ kind: 'absent', reason: 'not a GLB (text/html)' });
    expect(parse).not.toHaveBeenCalled();
  });

  it('reports a GLB that fails to parse as a broken model and lets the caller stop its decoders', async () => {
    const onFail = vi.fn();
    const broken = () => Promise.reject(new Error('Unexpected end of buffer'));
    const load = loadCarModel('car.glb', broken, { fetch: respond(glb(12), { status: 200 }) }, onFail);
    await expect(load).rejects.toBeInstanceOf(CarSceneError);
    await expect(load).rejects.toMatchObject({ kind: 'model' });
    expect(onFail).toHaveBeenCalledTimes(1);
  });

  it('gives up on a request that never answers once the timeout passes', async () => {
    vi.useFakeTimers();
    const onFail = vi.fn();
    let signal: AbortSignal | undefined;
    const hang: typeof fetch = (_url, init) => {
      signal = init?.signal ?? undefined;
      return new Promise(() => undefined);
    };
    const load = loadCarModel('car.glb', parse, { fetch: hang, timeoutMs: 20_000 }, onFail);
    const settled = expect(load).rejects.toMatchObject({ kind: 'model' });
    await vi.advanceTimersByTimeAsync(19_999);
    expect(onFail).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    await settled;
    expect(onFail).toHaveBeenCalledTimes(1);
    expect(signal?.aborted).toBe(true);
  });

  it('times out a parse that hangs (a Draco decoder that never answers)', async () => {
    vi.useFakeTimers();
    const onFail = vi.fn();
    const hangingParse = () => new Promise<never>(() => undefined);
    const load = loadCarModel('car.glb', hangingParse, { fetch: respond(glb(), { status: 200 }), timeoutMs: 1000 }, onFail);
    const settled = expect(load).rejects.toMatchObject({ kind: 'model' });
    await vi.advanceTimersByTimeAsync(1000);
    await settled;
    expect(onFail).toHaveBeenCalled();
  });

  it('reports progress when the size is known', async () => {
    const progress: (number | null)[] = [];
    const body = glb(100);
    const fetch = respond(body, { status: 200, headers: { 'content-length': '100' } });
    await loadCarModel('car.glb', parse, { fetch, onProgress: (f) => progress.push(f) });
    expect(progress[0]).toBe(0);
    expect(progress.at(-1)).toBe(1);
  });

  it('rejects with the abort reason, not as a broken model, when the caller aborts', async () => {
    const controller = new AbortController();
    const onFail = vi.fn();
    const hang: typeof fetch = (_url, init) =>
      new Promise((_, reject) => init?.signal?.addEventListener('abort', () => reject(init.signal!.reason)));
    const load = loadCarModel('car.glb', parse, { fetch: hang, signal: controller.signal }, onFail);
    controller.abort(new Error('destroyed'));
    await expect(load).rejects.toThrow('destroyed');
    expect(onFail).not.toHaveBeenCalled();
  });
});
