import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AccHighTempComponent } from './acc-high-temp.component';

describe('AccHighTempComponent', () => {
  let component: AccHighTempComponent;
  let fixture: ComponentFixture<AccHighTempComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AccHighTempComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AccHighTempComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
