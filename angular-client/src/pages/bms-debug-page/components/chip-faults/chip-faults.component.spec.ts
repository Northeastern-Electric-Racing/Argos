import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChipFaultsComponent } from './chip-faults.component';

describe('ChipFaultsComponent', () => {
  let component: ChipFaultsComponent;
  let fixture: ComponentFixture<ChipFaultsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChipFaultsComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(ChipFaultsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
