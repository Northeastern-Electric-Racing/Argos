import { ComponentFixture, TestBed } from '@angular/core/testing';

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
