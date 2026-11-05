import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { TestKey } from '@angular/cdk/testing';
import { AccordionGroupHarness, AccordionHarness } from '@angular/aria/accordion/testing';
import { Router } from '@angular/router';
import { FaultService } from 'src/services/fault.service';
import { FaultData } from 'src/utils/types.utils';
import FaultPageComponent from './fault-page.component';

const fault = (node: string, name: string, lastSeen: number): FaultData => ({
  node,
  name,
  occurredAt: new Date(0),
  lastSeen: new Date(lastSeen),
  expired: false
});

/** Each socket message builds fresh fault objects, as SocketService.transformFaultData does. */
const message = (lastSeen: number): FaultData[] => [
  fault('Mpu', 'Imu Fault', lastSeen),
  fault('Bms', 'Cell Undervoltage', lastSeen),
  fault('Bms', 'Pack Overheat', lastSeen),
  fault('Dti', 'Over Current', lastSeen),
  fault('Charger', 'Comms Lost', lastSeen)
];

describe('FaultPageComponent', () => {
  let fixture: ComponentFixture<FaultPageComponent>;
  let faults: FaultService;
  let navigate: ReturnType<typeof vi.fn>;
  let accordions: () => Promise<AccordionHarness[]>;

  const receive = async (lastSeen: number) => {
    faults.addFault(message(lastSeen));
    fixture.detectChanges();
    await fixture.whenStable();
  };
  const expandedTitles = async () => {
    const open = [];
    for (const a of await accordions())
      if (await a.isExpanded()) open.push((await a.getTitle()).replace('expand_more', '').trim());
    return open;
  };

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
    const group = await TestbedHarnessEnvironment.loader(fixture).getHarness(AccordionGroupHarness);
    accordions = () => group.getAccordions();

    await receive(1000);
  });

  const faultButton = (name: string): HTMLButtonElement =>
    Array.from<HTMLButtonElement>(fixture.nativeElement.querySelectorAll('td button')).find(
      (b) => b.textContent?.trim() === name
    )!;

  it('shows one panel per CAN node, sorted, with the first open by default', async () => {
    const titles = [];
    for (const a of await accordions()) titles.push((await a.getTitle()).replace('expand_more', '').trim());
    expect(titles).toEqual(['Bms', 'Charger', 'Dti', 'Mpu']);
    expect(await expandedTitles()).toEqual(['Bms']);
  });

  it('moves between node triggers with the arrow keys, Home and End, and toggles with Enter and Space', async () => {
    const [bms, charger, , mpu] = await accordions();
    await bms.focus();

    await (await bms.host()).sendKeys(TestKey.DOWN_ARROW);
    expect(await charger.isFocused()).toBe(true);
    await (await charger.host()).sendKeys(TestKey.ENTER);
    expect(await charger.isExpanded()).toBe(true);
    expect(await bms.isExpanded()).toBe(true);

    await (await charger.host()).sendKeys(TestKey.END);
    expect(await mpu.isFocused()).toBe(true);
    await (await mpu.host()).sendKeys(' ');
    expect(await mpu.isExpanded()).toBe(true);

    await (await mpu.host()).sendKeys(TestKey.HOME);
    expect(await bms.isFocused()).toBe(true);
    await (await bms.host()).sendKeys(TestKey.ENTER);
    expect(await bms.isExpanded()).toBe(false);
    expect(await expandedTitles()).toEqual(['Charger', 'Mpu']);
  });

  it('keeps every panel as the user left it when a new message rebuilds the faults', async () => {
    const [bms, charger] = await accordions();
    await bms.collapse();
    await charger.expand();

    await receive(2000);

    expect(await expandedTitles()).toEqual(['Charger']);
  });

  it('graphs a fault from a button in its Name cell', () => {
    faultButton('Pack Overheat').click();
    expect(navigate).toHaveBeenCalledTimes(1);
    expect(faults.getSelectedFault().value?.name).toBe('Pack Overheat');
  });

  it('graphs a fault from a click anywhere on its row', () => {
    (faultButton('Cell Undervoltage').closest('tr')!.querySelector('td:last-child') as HTMLElement).click();
    expect(navigate).toHaveBeenCalledTimes(1);
    expect(faults.getSelectedFault().value?.name).toBe('Cell Undervoltage');
  });

  it('keeps the focused fault row, and its focus, when a new message rebuilds the faults', async () => {
    const button = faultButton('Pack Overheat');
    button.focus();

    await receive(2000);

    expect(faultButton('Pack Overheat')).toBe(button);
    expect(document.activeElement).toBe(button);
    expect(button.closest('tr')?.textContent).toContain(new Date(2000).toTimeString().slice(0, 8));
  });
});
