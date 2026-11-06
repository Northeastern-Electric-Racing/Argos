import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { BehaviorSubject, of } from 'rxjs';
import { HeatMapService, HeatMapView } from 'src/services/heat-map.service';

import { BmsSegmentViewComponent } from './bms-segment-view.component';

describe('BmsSegmentViewComponent', () => {
  let component: BmsSegmentViewComponent;
  let fixture: ComponentFixture<BmsSegmentViewComponent>;
  let params: BehaviorSubject<ReturnType<typeof convertToParamMap>>;

  beforeEach(async () => {
    params = new BehaviorSubject(convertToParamMap({ id: '1' }));
    const routeMock = { url: of([]), paramMap: params };
    const routerMock = { navigate: () => Promise.resolve(true), url: '/bms/segment/1' };

    await TestBed.configureTestingModule({
      imports: [BmsSegmentViewComponent],
      providers: [
        { provide: ActivatedRoute, useValue: routeMock },
        { provide: Router, useValue: routerMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(BmsSegmentViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it("names its selects for their purpose: this segment's view and the view for all segments", () => {
    const names = Array.from<HTMLElement>(fixture.nativeElement.querySelectorAll('[role=combobox]')).map((c) =>
      c.getAttribute('aria-label')
    );
    expect(names).toEqual(['Segment', 'Segment 1 heat map view', 'Heat map view for all segments']);
  });

  describe('when the route moves to another segment (the router reuses the page)', () => {
    const names = () =>
      Array.from<HTMLElement>(fixture.nativeElement.querySelectorAll('[role=combobox]')).map((c) =>
        c.getAttribute('aria-label')
      );
    const moveTo = async (id: string) => {
      params.next(convertToParamMap({ id }));
      await fixture.whenStable();
    };

    beforeEach(async () => {
      fixture.autoDetectChanges();
      await fixture.whenStable();
    });

    it('renders the new segment with nothing else to trigger change detection (a keyboard pick on a phone)', async () => {
      await moveTo('3');
      await moveTo('4');
      expect(fixture.nativeElement.textContent).toContain('Segment 4: Cell-by-Cell');
      expect(names()).toContain('Segment 4 heat map view');
    });

    it("follows only the shown segment's view, not those of segments shown before", async () => {
      const heatMap = TestBed.inject(HeatMapService);
      await moveTo('3');
      await moveTo('4');
      heatMap.setCurrentView(3, HeatMapView.Voltage);
      heatMap.setCurrentView(2, HeatMapView.Balancing);
      await fixture.whenStable();
      expect(component.currentSegmentSelectorConfig().defaultValue).toBe(HeatMapView.Voltage);
    });
  });
});
