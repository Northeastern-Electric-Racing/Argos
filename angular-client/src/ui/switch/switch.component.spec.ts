import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { UiSwitchComponent } from './switch.component';

@Component({
  imports: [UiSwitchComponent, FormsModule],
  template: `
    <ui-switch class="bound" [(checked)]="bound" ariaLabel="Bound" />
    <ui-switch class="model" [(ngModel)]="model" ariaLabel="Model" />
  `
})
class Host {
  bound = signal(false);
  model = false;
}

describe('UiSwitchComponent', () => {
  const setup = async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.autoDetectChanges();
    await fixture.whenStable();
    const el = (cls: string): HTMLButtonElement => fixture.nativeElement.querySelector(`.${cls} [role="switch"]`);
    return { fixture, el };
  };

  it('is a named switch that reports its state through aria-checked', async () => {
    const { el } = await setup();
    expect(el('bound').getAttribute('aria-label')).toBe('Bound');
    expect(el('bound').getAttribute('aria-checked')).toBe('false');
  });

  it('flips on click and writes back through [(checked)]', async () => {
    const { fixture, el } = await setup();
    el('bound').click();
    await fixture.whenStable();
    expect(el('bound').getAttribute('aria-checked')).toBe('true');
    expect(fixture.componentInstance.bound()).toBe(true);
  });

  it('follows the parent when it sets the value back', async () => {
    const { fixture, el } = await setup();
    el('bound').click();
    await fixture.whenStable();
    fixture.componentInstance.bound.set(false);
    await fixture.whenStable();
    expect(el('bound').getAttribute('aria-checked')).toBe('false');
  });

  it('works with ngModel, including writes from the form', async () => {
    const { fixture, el } = await setup();
    el('model').click();
    await fixture.whenStable();
    expect(fixture.componentInstance.model).toBe(true);
  });
});
