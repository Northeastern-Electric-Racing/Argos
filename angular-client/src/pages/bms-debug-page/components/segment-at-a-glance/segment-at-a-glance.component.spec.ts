import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SegmentAtAGlanceComponent } from './segment-at-a-glance.component';

describe('SegmentAtAGlanceComponent', () => {
  let component: SegmentAtAGlanceComponent;
  let fixture: ComponentFixture<SegmentAtAGlanceComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SegmentAtAGlanceComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(SegmentAtAGlanceComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('segmentNumber', 0);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
