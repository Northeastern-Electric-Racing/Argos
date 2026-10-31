import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { FaultService } from 'src/services/fault.service';
import { FaultData } from 'src/utils/types.utils';
import FaultPageComponent from './fault-page.component';

/** Each socket message builds fresh fault objects, as SocketService.transformFaultData does. */
const message = (lastSeen: number): FaultData[] => [
  { node: 'Bms', name: 'Cell Undervoltage', occurredAt: new Date(0), lastSeen: new Date(lastSeen), expired: false },
  { node: 'Bms', name: 'Pack Overheat', occurredAt: new Date(0), lastSeen: new Date(lastSeen), expired: false }
];

describe('FaultPageComponent', () => {
  let fixture: ComponentFixture<FaultPageComponent>;
  let faults: FaultService;
  let navigate: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    navigate = vi.fn();
    await TestBed.configureTestingModule({
      imports: [FaultPageComponent],
      providers: [{ provide: Router, useValue: { navigate } }]
    }).compileComponents();
    faults = TestBed.inject(FaultService);
    fixture = TestBed.createComponent(FaultPageComponent);
    fixture.autoDetectChanges();
    await fixture.whenStable();

    faults.addFault(message(1000));
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('[ngAccordionTrigger]') as HTMLElement).click();
    await fixture.whenStable();
  });

  const faultButton = (name: string): HTMLButtonElement =>
    Array.from<HTMLButtonElement>(fixture.nativeElement.querySelectorAll('td button')).find(
      (b) => b.textContent?.trim() === name
    )!;

  it('graphs a fault from a button in its Name cell', () => {
    faultButton('Pack Overheat').click();
    expect(navigate).toHaveBeenCalledTimes(1);
    expect(faults.getSelectedFault().value?.name).toBe('Pack Overheat');
  });

  it('keeps the focused fault row, and its focus, when a new message rebuilds the faults', async () => {
    const button = faultButton('Pack Overheat');
    button.focus();

    faults.addFault(message(2000));
    fixture.detectChanges();
    await fixture.whenStable();

    expect(faultButton('Pack Overheat')).toBe(button);
    expect(document.activeElement).toBe(button);
    expect(button.closest('tr')?.textContent).toContain(new Date(2000).toTimeString().slice(0, 8));
  });
});
