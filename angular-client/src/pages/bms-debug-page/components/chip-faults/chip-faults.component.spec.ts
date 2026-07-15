import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Chip } from 'src/utils/bms.utils';

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
    fixture.componentRef.setInput('chip', Chip.Alpha);
    fixture.componentRef.setInput('segment', 0);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
