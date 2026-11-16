import { TestBed } from '@angular/core/testing';
import { fakeViewport } from 'src/ui/layout/viewport.testing';
import GraphHeaderComponent from './graph-header.component';

describe('GraphHeaderComponent', () => {
  const render = (width: number) => {
    const viewport = fakeViewport(width);
    TestBed.configureTestingModule({ providers: [viewport.provider] });
    const fixture = TestBed.createComponent(GraphHeaderComponent);
    fixture.componentRef.setInput('rightHeader', 'Speed');
    fixture.detectChanges();
    return { fixture, viewport };
  };
  const hasMenuButton = (el: HTMLElement) => el.querySelector('sidebar-toggle') !== null;

  // The same cutoff as the graph sidebar and Tailwind's max-md: 768px itself is desktop.
  it.each([
    [767, true],
    [768, false],
    [769, false]
  ])('at %ipx wide shows the menu button: %s', (width, expected) => {
    expect(hasMenuButton(render(width).fixture.nativeElement)).toBe(expected);
  });

  it('shows the menu button once resized below 768px', async () => {
    const { fixture, viewport } = render(768);
    viewport.resize(767);
    await new Promise((resolve) => setTimeout(resolve));
    fixture.detectChanges();
    expect(hasMenuButton(fixture.nativeElement)).toBe(true);
  });
});
