import { MediaMatcher } from '@angular/cdk/layout';
import { Provider } from '@angular/core';

type Listener = (event: { matches: boolean }) => void;

/**
 * A viewport of a given width for specs, at the media query boundary: provides a `MediaMatcher` that answers
 * `(max-width: Npx)` and `(min-width: Npx)` queries for that width (jsdom has no `matchMedia`). `resize` changes the
 * width and notifies the queries whose answer changed, as the browser does.
 */
export const fakeViewport = (initialWidth: number): { provider: Provider; resize: (width: number) => void } => {
  let width = initialWidth;
  const queries: { media: string; matches: () => boolean; listeners: Set<Listener> }[] = [];
  const evaluate = (media: string) => {
    const [, kind, px] = /\((max|min)-width:\s*([\d.]+)px\)/.exec(media) ?? [];
    if (!kind) throw new Error(`fakeViewport cannot answer ${media}`);
    return () => (kind === 'max' ? width <= Number(px) : width >= Number(px));
  };
  const matchMedia = (media: string) => {
    const query = { media, matches: evaluate(media), listeners: new Set<Listener>() };
    queries.push(query);
    return {
      media,
      get matches() {
        return query.matches();
      },
      addListener: (listener: Listener) => query.listeners.add(listener),
      removeListener: (listener: Listener) => query.listeners.delete(listener)
    };
  };
  const resize = (next: number) => {
    const before = queries.map((query) => query.matches());
    width = next;
    queries.forEach((query, i) => {
      const matches = query.matches();
      if (matches !== before[i]) query.listeners.forEach((listener) => listener({ matches }));
    });
  };
  return { provider: { provide: MediaMatcher, useValue: { matchMedia } }, resize };
};
