import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BmsAtAGlanceComponent } from './bms-at-a-glance.component';

describe('BmsAtAGlanceComponent', () => {
  let component: BmsAtAGlanceComponent;
  let fixture: ComponentFixture<BmsAtAGlanceComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BmsAtAGlanceComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(BmsAtAGlanceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
