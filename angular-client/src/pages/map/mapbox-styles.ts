/** Mapbox GL's stylesheet: angular.json's non-injected `mapbox` styles bundle (src/styles/mapbox.css). */
export const MAPBOX_STYLES_HREF = 'mapbox.css';

const links = new WeakMap<Document, { link: HTMLLinkElement; load: Promise<void> }>();

/**
 * Links Mapbox GL's stylesheet into the document once, the first time a map page opens, and resolves when it
 * has loaded (or failed: the map is built either way). Build maps after it: Mapbox checks for its CSS then.
 * The sheet is all in the vendor layer, which styles.css orders below ours, however late it arrives.
 */
export function loadMapboxStyles(doc: Document): Promise<void> {
  const linked = links.get(doc);
  if (linked?.link.isConnected) return linked.load;
  const link = doc.createElement('link');
  link.rel = 'stylesheet';
  link.href = MAPBOX_STYLES_HREF;
  const load = new Promise<void>((resolve) => {
    link.addEventListener('load', () => resolve(), { once: true });
    link.addEventListener('error', () => resolve(), { once: true });
  });
  doc.head.appendChild(link);
  links.set(doc, { link, load });
  return load;
}
