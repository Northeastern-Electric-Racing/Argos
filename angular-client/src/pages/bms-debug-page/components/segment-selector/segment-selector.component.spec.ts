import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SegmentSelectorComponent } from './segment-selector.component';

describe('SegmentSelectorComponent', () => {
  let component: SegmentSelectorComponent;
  let fixture: ComponentFixture<SegmentSelectorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SegmentSelectorComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(SegmentSelectorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
