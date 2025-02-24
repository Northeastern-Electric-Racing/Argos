import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SegmentSummaryComponent } from './segment-summary.component';

describe('SegmentSummaryComponent', () => {
  let component: SegmentSummaryComponent;
  let fixture: ComponentFixture<SegmentSummaryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SegmentSummaryComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SegmentSummaryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
