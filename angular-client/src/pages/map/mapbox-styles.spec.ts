import { loadMapboxStyles, MAPBOX_STYLES_HREF } from './mapbox-styles';

describe('loadMapboxStyles', () => {
  // A fresh document per spec: the loader remembers the stylesheet it linked in each.
  const newDocument = () => document.implementation.createHTMLDocument('map');
  const links = (doc: Document) => [...doc.head.querySelectorAll<HTMLLinkElement>('link[rel=stylesheet]')];

  it('links the mapbox styles bundle once, however many maps are built', () => {
    const doc = newDocument();
    const first = loadMapboxStyles(doc);
    const second = loadMapboxStyles(doc);
    expect(links(doc).map((link) => link.getAttribute('href'))).toEqual([MAPBOX_STYLES_HREF]);
    expect(MAPBOX_STYLES_HREF).toBe('mapbox.css');
    expect(second).toBe(first);
  });

  it('links it again if the link has been removed', () => {
    const doc = newDocument();
    void loadMapboxStyles(doc);
    links(doc)[0].remove();
    void loadMapboxStyles(doc);
    expect(links(doc)).toHaveLength(1);
  });

  it('resolves once the stylesheet has loaded', async () => {
    const doc = newDocument();
    let loaded = false;
    void loadMapboxStyles(doc).then(() => (loaded = true));
    await Promise.resolve();
    expect(loaded).toBe(false);
    links(doc)[0].dispatchEvent(new Event('load'));
    await Promise.resolve();
    expect(loaded).toBe(true);
  });

  it('resolves when the stylesheet fails too, so the map is still built', async () => {
    const doc = newDocument();
    const styles = loadMapboxStyles(doc);
    links(doc)[0].dispatchEvent(new Event('error'));
    await expect(styles).resolves.toBeUndefined();
  });
});
