import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BmsSegmentViewComponent } from './bms-segment-view.component';

describe('BmsSegmentViewComponent', () => {
  let component: BmsSegmentViewComponent;
  let fixture: ComponentFixture<BmsSegmentViewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BmsSegmentViewComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BmsSegmentViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
