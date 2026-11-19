/** MapLibre GL's stylesheet: angular.json's non-injected `maplibre` styles bundle (src/styles/maplibre.css). */
export const MAPLIBRE_STYLES_HREF = 'maplibre.css';

/**
 * Links MapLibre GL's stylesheet into the document once, the first time a map opens. The map needn't wait for it:
 * the sheet is all in the vendor layer, which styles.css orders below ours, however late it arrives.
 */
export function linkMapLibreStyles(doc: Document): void {
  if (doc.head.querySelector(`link[href="${MAPLIBRE_STYLES_HREF}"]`)) return;
  const link = doc.createElement('link');
  link.rel = 'stylesheet';
  link.href = MAPLIBRE_STYLES_HREF;
  doc.head.appendChild(link);
}
