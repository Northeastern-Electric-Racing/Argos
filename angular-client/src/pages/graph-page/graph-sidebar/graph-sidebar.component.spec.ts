import { TestBed } from '@angular/core/testing';
import GraphSidebarComponent from './graph-sidebar.component';

describe('GraphSidebarComponent', () => {
  const realWidth = window.innerWidth;
  const setWidth = (value: number) => Object.defineProperty(window, 'innerWidth', { configurable: true, value });
  afterEach(() => setWidth(realWidth));

  const render = (width: number) => {
    setWidth(width);
    const fixture = TestBed.createComponent(GraphSidebarComponent);
    fixture.componentRef.setInput('dataTypes', []);
    fixture.detectChanges();
    return fixture;
  };
  const shown = (el: HTMLElement) =>
    el.querySelector('graph-sidebar-mobile') ? 'mobile' : el.querySelector('graph-sidebar-desktop') ? 'desktop' : 'none';

  // Tailwind's max-md is < 768px, so 768px itself is desktop.
  it.each([
    [767, 'mobile'],
    [768, 'desktop']
  ])('at %ipx wide shows the %s sidebar', (width, expected) => {
    expect(shown(render(width).nativeElement)).toBe(expected);
  });

  it('switches at the 768px boundary on resize', () => {
    const fixture = render(1024);
    setWidth(767);
    window.dispatchEvent(new Event('resize'));
    fixture.detectChanges();
    expect(shown(fixture.nativeElement)).toBe('mobile');

    setWidth(768);
    window.dispatchEvent(new Event('resize'));
    fixture.detectChanges();
    expect(shown(fixture.nativeElement)).toBe('desktop');
  });
});
