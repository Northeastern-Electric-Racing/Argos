import { ComponentFixture, TestBed } from '@angular/core/testing';

import LandingPageConnectionDisplay from './landing-page-connection-display.component';

describe('LandingPageConnectionDisplayComponent', () => {
  let component: LandingPageConnectionDisplay;
  let fixture: ComponentFixture<LandingPageConnectionDisplay>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LandingPageConnectionDisplay]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LandingPageConnectionDisplay);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
