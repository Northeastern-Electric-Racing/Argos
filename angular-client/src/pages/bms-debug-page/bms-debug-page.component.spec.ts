import { ComponentFixture, TestBed } from '@angular/core/testing';

import { fakeViewport } from 'src/ui/layout/viewport.testing';
import { BmsDebugPageComponent } from './bms-debug-page.component';

describe('BmsDebugPageComponent', () => {
  let component: BmsDebugPageComponent;
  let fixture: ComponentFixture<BmsDebugPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BmsDebugPageComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(BmsDebugPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it("names every select for its purpose: the segment, each row's view, and the view for all segments", () => {
    const names = Array.from<HTMLElement>(fixture.nativeElement.querySelectorAll('[role=combobox]')).map((c) =>
      c.getAttribute('aria-label')
    );
    expect(names).toEqual([
      'Segment',
      'Heat map view for all segments',
      ...[1, 2, 3, 4, 5].map((n) => `Segment ${n} heat map view`)
    ]);
  });
});

describe('BmsDebugPageComponent across the mobile breakpoint', () => {
  const render = (width: number) => {
    const viewport = fakeViewport(width);
    TestBed.configureTestingModule({ imports: [BmsDebugPageComponent], providers: [viewport.provider] });
    const fixture = TestBed.createComponent(BmsDebugPageComponent);
    fixture.detectChanges();
    return { fixture, viewport };
  };
  // Below 768px the page has no layout yet (#713); from 768px, as with Tailwind's max-md, it is the desktop grid.
  const hasDesktopGrid = (el: HTMLElement) => el.querySelector('bms-header') !== null;

  it.each([
    [767, false],
    [768, true],
    [769, true]
  ])('at %ipx wide shows the desktop grid: %s', (width, expected) => {
    expect(hasDesktopGrid(render(width).fixture.nativeElement)).toBe(expected);
  });

  it('keeps the desktop grid when resized to 768px, and drops it below', async () => {
    const { fixture, viewport } = render(1024);
    const settle = async () => {
      await new Promise((resolve) => setTimeout(resolve));
      fixture.detectChanges();
    };
    viewport.resize(768);
    await settle();
    expect(hasDesktopGrid(fixture.nativeElement)).toBe(true);
    viewport.resize(767);
    await settle();
    expect(hasDesktopGrid(fixture.nativeElement)).toBe(false);
  });
});
