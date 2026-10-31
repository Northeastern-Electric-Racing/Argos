import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  inject,
  signal,
  viewChild,
  DestroyRef
} from '@angular/core';
import { ToastService } from 'src/services/toast.service';
import { toSignal, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { TuiTable } from '@taiga-ui/addon-table';
import { TuiButton, type TuiDialogContext, TuiInput, TuiLabel } from '@taiga-ui/core';
import { type TuiConfirmData } from '@taiga-ui/kit';
import { TuiBlockStatus } from '@taiga-ui/layout';
import { injectContext } from '@taiga-ui/polymorpheus';
import { injectConfirm } from 'src/utils/confirm.utils';
import { GraphPresetService, Preset, PresetSeed } from 'src/services/graph-preset.service';
import { TopicSelectionService } from 'src/services/topic-selection.service';
import { downloadAsFile, FileReadError, readTextFile } from 'src/utils/file.utils';
import { DataType } from 'src/utils/types.utils';

export interface PresetDialogData {
  dataTypes: DataType[];
}

@Component({
  selector: 'preset-dialog',
  templateUrl: './preset-dialog.component.html',
  styleUrls: ['./preset-dialog.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, TuiBlockStatus, TuiButton, TuiInput, TuiLabel, TuiTable]
})
export class PresetDialogComponent {
  private destroyRef = inject(DestroyRef);
  private readonly context = injectContext<TuiDialogContext<DataType[] | null, PresetDialogData>>();
  private confirmDialog = injectConfirm();
  private presetService = inject(GraphPresetService);
  private topicSelectionService = inject(TopicSelectionService);
  private toasts = inject(ToastService);

  private data = this.context.data;
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
        this.toasts.show(`"${name}" now contains ${topicNames.length} topic(s)`, {
          label: 'Preset Replaced',
          appearance: 'positive'
        });
        this.newPresetName.set('');
      });
    } else {
      this.presetService.addPreset(name, topicNames);
      this.toasts.show(`"${name}" with ${topicNames.length} topic(s)`, { label: 'Preset Saved', appearance: 'positive' });
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
        this.toasts.show('Please select a .json file', { label: 'Invalid File', appearance: 'negative' });
      } else {
        this.toasts.show('Failed to read file', { label: 'Read Error', appearance: 'negative' });
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
    this.context.completeWith(matched);
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
    this.confirm('Delete Preset', { content: `Delete preset "${preset.name}"?`, yes: 'Delete', no: 'Cancel' }, () => {
      this.presetService.deletePreset(preset.id);
      this.toasts.show(preset.name, { label: 'Preset Deleted', appearance: 'positive' });
    });
  }

  private confirmReplace(name: string, onAccept: () => void): void {
    this.confirm(
      'Replace Preset',
      { content: `A preset named "${name}" already exists. Replace its topics?`, yes: 'Replace', no: 'Cancel' },
      onAccept
    );
  }

  /** Opens Taiga's confirm dialog on top of this one and runs `onAccept` if the user confirms */
  private confirm(label: string, data: TuiConfirmData, onAccept: () => void): void {
    this.confirmDialog(label, data)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => onAccept());
  }

  private toastImported(name: string, count: number): void {
    this.toasts.show(`"${name}" with ${count} topic(s)`, { label: 'Preset Imported', appearance: 'positive' });
  }

  onAddDefaultPresets(): void {
    const added = this.presetService.addDefaultPresets();
    if (added === 0) {
      this.toasts.show('All default presets are already in your list.', {
        label: 'Defaults Already Present',
        appearance: 'info'
      });
    } else {
      this.toasts.show(`Added ${added} default preset${added === 1 ? '' : 's'}.`, {
        label: 'Defaults Added',
        appearance: 'positive'
      });
    }
  }

  onClose(): void {
    this.context.completeWith(null);
  }

  private parsePresetJson(text: string): { name?: string; topicNames: string[] } | null {
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      this.toasts.show('File is not valid JSON', { label: 'Parse Error', appearance: 'negative' });
      return null;
    }

    if (Array.isArray(parsed)) {
      const topics = parsed.filter((n): n is string => typeof n === 'string' && n.length > 0);
      if (topics.length === 0) {
        this.toasts.show('No topic names found', { label: 'Parse Error', appearance: 'negative' });
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

    this.toasts.show('Expected an object with a "topicNames" string array, or a bare array of topic names', {
      label: 'Parse Error',
      appearance: 'negative'
    });
    return null;
  }

  private sanitizeFilename(name: string): string {
    return name.replace(/[\\/:*?"<>|]/g, '_').trim() || 'preset';
  }
}
