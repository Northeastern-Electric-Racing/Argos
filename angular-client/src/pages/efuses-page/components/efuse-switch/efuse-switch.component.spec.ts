import { Component, ChangeDetectionStrategy, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import EfuseSwitchComponent, { EfuseSwitchState } from './efuse-switch.component';

@Component({
  template: `<efuse-switch
    ariaLabel="Brake mode"
    [options]="options"
    [selectedState]="state()"
    [disabled]="disabled()"
    (stateChange)="emitted.push($event); state.set($event)"
  />`,
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [EfuseSwitchComponent]
})
class HostComponent {
  options: EfuseSwitchState[] = ['ON', 'OFF', 'AUTO'];
  state = signal<EfuseSwitchState>('OFF');
  disabled = signal(false);
  emitted: EfuseSwitchState[] = [];
}

describe('EfuseSwitchComponent', () => {
  const setup = async () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.autoDetectChanges();
    await fixture.whenStable();
    const host = fixture.nativeElement as HTMLElement;
    const buttons = () => Array.from(host.querySelectorAll<HTMLButtonElement>('[role="group"] button'));
    const button = (name: string) => buttons().find((b) => b.textContent?.trim() === name)!;
    const pressed = () =>
      buttons()
        .filter((b) => b.getAttribute('aria-pressed') === 'true')
        .map((b) => b.textContent?.trim());
    return { fixture, host, buttons, button, pressed };
  };

  it('is a named group of buttons in ON, AUTO, OFF order, the current position pressed', async () => {
    const { host, buttons, pressed } = await setup();
    expect(host.querySelector('[role="group"]')?.getAttribute('aria-label')).toBe('Brake mode');
    expect(buttons().map((b) => b.textContent?.trim())).toEqual(['ON', 'AUTO', 'OFF']);
    expect(buttons().map((b) => b.type)).toEqual(['button', 'button', 'button']);
    expect(pressed()).toEqual(['OFF']);
  });

  it('presses another position and emits it', async () => {
    const { fixture, button, pressed } = await setup();
    button('ON').click();
    await fixture.whenStable();
    expect(fixture.componentInstance.emitted).toEqual(['ON']);
    expect(pressed()).toEqual(['ON']);
  });

  it('follows the parent when it sets the position back (a failed command reverts)', async () => {
    const { fixture, button, pressed } = await setup();
    button('ON').click();
    await fixture.whenStable();
    fixture.componentInstance.state.set('OFF');
    await fixture.whenStable();
    expect(pressed()).toEqual(['OFF']);
  });

  it('does nothing while disabled', async () => {
    const { fixture, buttons, button, pressed } = await setup();
    fixture.componentInstance.disabled.set(true);
    await fixture.whenStable();
    expect(buttons().every((b) => b.disabled)).toBe(true);
    button('ON').click();
    await fixture.whenStable();
    expect(fixture.componentInstance.emitted).toEqual([]);
    expect(pressed()).toEqual(['OFF']);
  });
});
