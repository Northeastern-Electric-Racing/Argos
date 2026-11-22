import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ErrorHandler } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { UiIconRegistry } from './icon-registry';

describe('UiIconRegistry', () => {
  const handleError = vi.fn();
  const setup = () => {
    handleError.mockReset();
    TestBed.configureTestingModule({
      providers: [{ provide: ErrorHandler, useValue: { handleError } }, provideHttpClient(), provideHttpClientTesting()]
    });
    const registry = TestBed.inject(UiIconRegistry);
    registry.register({ wifi: 'assets/icons/wifi.svg' });
    return { registry, http: TestBed.inject(HttpTestingController) };
  };
  const svgText = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M0 0h24"/></svg>';

  it('fetches each icon once and hands out a fresh copy every time', async () => {
    const { registry, http } = setup();
    const first = registry.svg('wifi');
    const second = registry.svg('wifi');
    http.expectOne('assets/icons/wifi.svg').flush(svgText);
    const [a, b] = await Promise.all([first, second]);
    expect(a).not.toBeNull();
    expect(a).not.toBe(b);
    expect(a!.getAttribute('preserveAspectRatio')).toBe('xMidYMid meet');
    http.verify();
  });

  it('reports a file that is not an SVG', async () => {
    const { registry, http } = setup();
    const svg = registry.svg('wifi');
    http.expectOne('assets/icons/wifi.svg').flush('<html></html>');
    expect(await svg).toBeNull();
    expect(handleError).toHaveBeenCalled();
  });

  it('draws nothing, quietly, for a name nobody registered (specs render icons unregistered)', async () => {
    const { registry, http } = setup();
    expect(await registry.svg('nope')).toBeNull();
    expect(handleError).not.toHaveBeenCalled();
    http.verify();
  });
});
