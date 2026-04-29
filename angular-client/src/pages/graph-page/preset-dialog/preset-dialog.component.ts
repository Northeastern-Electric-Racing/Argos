import { ChangeDetectionStrategy, Component, ElementRef, computed, inject, signal, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonDirective } from 'primeng/button';
import { ConfirmDialog } from 'primeng/confirmdialog';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { InputText } from 'primeng/inputtext';
import { GraphPresetService, Preset, PresetSeed } from 'src/services/graph-preset.service';
import { TopicSelectionService } from 'src/services/topic-selection.service';
import { downloadAsFile, FileReadError, readTextFile } from 'src/utils/file.utils';
import { DataType } from 'src/utils/types.utils';

interface PresetDialogData {
  dataTypes: DataType[];
}

@Component({
  selector: 'preset-dialog',
  templateUrl: './preset-dialog.component.html',
  styleUrls: ['./preset-dialog.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [ConfirmationService],
  imports: [FormsModule, InputText, ButtonDirective, ConfirmDialog]
})
export class PresetDialogComponent {
  private ref = inject(DynamicDialogRef);
  private config = inject(DynamicDialogConfig);
  private presetService = inject(GraphPresetService);
  private topicSelectionService = inject(TopicSelectionService);
  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService);

  private data = this.config.data as PresetDialogData;
  private dataTypes = this.data.dataTypes;
  private currentSelection = toSignal(this.topicSelectionService.getSelectedDataTypes(), {
    initialValue: [] as DataType[]
  });

  presets = toSignal(this.presetService.getPresets(), { initialValue: [] as Preset[] });
  newPresetName = signal('');
  hasSelection = computed(() => this.currentSelection().length > 0);
  fileInput = viewChild<ElementRef<HTMLInputElement>>('fileInput');

  onSaveCurrent(): void {
    const name = this.newPresetName().trim();
    if (name.length === 0 || !this.hasSelection()) return;

    const topicNames = this.currentSelection().map((dt) => dt.name);
    const existing = this.presetService.findByName(name);
    if (existing) {
      this.confirmReplace(name, () => {
        this.presetService.replacePreset(existing.id, { topicNames });
        this.messageService.add({
          severity: 'success',
          summary: 'Preset Replaced',
          detail: `"${name}" now contains ${topicNames.length} topic(s)`
        });
        this.newPresetName.set('');
      });
    } else {
      this.presetService.addPreset(name, topicNames);
      this.messageService.add({
        severity: 'success',
        summary: 'Preset Saved',
        detail: `"${name}" with ${topicNames.length} topic(s)`
      });
      this.newPresetName.set('');
    }
  }

  onUploadClick(): void {
    this.fileInput()?.nativeElement.click();
  }

  async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    input.value = '';

    let text: string;
    try {
      text = await readTextFile(file, '.json');
    } catch (err) {
      if (err instanceof FileReadError && err.kind === 'invalid-extension') {
        this.messageService.add({ severity: 'error', summary: 'Invalid File', detail: 'Please select a .json file' });
      } else {
        this.messageService.add({ severity: 'error', summary: 'Read Error', detail: 'Failed to read file' });
      }
      return;
    }

    const parsed = this.parsePresetJson(text);
    if (!parsed) return;

    const fallbackName = file.name.replace(/\.json$/i, '').trim() || 'Untitled Preset';
    const name = parsed.name?.trim() || fallbackName;

    const existing = this.presetService.findByName(name);
    if (existing) {
      this.confirmReplace(name, () => {
        this.presetService.replacePreset(existing.id, { topicNames: parsed.topicNames });
        this.toastImported(name, parsed.topicNames.length);
      });
    } else {
      this.presetService.addPreset(name, parsed.topicNames);
      this.toastImported(name, parsed.topicNames.length);
    }
  }

  onApply(preset: Preset): void {
    const matched = this.presetService.resolvePresetTopics(preset, this.dataTypes);
    this.ref.close(matched);
  }

  onDownload(preset: Preset): void {
    const exported: PresetSeed = { name: preset.name, topicNames: [...preset.topicNames] };
    downloadAsFile(
      `${this.sanitizeFilename(preset.name)}.json`,
      JSON.stringify(exported, null, 2),
      'application/json;charset=utf-8;'
    );
  }

  onDelete(preset: Preset): void {
    this.confirmationService.confirm({
      message: `Delete preset "${preset.name}"?`,
      header: 'Delete Preset',
      acceptLabel: 'Delete',
      rejectLabel: 'Cancel',
      accept: () => {
        this.presetService.deletePreset(preset.id);
        this.messageService.add({ severity: 'success', summary: 'Preset Deleted', detail: preset.name });
      }
    });
  }

  private confirmReplace(name: string, onAccept: () => void): void {
    this.confirmationService.confirm({
      message: `A preset named "${name}" already exists. Replace its topics?`,
      header: 'Replace Preset',
      acceptLabel: 'Replace',
      rejectLabel: 'Cancel',
      accept: onAccept
    });
  }

  private toastImported(name: string, count: number): void {
    this.messageService.add({
      severity: 'success',
      summary: 'Preset Imported',
      detail: `"${name}" with ${count} topic(s)`
    });
  }

  onRestoreDefaults(): void {
    const added = this.presetService.restoreDefaults();
    if (added === 0) {
      this.messageService.add({
        severity: 'info',
        summary: 'Defaults Already Present',
        detail: 'All default presets are already in your list.'
      });
    } else {
      this.messageService.add({
        severity: 'success',
        summary: 'Defaults Restored',
        detail: `Added ${added} default preset${added === 1 ? '' : 's'}.`
      });
    }
  }

  onClose(): void {
    this.ref.close(null);
  }

  private parsePresetJson(text: string): { name?: string; topicNames: string[] } | null {
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      this.messageService.add({ severity: 'error', summary: 'Parse Error', detail: 'File is not valid JSON' });
      return null;
    }

    if (Array.isArray(parsed)) {
      const topics = parsed.filter((n): n is string => typeof n === 'string' && n.length > 0);
      if (topics.length === 0) {
        this.messageService.add({ severity: 'error', summary: 'Parse Error', detail: 'No topic names found' });
        return null;
      }
      return { topicNames: Array.from(new Set(topics)) };
    }

    if (typeof parsed === 'object' && parsed !== null) {
      const { name, topicNames } = parsed as Record<string, unknown>;
      if (
        Array.isArray(topicNames) &&
        topicNames.every((n): n is string => typeof n === 'string') &&
        topicNames.length > 0
      ) {
        return {
          name: typeof name === 'string' ? name : undefined,
          topicNames: Array.from(new Set(topicNames.filter((n) => n.length > 0)))
        };
      }
    }

    this.messageService.add({
      severity: 'error',
      summary: 'Parse Error',
      detail: 'Expected an object with a "topicNames" string array, or a bare array of topic names'
    });
    return null;
  }

  private sanitizeFilename(name: string): string {
    return name.replace(/[\\/:*?"<>|]/g, '_').trim() || 'preset';
  }
}
