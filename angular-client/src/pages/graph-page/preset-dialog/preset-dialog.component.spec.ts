import { TestBed } from '@angular/core/testing';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { GraphPresetService } from 'src/services/graph-preset.service';
import { PresetDialogComponent } from './preset-dialog.component';

describe('PresetDialogComponent', () => {
  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [PresetDialogComponent],
      providers: [
        { provide: DynamicDialogConfig, useValue: { data: { dataTypes: [] } } },
        { provide: DynamicDialogRef, useValue: { close: () => {} } }
      ]
    }).compileComponents();
  });

  it('renders the dialog and preset-row button labels', () => {
    const presetService = TestBed.inject(GraphPresetService);
    presetService.clearAll();
    presetService.addPreset('Pack', ['BMS/Pack/SoC']);

    const fixture = TestBed.createComponent(PresetDialogComponent);
    fixture.detectChanges();

    const buttons = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button[pButton]'));
    expect(buttons.map((b) => b.textContent?.trim())).toEqual([
      'Save',
      'Upload JSON',
      'Apply',
      'Download',
      'Delete',
      'Add Default Presets',
      'Close'
    ]);
  });
});
