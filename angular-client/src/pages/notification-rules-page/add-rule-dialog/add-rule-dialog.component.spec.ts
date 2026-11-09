import { ComboboxHarness } from '@angular/aria/combobox/testing';
import { ListboxHarness } from '@angular/aria/listbox/testing';
import { DialogRef } from '@angular/cdk/dialog';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AddRuleDialogComponent } from './add-rule-dialog.component';

describe('AddRuleDialogComponent', () => {
  let fixture: ComponentFixture<AddRuleDialogComponent>;
  let close: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    // The topic list is fetched on init; keep it pending so the test is offline.
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise(() => {}))
    );
    close = vi.fn();
    await TestBed.configureTestingModule({
      imports: [AddRuleDialogComponent],
      providers: [{ provide: DialogRef, useValue: { close } }]
    }).compileComponents();
    fixture = TestBed.createComponent(AddRuleDialogComponent);
    fixture.autoDetectChanges();
    await fixture.whenStable();
  });

  afterEach(() => vi.unstubAllGlobals());

  const input = (id: string): HTMLInputElement => fixture.nativeElement.querySelector(`#${id}`);
  const fields = ['rule-id', 'rule-topic', 'rule-expr', 'rule-debounce'];

  it('marks every field required, and none invalid before they are touched', () => {
    for (const id of fields) {
      expect(input(id).getAttribute('aria-required')).toBe('true');
      expect(input(id).hasAttribute('aria-invalid')).toBe(false);
      expect(input(id).hasAttribute('aria-describedby')).toBe(false);
    }
  });

  it('points each invalid field at its error message on submit', async () => {
    fixture.componentInstance.form.controls.debounce_time.setValue(-1);
    fixture.nativeElement.querySelector('button[type="submit"]').click();
    await fixture.whenStable();

    expect(close).not.toHaveBeenCalled();
    const messages: Record<string, string> = {
      'rule-id': 'Rule ID is required',
      'rule-topic': 'Topic is required',
      'rule-expr': 'Expression is required',
      'rule-debounce': 'Must be 0 or greater'
    };
    for (const id of fields) {
      expect(input(id).getAttribute('aria-invalid')).toBe('true');
      expect(document.getElementById(input(id).getAttribute('aria-describedby')!)?.textContent?.trim()).toBe(messages[id]);
    }
  });

  describe('topic autocomplete', () => {
    const topics = ['BMS/Pack/Voltage', 'BMS/Pack/Current', 'BMS/Status/Temp_Average', 'VCU/Speed'];

    const setupWithTopics = async (names = topics) => {
      vi.stubGlobal(
        'fetch',
        vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve(names.map((name) => ({ name, unit: '' }))) }))
      );
      TestBed.resetTestingModule();
      Element.prototype.scrollIntoView ??= () => undefined;
      await TestBed.configureTestingModule({
        imports: [AddRuleDialogComponent],
        providers: [{ provide: DialogRef, useValue: { close } }]
      }).compileComponents();
      fixture = TestBed.createComponent(AddRuleDialogComponent);
      fixture.autoDetectChanges();
      await new Promise((resolve) => setTimeout(resolve));
      await fixture.whenStable();
      const loader = TestbedHarnessEnvironment.documentRootLoader(fixture);
      return loader.getHarness(ComboboxHarness.with({ selector: '#rule-topic' }));
    };

    it('suggests the DataTypes that match what is typed, by any path segment', async () => {
      const combobox = await setupWithTopics();
      await combobox.setValue('pack');
      expect(await combobox.isOpen()).toBe(true);
      const listbox = await combobox.getPopupWidget(ListboxHarness);
      const texts = await Promise.all((await listbox.getOptions()).map((o) => o.getText()));
      expect(texts).toEqual(['BMS/Pack/Voltage', 'BMS/Pack/Current']);
    });

    it('lists every matching topic, with no cap (as PrimeNG did)', async () => {
      const many = Array.from({ length: 150 }, (_, i) => `BMS/Cell/Voltage_${i}`);
      const combobox = await setupWithTopics(many);
      await combobox.setValue('cell');
      const listbox = await combobox.getPopupWidget(ListboxHarness);
      expect((await listbox.getOptions()).length).toBe(150);
    });

    it('sets the topic only to a picked suggestion', async () => {
      const combobox = await setupWithTopics();
      await combobox.setValue('speed');
      expect(fixture.componentInstance.form.controls.topic.value).toBe('');
      const listbox = await combobox.getPopupWidget(ListboxHarness);
      const [option] = await listbox.getOptions({ text: 'VCU/Speed' });
      await option.click();
      await fixture.whenStable();
      expect(fixture.componentInstance.form.controls.topic.value).toBe('VCU/Speed');
      expect(await combobox.getValue()).toBe('VCU/Speed');
    });

    it('clears free text that is not a topic when the field loses focus (forceSelection)', async () => {
      const combobox = await setupWithTopics();
      await combobox.setValue('BMS/Nope');
      await combobox.blur();
      await fixture.whenStable();
      expect(await combobox.getValue()).toBe('');
      expect(fixture.componentInstance.form.controls.topic.value).toBe('');
      expect(input('rule-topic').getAttribute('aria-invalid')).toBe('true');
    });
  });
});
