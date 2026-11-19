import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { NEVER } from 'rxjs';
import Storage from 'src/services/storage.service';
import { fakeViewport } from 'src/ui/layout/viewport.testing';
import ChargingPageComponent from './charging-page.component';

describe('ChargingPageComponent across the mobile breakpoint', () => {
  const render = (width: number) => {
    const viewport = fakeViewport(width);
    TestBed.configureTestingModule({ providers: [viewport.provider, { provide: Storage, useValue: { get: () => NEVER } }] });
    // Only which layout the page picks is under test: leave its displays as bare elements.
    TestBed.overrideComponent(ChargingPageComponent, { set: { imports: [], schemas: [CUSTOM_ELEMENTS_SCHEMA] } });
    const fixture = TestBed.createComponent(ChargingPageComponent);
    fixture.detectChanges();
    return { fixture, viewport };
  };
  const layout = (el: HTMLElement) => (el.querySelector('charging-page-mobile') ? 'mobile' : 'desktop');

  // Tailwind's max-md is < 768px, so 768px itself is desktop.
  it.each([
    [767, 'mobile'],
    [768, 'desktop'],
    [769, 'desktop']
  ])('at %ipx wide shows the %s layout', (width, expected) => {
    expect(layout(render(width).fixture.nativeElement)).toBe(expected);
  });

  it('switches layout when resized across 768px', async () => {
    const { fixture, viewport } = render(768);
    const settle = async () => {
      await new Promise((resolve) => setTimeout(resolve));
      fixture.detectChanges();
    };
    viewport.resize(767);
    await settle();
    expect(layout(fixture.nativeElement)).toBe('mobile');
    viewport.resize(768);
    await settle();
    expect(layout(fixture.nativeElement)).toBe('desktop');
  });
});
