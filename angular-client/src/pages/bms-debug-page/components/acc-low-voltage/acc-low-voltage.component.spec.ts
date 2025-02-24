import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AccLowVoltageComponent } from './acc-low-voltage.component';

describe('AccLowVoltageComponent', () => {
  let component: AccLowVoltageComponent;
  let fixture: ComponentFixture<AccLowVoltageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AccLowVoltageComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(AccLowVoltageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
