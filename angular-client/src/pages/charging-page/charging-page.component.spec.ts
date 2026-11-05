import { TestBed } from '@angular/core/testing';
import { QuickViewService } from 'src/services/quick-view.service';
import ChargingPageComponent from './charging-page.component';

describe('ChargingPageComponent', () => {
  beforeEach(() => {
    // The quick view registration is page-level, so skip rendering the graphs and widgets.
    TestBed.overrideTemplate(ChargingPageComponent, '');
  });

  it('claims the quick view for charging readouts while open, and releases it when destroyed', () => {
    const quickView = TestBed.inject(QuickViewService);
    const fixture = TestBed.createComponent(ChargingPageComponent);

    expect(quickView.readouts().map((r) => r.label)).toEqual([
      'State of Charge',
      'Pack Voltage',
      'Charging Current',
      'BMS State',
      'Balancing',
      'Cell Spread',
      'Max Cell Temp',
      'Charger Fault'
    ]);

    fixture.destroy();
    expect(quickView.readouts()).toEqual([]);
  });
});
