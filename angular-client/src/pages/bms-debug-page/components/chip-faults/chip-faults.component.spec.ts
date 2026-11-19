import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Chip } from 'src/utils/bms.utils';
import { FaultData } from 'src/utils/types.utils';

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

  const fault = (name: string): FaultData => ({
    node: 'Bms',
    name,
    occurredAt: new Date(0),
    lastSeen: new Date(0),
    expired: false
  });
  const buttons = (): HTMLButtonElement[] => Array.from(fixture.nativeElement.querySelectorAll('td button'));

  it('graphs a fault from a button in its Name cell', () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    component.chipFaults.set([fault('Open Wire')]);
    fixture.detectChanges();
    buttons()[0].click();
    expect(navigate).toHaveBeenCalledTimes(1);
  });

  it('keeps focus on a fault row when a newer fault is prepended', () => {
    const older = fault('Open Wire');
    component.chipFaults.set([older]);
    fixture.detectChanges();
    const [button] = buttons();
    button.focus();

    component.chipFaults.update((faults) => [fault('Thermal'), ...faults]);
    fixture.detectChanges();

    expect(buttons()[1]).toBe(button);
    expect(document.activeElement).toBe(button);
  });
});
