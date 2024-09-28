import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LandingPageLatencyDisplayComponent } from './landing-page-latency-display.component';

describe('LandingPageLatencyDisplayComponent', () => {
  let component: LandingPageLatencyDisplayComponent;
  let fixture: ComponentFixture<LandingPageLatencyDisplayComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LandingPageLatencyDisplayComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LandingPageLatencyDisplayComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
