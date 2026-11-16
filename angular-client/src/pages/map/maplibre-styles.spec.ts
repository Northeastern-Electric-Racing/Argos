import { linkMapLibreStyles, MAPLIBRE_STYLES_HREF } from './maplibre-styles';

describe('linkMapLibreStyles', () => {
  const newDocument = () => document.implementation.createHTMLDocument('map');
  const links = (doc: Document) => [...doc.head.querySelectorAll<HTMLLinkElement>('link[rel=stylesheet]')];

  it('links the maplibre styles bundle once, however many maps are built', () => {
    const doc = newDocument();
    linkMapLibreStyles(doc);
    linkMapLibreStyles(doc);
    expect(links(doc).map((link) => link.getAttribute('href'))).toEqual([MAPLIBRE_STYLES_HREF]);
    expect(MAPLIBRE_STYLES_HREF).toBe('maplibre.css');
  });

  it('links it again if the link has been removed', () => {
    const doc = newDocument();
    linkMapLibreStyles(doc);
    links(doc)[0].remove();
    linkMapLibreStyles(doc);
    expect(links(doc)).toHaveLength(1);
  });
});
