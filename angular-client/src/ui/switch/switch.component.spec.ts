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

  // [id]="undefined" renders id="undefined", a duplicate id on every switch without one.
  it('leaves the id off when no inputId is given', async () => {
    const { el } = await setup();
    expect(el('bound').hasAttribute('id')).toBe(false);
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

  it('ignores clicks while the form disables it', async () => {
    const { fixture, el } = await setup();
    const model = fixture.debugElement.query((d) => d.nativeElement.classList?.contains('model'));
    (model.componentInstance as UiSwitchComponent).setDisabledState(true);
    await fixture.whenStable();
    expect(el('model').disabled).toBe(true);
    (model.componentInstance as UiSwitchComponent).toggle();
    await fixture.whenStable();
    expect(el('model').getAttribute('aria-checked')).toBe('false');
    expect(fixture.componentInstance.model).toBe(false);
  });

  // jsdom has no Tailwind, so this pins the classes the audit kit measured (nontext.js): no grey track can be 3:1
  // from both the surface and the accent, so off is an outline in the control edge and on is an accent fill.
  it('draws off as an outlined track and on as a filled accent track', async () => {
    const { el } = await setup();
    const c = el('bound').className.split(/\s+/);
    expect(c).toEqual(
      expect.arrayContaining([
        'border-2',
        'border-control-border',
        'bg-transparent',
        'aria-checked:border-accent',
        'aria-checked:bg-accent'
      ])
    );
    expect(c).not.toContain('bg-control-off');
  });
});
