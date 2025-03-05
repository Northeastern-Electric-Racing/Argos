import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BmsOverflowComponent } from './bms-overflow.component';

describe('BmsOverflowComponent', () => {
  let component: BmsOverflowComponent;
  let fixture: ComponentFixture<BmsOverflowComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BmsOverflowComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BmsOverflowComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
