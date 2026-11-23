import { CarSceneError } from './car-view-3d.utils';

// Fetching the car model: presence by magic bytes, revalidated caching, and one timeout over fetch and parse.
// No three here: the parser is passed in, so this is tested with a fake fetch.

/** The first four bytes of every binary glTF file: ASCII "glTF", read as a little-endian uint32. */
export const GLB_MAGIC = 0x46546c67;
/** Fetch and parse together must finish within this, or the model counts as broken. */
export const MODEL_LOAD_TIMEOUT_MS = 20_000;

export const isGlb = (buffer: ArrayBuffer): boolean =>
  buffer.byteLength >= 4 && new DataView(buffer).getUint32(0, true) === GLB_MAGIC;

export type CarModelLoad<T> = { kind: 'absent'; reason: string } | { kind: 'loaded'; model: T };

export interface LoadCarModelOptions {
  fetch?: typeof fetch;
  timeoutMs?: number;
  /** Fraction received (0–1) while the size is known, or null when it isn't. */
  onProgress?: (fraction: number | null) => void;
  /** Aborts the load (the view was destroyed); the promise then rejects with the abort reason. */
  signal?: AbortSignal;
}

/**
 * Loads the car model at `url`. It is **absent** when there is no URL, the response is not ok, or the body is not
 * a GLB (an SPA server answering a missing file with index.html and 200): the view then draws the wiring alone.
 * It is **broken** (CarSceneError 'model') when a GLB fails to parse, or fetch and parse together take longer
 * than the timeout; `onFail` runs first so the caller can stop decoder workers. `no-cache` revalidates with the
 * server (ETag), so a model saved over the old one shows on the next load without a hard reload.
 */
export async function loadCarModel<T>(
  url: string | null,
  parse: (buffer: ArrayBuffer, baseUrl: string) => Promise<T>,
  opts: LoadCarModelOptions = {},
  onFail: () => void = () => undefined
): Promise<CarModelLoad<T>> {
  if (url === null) return { kind: 'absent', reason: 'no model configured' };
  const doFetch = opts.fetch ?? globalThis.fetch.bind(globalThis);
  const controller = new AbortController();
  const abort = () => controller.abort(opts.signal?.reason);
  opts.signal?.addEventListener('abort', abort, { once: true });
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      const error = new Error(`Loading ${url} took longer than ${opts.timeoutMs ?? MODEL_LOAD_TIMEOUT_MS} ms`);
      error.name = 'TimeoutError';
      controller.abort(error);
      reject(error);
    }, opts.timeoutMs ?? MODEL_LOAD_TIMEOUT_MS);
  });
  const work = async (): Promise<CarModelLoad<T>> => {
    const response = await doFetch(url, { cache: 'no-cache', signal: controller.signal });
    if (!response.ok) return { kind: 'absent', reason: `HTTP ${response.status}` };
    const buffer = await readBody(response, opts.onProgress);
    if (!isGlb(buffer))
      return { kind: 'absent', reason: `not a GLB (${response.headers.get('content-type') ?? 'no type'})` };
    return { kind: 'loaded', model: await parse(buffer, new URL('.', new URL(url, document.baseURI)).href) };
  };
  const pending = work();
  // After a timeout the parse may still settle; nobody waits for it any more.
  pending.catch(() => undefined);
  try {
    return await Promise.race([pending, timeout]);
  } catch (cause) {
    if (opts.signal?.aborted) throw opts.signal.reason ?? cause;
    onFail();
    throw new CarSceneError('model', { cause });
  } finally {
    clearTimeout(timer);
    opts.signal?.removeEventListener('abort', abort);
  }
}

/** Reads the body, reporting progress when the server sent a Content-Length. */
async function readBody(response: Response, onProgress?: (fraction: number | null) => void): Promise<ArrayBuffer> {
  const total = Number(response.headers.get('content-length')) || 0;
  if (!response.body || !onProgress) return response.arrayBuffer();
  onProgress(total ? 0 : null);
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    received += value.byteLength;
    onProgress(total ? Math.min(1, received / total) : null);
  }
  const bytes = new Uint8Array(received);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes.buffer;
}
