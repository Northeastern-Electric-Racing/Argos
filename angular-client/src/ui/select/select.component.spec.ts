import { ComboboxHarness } from '@angular/aria/combobox/testing';
import { ListboxHarness } from '@angular/aria/listbox/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { Component, signal, viewChild } from '@angular/core';
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
      [value]="initial()"
      (selectionChange)="picked = $event"
    />
    <ui-select
      class="by-model"
      [options]="runs"
      optionLabel="name"
      placeholder="Pick"
      [value]="runs[0]"
      [(ngModel)]="model"
    />
  `
})
class Host {
  runs = runs;
  initial = signal<Run | undefined>(undefined);
  picked?: Run;
  model: Run | null = null;
  byInput = viewChild.required<UiSelectComponent<Run>>(UiSelectComponent);
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
    const label = (cls: string) => fixture.nativeElement.querySelector(`.${cls} .ui-select-label`).textContent.trim();
    return { fixture, loader, label };
  };

  it('shows the placeholder, then the label of a [value] set by the parent', async () => {
    const { fixture, label } = await setup();
    expect(label('by-input')).toBe('Pick a run');
    fixture.componentInstance.initial.set(runs[1]);
    await fixture.whenStable();
    expect(label('by-input')).toBe('NHMS');
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

  it('lets a form value win over [value] once ngModel has written, even when it is empty', async () => {
    const { label } = await setup();
    expect(label('by-model')).toBe('Pick');
  });

  it('clear() returns to the placeholder', async () => {
    const { fixture, label } = await setup();
    fixture.componentInstance.initial.set(runs[0]);
    await fixture.whenStable();
    fixture.componentInstance.byInput().clear();
    fixture.componentInstance.initial.set(undefined);
    await fixture.whenStable();
    expect(label('by-input')).toBe('Pick a run');
  });
});
