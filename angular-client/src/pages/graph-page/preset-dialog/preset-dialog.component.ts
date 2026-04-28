import { ChangeDetectionStrategy, Component, ElementRef, computed, inject, signal, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ButtonDirective } from 'primeng/button';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { InputText } from 'primeng/inputtext';
import { GraphPresetService, Preset, PresetSeed } from 'src/services/graph-preset.service';
import { TopicSelectionService } from 'src/services/topic-selection.service';
import { partitionDataTypesByName } from 'src/utils/dataTypes.utils';
import { DataType } from 'src/utils/types.utils';

interface PresetDialogData {
  dataTypes: DataType[];
}

@Component({
  selector: 'preset-dialog',
  templateUrl: './preset-dialog.component.html',
  styleUrls: ['./preset-dialog.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, InputText, ButtonDirective]
})
export class PresetDialogComponent {
  private ref = inject(DynamicDialogRef);
  private config = inject(DynamicDialogConfig);
  private presetService = inject(GraphPresetService);
  private topicSelectionService = inject(TopicSelectionService);
  private messageService = inject(MessageService);

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
      if (!confirm(`A preset named "${name}" already exists. Replace its topics?`)) return;
      this.presetService.replacePreset(existing.id, { topicNames });
      this.messageService.add({
        severity: 'success',
        summary: 'Preset Replaced',
        detail: `"${name}" now contains ${topicNames.length} topic(s)`
      });
    } else {
      this.presetService.addPreset(name, topicNames);
      this.messageService.add({
        severity: 'success',
        summary: 'Preset Saved',
        detail: `"${name}" with ${topicNames.length} topic(s)`
      });
    }
    this.newPresetName.set('');
  }

  onUploadClick(): void {
    this.fileInput()?.nativeElement.click();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    input.value = '';

    if (!file.name.toLowerCase().endsWith('.json')) {
      this.messageService.add({ severity: 'error', summary: 'Invalid File', detail: 'Please select a .json file' });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      const parsed = this.parsePresetJson(text);
      if (!parsed) return;

      const fallbackName = file.name.replace(/\.json$/i, '').trim() || 'Untitled Preset';
      const name = parsed.name?.trim() || fallbackName;

      const existing = this.presetService.findByName(name);
      if (existing) {
        if (!confirm(`A preset named "${name}" already exists. Replace its topics?`)) return;
        this.presetService.replacePreset(existing.id, { topicNames: parsed.topicNames });
      } else {
        this.presetService.addPreset(name, parsed.topicNames);
      }
      this.messageService.add({
        severity: 'success',
        summary: 'Preset Imported',
        detail: `"${name}" with ${parsed.topicNames.length} topic(s)`
      });
    };
    reader.onerror = () => {
      this.messageService.add({ severity: 'error', summary: 'Read Error', detail: 'Failed to read file' });
    };
    reader.readAsText(file);
  }

  onApply(preset: Preset): void {
    const { matched, unknown } = partitionDataTypesByName(this.dataTypes, preset.topicNames);
    if (unknown.length > 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Unknown Topics Skipped',
        detail: unknown.join(', '),
        life: 8000
      });
    }
    this.ref.close(matched);
  }

  onDownload(preset: Preset): void {
    const exported: PresetSeed = { name: preset.name, topicNames: [...preset.topicNames] };
    const blob = new Blob([JSON.stringify(exported, null, 2)], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `${this.sanitizeFilename(preset.name)}.json`;
    link.click();

    URL.revokeObjectURL(url);
  }

  onDelete(preset: Preset): void {
    if (!confirm(`Delete preset "${preset.name}"?`)) return;
    this.presetService.deletePreset(preset.id);
    this.messageService.add({ severity: 'success', summary: 'Preset Deleted', detail: preset.name });
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
