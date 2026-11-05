import { TestBed } from '@angular/core/testing';
import { QuickViewService } from 'src/services/quick-view.service';
import EfusesPageComponent from './efuses-page.component';

describe('EfusesPageComponent', () => {
  beforeEach(() => {
    // The quick view registration is page-level, so skip rendering the eFuse cards.
    TestBed.overrideTemplate(EfusesPageComponent, '');
  });

  it('puts the LV battery in the app quick view while open, and removes it when destroyed', () => {
    const quickView = TestBed.inject(QuickViewService);
    const fixture = TestBed.createComponent(EfusesPageComponent);

    expect(quickView.readouts().map((r) => r.label)).toEqual(['LV Battery']);

    fixture.destroy();
    expect(quickView.readouts()).toEqual([]);
  });
});
