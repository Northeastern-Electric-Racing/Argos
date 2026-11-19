import { TestBed } from '@angular/core/testing';
import { fakeViewport } from 'src/ui/layout/viewport.testing';
import GraphSidebarComponent from './graph-sidebar.component';

describe('GraphSidebarComponent', () => {
  const render = (width: number) => {
    const viewport = fakeViewport(width);
    TestBed.configureTestingModule({ providers: [viewport.provider] });
    const fixture = TestBed.createComponent(GraphSidebarComponent);
    fixture.componentRef.setInput('dataTypes', []);
    fixture.detectChanges();
    return { fixture, viewport };
  };
  const shown = (el: HTMLElement) =>
    el.querySelector('graph-sidebar-mobile') ? 'mobile' : el.querySelector('graph-sidebar-desktop') ? 'desktop' : 'none';
  const settle = () => new Promise((resolve) => setTimeout(resolve));

  // Tailwind's max-md is < 768px, so 768px itself is desktop.
  it.each([
    [767, 'mobile'],
    [768, 'desktop']
  ])('at %ipx wide shows the %s sidebar', (width, expected) => {
    expect(shown(render(width).fixture.nativeElement)).toBe(expected);
  });

  it('switches at the 768px boundary on resize', async () => {
    const { fixture, viewport } = render(1024);
    viewport.resize(767);
    await settle();
    fixture.detectChanges();
    expect(shown(fixture.nativeElement)).toBe('mobile');

    viewport.resize(768);
    await settle();
    fixture.detectChanges();
    expect(shown(fixture.nativeElement)).toBe('desktop');
  });
});
