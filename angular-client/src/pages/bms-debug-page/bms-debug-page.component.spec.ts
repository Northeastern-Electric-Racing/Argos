import { ComponentFixture, TestBed } from '@angular/core/testing';

import { QuickViewService } from 'src/services/quick-view.service';
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

  it('claims the quick view for pack-level readouts while open, and releases it when destroyed', () => {
    const quickView = TestBed.inject(QuickViewService);

    expect(quickView.readouts().map((r) => r.label)).toEqual([
      'State of Charge',
      'Pack Voltage',
      'High Cell',
      'Low Cell',
      'Max Cell Temp',
      'CCL / DCL',
      'BMS Critical Fault'
    ]);

    fixture.destroy();
    expect(quickView.readouts()).toEqual([]);
  });
});
