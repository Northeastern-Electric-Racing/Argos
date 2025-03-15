import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AccHighVoltageComponent } from './acc-high-voltage.component';

describe('AccHighVoltageComponent', () => {
  let component: AccHighVoltageComponent;
  let fixture: ComponentFixture<AccHighVoltageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AccHighVoltageComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(AccHighVoltageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
