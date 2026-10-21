import { ChangeDetectionStrategy, Component, ElementRef, computed, inject, signal, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ConfirmService } from 'src/services/confirm.service';
import { toast } from '@spartan-ng/brain/sonner';
import { BrnDialogRef, injectBrnDialogContext } from '@spartan-ng/brain/dialog';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';
import { HlmInput } from '@spartan-ng/helm/input';
import { HlmLabel } from '@spartan-ng/helm/label';
import { HlmTableImports } from '@spartan-ng/helm/table';
import { GraphPresetService, Preset, PresetSeed } from 'src/services/graph-preset.service';
import { TopicSelectionService } from 'src/services/topic-selection.service';
import { downloadAsFile, FileReadError, readTextFile } from 'src/utils/file.utils';
import { DataType } from 'src/utils/types.utils';

interface PresetDialogData {
  dataTypes: DataType[];
}

@Component({
  selector: 'preset-dialog',
  // Lays out the dialog's header, body and footer the way the Dialog docs' dynamic component does.
  host: { class: 'grid gap-6 min-w-0' },
  templateUrl: './preset-dialog.component.html',
  styleUrls: ['./preset-dialog.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, HlmInput, HlmLabel, HlmButton, HlmDialogImports, HlmTableImports]
})
export class PresetDialogComponent {
  private ref = inject<BrnDialogRef<DataType[] | null>>(BrnDialogRef);
  private data = injectBrnDialogContext<PresetDialogData>();
  private presetService = inject(GraphPresetService);
  private topicSelectionService = inject(TopicSelectionService);
  private confirmService = inject(ConfirmService);

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
        toast.success('Preset Replaced', { description: `"${name}" now contains ${topicNames.length} topic(s)` });
        this.newPresetName.set('');
      });
    } else {
      this.presetService.addPreset(name, topicNames);
      toast.success('Preset Saved', { description: `"${name}" with ${topicNames.length} topic(s)` });
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
        toast.error('Invalid File', { description: 'Please select a .json file' });
      } else {
        toast.error('Read Error', { description: 'Failed to read file' });
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
    this.confirmService.confirm({
      message: `Delete preset "${preset.name}"?`,
      header: 'Delete Preset',
      acceptLabel: 'Delete',
      destructive: true,
      rejectLabel: 'Cancel',
      accept: () => {
        this.presetService.deletePreset(preset.id);
        toast.success('Preset Deleted', { description: preset.name });
      }
    });
  }

  private confirmReplace(name: string, onAccept: () => void): void {
    this.confirmService.confirm({
      message: `A preset named "${name}" already exists. Replace its topics?`,
      header: 'Replace Preset',
      acceptLabel: 'Replace',
      rejectLabel: 'Cancel',
      accept: onAccept
    });
  }

  private toastImported(name: string, count: number): void {
    toast.success('Preset Imported', { description: `"${name}" with ${count} topic(s)` });
  }

  onAddDefaultPresets(): void {
    const added = this.presetService.addDefaultPresets();
    if (added === 0) {
      toast.info('Defaults Already Present', { description: 'All default presets are already in your list.' });
    } else {
      toast.success('Defaults Added', { description: `Added ${added} default preset${added === 1 ? '' : 's'}.` });
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
      toast.error('Parse Error', { description: 'File is not valid JSON' });
      return null;
    }

    if (Array.isArray(parsed)) {
      const topics = parsed.filter((n): n is string => typeof n === 'string' && n.length > 0);
      if (topics.length === 0) {
        toast.error('Parse Error', { description: 'No topic names found' });
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

    toast.error('Parse Error', {
      description: 'Expected an object with a "topicNames" string array, or a bare array of topic names'
    });
    return null;
  }

  private sanitizeFilename(name: string): string {
    return name.replace(/[\\/:*?"<>|]/g, '_').trim() || 'preset';
  }
}
