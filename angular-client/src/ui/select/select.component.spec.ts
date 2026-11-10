import { ComboboxHarness } from '@angular/aria/combobox/testing';
import { ListboxHarness } from '@angular/aria/listbox/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { UiSelectComponent } from './select.component';

interface Run {
  id: number;
  name: string;
}
const runs: Run[] = [
  { id: 1, name: 'Boston' },
  { id: 2, name: 'NHMS' }
];

@Component({
  imports: [UiSelectComponent, FormsModule],
  template: `
    <ui-select
      class="by-input"
      [options]="runs"
      optionLabel="name"
      placeholder="Pick a run"
      (selectionChange)="picked = $event"
    />
    <ui-select class="by-model" [options]="runs" optionLabel="name" placeholder="Pick" [(ngModel)]="model" />
  `
})
class Host {
  runs = runs;
  picked?: Run;
  model = signal<Run | null>(null);
}

describe('UiSelectComponent', () => {
  // The test DOM has no layout, so no scrollIntoView for the listbox's active option.
  beforeAll(() => (Element.prototype.scrollIntoView ??= () => undefined));

  const setup = async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.autoDetectChanges();
    await new Promise((resolve) => setTimeout(resolve));
    await fixture.whenStable();
    const loader = TestbedHarnessEnvironment.loader(fixture);
    const label = (cls: string) =>
      fixture.nativeElement.querySelector(`.${cls} [role="combobox"] > span`).textContent.trim();
    return { fixture, loader, label };
  };

  // [id]="undefined" renders id="undefined", a duplicate id on every select without one.
  it('leaves the id off the combobox when no inputId is given', async () => {
    const { fixture } = await setup();
    expect(fixture.nativeElement.querySelector('.by-input [role="combobox"]').hasAttribute('id')).toBe(false);
  });

  it('shows the placeholder, then the label of the ngModel value set by the parent, then the placeholder again', async () => {
    const { fixture, label } = await setup();
    expect(label('by-model')).toBe('Pick');
    fixture.componentInstance.model.set(runs[1]);
    await fixture.whenStable();
    expect(label('by-model')).toBe('NHMS');
    fixture.componentInstance.model.set(null);
    await fixture.whenStable();
    expect(label('by-model')).toBe('Pick');
  });

  it('opens a listbox of the options and emits the one picked', async () => {
    const { fixture, loader, label } = await setup();
    const combobox = await loader.getHarness(ComboboxHarness.with({ selector: '.by-input [ngCombobox]' }));
    await combobox.open();
    expect(await combobox.isOpen()).toBe(true);

    const listbox = await combobox.getPopupWidget(ListboxHarness);
    const options = await listbox.getOptions();
    // Each option's text is its label plus the aria-hidden check icon's ligature.
    expect(await Promise.all(options.map((o) => o.getText()))).toEqual(['Bostoncheck', 'NHMScheck']);
    await options[1].click();
    await fixture.whenStable();

    expect(fixture.componentInstance.picked).toEqual(runs[1]);
    expect(label('by-input')).toBe('NHMS');
    expect(await combobox.isOpen()).toBe(false);
  });

  it('opens from the keyboard, moves with the arrows and picks with Enter', async () => {
    const { fixture, loader, label } = await setup();
    const combobox = await loader.getHarness(ComboboxHarness.with({ selector: '.by-input [ngCombobox]' }));
    const trigger: HTMLElement = fixture.nativeElement.querySelector('.by-input [role="combobox"]');
    const key = async (key: string) => {
      trigger.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
      await fixture.whenStable();
    };
    trigger.focus();
    await key('ArrowDown');
    expect(await combobox.isOpen()).toBe(true);
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    await key('ArrowDown');
    await key('Enter');
    expect(fixture.componentInstance.picked).toEqual(runs[1]);
    expect(label('by-input')).toBe('NHMS');
    expect(await combobox.isOpen()).toBe(false);
  });

  it('jumps to an option by typing its first letters', async () => {
    const { fixture, loader } = await setup();
    const combobox = await loader.getHarness(ComboboxHarness.with({ selector: '.by-input [ngCombobox]' }));
    const trigger: HTMLElement = fixture.nativeElement.querySelector('.by-input [role="combobox"]');
    trigger.focus();
    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    await fixture.whenStable();
    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'n', bubbles: true }));
    await fixture.whenStable();
    const listbox = await combobox.getPopupWidget(ListboxHarness);
    const activeId = await listbox.getActiveDescendantId();
    expect(document.getElementById(activeId!)?.textContent).toContain('NHMS');
  });
});
