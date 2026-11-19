import { TestBed } from '@angular/core/testing';
import APIService from 'src/services/api.service';
import { MapService } from 'src/services/map.service';
import Storage from 'src/services/storage.service';
import MapComponent from './map.component';
import { MAPBOX_STYLES_HREF } from './mapbox-styles';

describe('MapComponent', () => {
  let buildMap: ReturnType<typeof vi.fn>;
  const stylesheet = () =>
    document.head.querySelector<HTMLLinkElement>(`link[rel=stylesheet][href="${MAPBOX_STYLES_HREF}"]`);
  // The loader links again once its link is gone, so each spec starts with no stylesheet.
  afterEach(() => stylesheet()?.remove());

  beforeEach(() => {
    buildMap = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        { provide: MapService, useValue: { buildMap } },
        { provide: Storage, useValue: {} },
        { provide: APIService, useValue: {} }
      ]
    });
    // The page's behaviour, not its children: the run selector and the loading and error pages need the backend.
    TestBed.overrideComponent(MapComponent, { set: { imports: [], template: '<div id="map"></div>' } });
  });

  const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  it('requests the Mapbox stylesheet when the page opens', () => {
    TestBed.createComponent(MapComponent).detectChanges();
    expect(stylesheet()).not.toBeNull();
  });

  it('builds the map only once its stylesheet has loaded (Mapbox checks for its CSS when it builds)', async () => {
    TestBed.createComponent(MapComponent).detectChanges();
    await wait(10);
    expect(buildMap).not.toHaveBeenCalled();
    stylesheet()!.dispatchEvent(new Event('load'));
    await wait(10);
    expect(buildMap).toHaveBeenCalledWith('map');
  });

  it('builds no map after the page has gone', async () => {
    const fixture = TestBed.createComponent(MapComponent);
    fixture.detectChanges();
    fixture.destroy();
    stylesheet()!.dispatchEvent(new Event('load'));
    await wait(10);
    expect(buildMap).not.toHaveBeenCalled();
  });
});
