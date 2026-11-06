import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { Mock } from 'vitest';
import { GraphPresetService } from 'src/services/graph-preset.service';
import { TopicSelectionService } from 'src/services/topic-selection.service';
import { ConfirmOptions, ConfirmService } from 'src/ui/confirm/confirm.service';
import { ToastService } from 'src/ui/toast/toast.service';
import { DataType } from 'src/utils/types.utils';
import { PresetDialogComponent } from './preset-dialog.component';

const dt = (name: string): DataType => ({ name, unit: 'V' }) as DataType;

describe('PresetDialogComponent', () => {
  let fixture: ComponentFixture<PresetDialogComponent>;
  let presets: GraphPresetService;
  let close: Mock;
  let confirms: ConfirmOptions[];

  beforeEach(async () => {
    localStorage.clear();
    close = vi.fn();
    confirms = [];
    await TestBed.configureTestingModule({
      imports: [PresetDialogComponent],
      providers: [
        { provide: DialogRef, useValue: { close } },
        { provide: DIALOG_DATA, useValue: { dataTypes: [dt('BMS/Pack/Voltage'), dt('BMS/Pack/Current')] } },
        { provide: ToastService, useValue: { add: vi.fn() } },
        { provide: ConfirmService, useValue: { confirm: (o: ConfirmOptions) => confirms.push(o) } }
      ]
    }).compileComponents();
    presets = TestBed.inject(GraphPresetService);
    presets.clearAll();
    presets.addPreset('Pack', ['BMS/Pack/Voltage']);
    presets.addPreset('Current', ['BMS/Pack/Current']);
    fixture = TestBed.createComponent(PresetDialogComponent);
    fixture.autoDetectChanges();
    await fixture.whenStable();
  });
  // Spec files in one worker share window (Vitest runs with isolate: false): leave storage empty.
  afterEach(() => localStorage.clear());

  const el = (): HTMLElement => fixture.nativeElement;
  const buttons = (label: string) =>
    [...el().querySelectorAll<HTMLButtonElement>('button')].filter((b) => b.textContent?.trim() === label);

  it('lists the presets with their topic counts', () => {
    const rows = [...el().querySelectorAll('tbody tr')].map((r) => r.textContent?.replace(/\s+/g, ' ').trim());
    expect(rows[0]).toContain('Pack');
    expect(rows[0]).toContain('1');
    expect(rows.length).toBe(2);
  });

  it('saves the current selection under the typed name', async () => {
    TestBed.inject(TopicSelectionService).setSelectedDataTypes([dt('BMS/Pack/Current')]);
    await fixture.whenStable();
    const name = el().querySelector<HTMLInputElement>('#preset-name')!;
    name.value = 'Mine';
    name.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    buttons('Save')[0].click();
    expect(presets.findByName('Mine')?.topicNames).toEqual(['BMS/Pack/Current']);
  });

  it('describes the name field with the hint while nothing is selected', () => {
    const name = el().querySelector<HTMLInputElement>('#preset-name')!;
    const hint = document.getElementById(name.getAttribute('aria-describedby') ?? '');
    expect(hint?.textContent).toContain('Select a topic');
    expect(buttons('Save')[0].disabled).toBe(true);
  });

  it('closes with the matched topics on Apply', () => {
    buttons('Apply')[0].click();
    expect(close).toHaveBeenCalledWith([expect.objectContaining({ name: 'BMS/Pack/Voltage' })]);
  });

  it('deletes only after the danger confirm is accepted', async () => {
    buttons('Delete')[0].click();
    expect(confirms.length).toBe(1);
    expect(confirms[0].danger).toBe(true);
    expect(presets.findByName('Pack')).toBeDefined();
    confirms[0].accept!();
    await fixture.whenStable();
    expect(presets.findByName('Pack')).toBeUndefined();
  });

  it('moves focus to the next row after a delete, then to the name field once the list is empty', async () => {
    buttons('Delete')[0].click();
    confirms[0].accept!();
    await fixture.whenStable();
    expect(document.activeElement).toBe(buttons('Delete')[0]);
    expect(document.activeElement?.closest('tr')?.textContent).toContain('Current');

    buttons('Delete')[0].click();
    confirms[1].accept!();
    await fixture.whenStable();
    expect(document.activeElement?.id).toBe('preset-name');
  });
});
