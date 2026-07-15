import { Injectable, inject } from '@angular/core';
import { MessageService } from 'primeng/api';
import { BehaviorSubject, Observable, combineLatest, map } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';
import { partitionDataTypesByName } from 'src/utils/dataTypes.utils';
import { DataType } from 'src/utils/types.utils';
import { TopicSelectionService } from './topic-selection.service';

export interface Preset {
  id: string;
  name: string;
  topicNames: string[];
  createdAt: number;
}

export interface PresetSeed {
  name: string;
  topicNames: string[];
}

const STORAGE_KEY = 'argos.graphPresets';

// Empty until we ship default presets
export const PRESET_SEEDS: PresetSeed[] = [];

/**
 * Service for managing graph topic-selection presets, persisted to localStorage.
 */
@Injectable({ providedIn: 'root' })
export class GraphPresetService {
  private topicSelectionService = inject(TopicSelectionService);
  private messageService = inject(MessageService);
  private presets = new BehaviorSubject<Preset[]>([]);
  private presets$ = this.presets.asObservable();

  // Preset whose topics exactly match the current selection
  private activePresetName$: Observable<string | undefined> = combineLatest([
    this.presets,
    this.topicSelectionService.getSelectedDataTypes()
  ]).pipe(
    map(([presets, selectedDataTypes]) => {
      const selectedNames = new Set(selectedDataTypes.map((dt) => dt.name));
      if (selectedNames.size === 0) return undefined;
      return presets.find((preset) => presetMatchesSelection(preset, selectedNames))?.name;
    })
  );

  constructor() {
    this.presets.next(this.loadOrSeed());
  }

  getPresets = (): Observable<Preset[]> => this.presets$;

  getActivePresetName = (): Observable<string | undefined> => this.activePresetName$;

  resolvePresetTopics = (preset: Preset, dataTypes: DataType[]): DataType[] => {
    const { matched, unknown } = partitionDataTypesByName(dataTypes, preset.topicNames);
    if (unknown.length > 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Unknown Topics Skipped',
        detail: unknown.join(', '),
        life: 8000
      });
    }
    return matched;
  };

  addPreset = (name: string, topicNames: string[]): Preset => {
    const trimmed = name.trim();
    if (trimmed.length === 0) {
      throw new Error('Preset name cannot be empty');
    }
    const preset: Preset = {
      id: uuidv4(),
      name: trimmed,
      topicNames: [...topicNames],
      createdAt: Date.now()
    };
    this.presets.next([...this.presets.value, preset]);
    this.save();
    return preset;
  };

  replacePreset = (id: string, patch: Partial<Pick<Preset, 'name' | 'topicNames'>>): void => {
    const updates: Partial<Preset> = {};
    if (patch.name !== undefined) updates.name = patch.name.trim();
    if (patch.topicNames !== undefined) updates.topicNames = [...patch.topicNames];
    this.presets.next(this.presets.value.map((p) => (p.id === id ? { ...p, ...updates } : p)));
    this.save();
  };

  deletePreset = (id: string): void => {
    this.presets.next(this.presets.value.filter((p) => p.id !== id));
    this.save();
  };

  findByName = (name: string): Preset | undefined => {
    return this.presets.value.find((p) => p.name === name);
  };

  clearAll = (): void => {
    this.presets.next([]);
    this.save();
  };

  // Skip seeds already present by name
  addDefaultPresets = (): number => {
    const existingNames = new Set(this.presets.value.map((p) => p.name));
    const toAdd = PRESET_SEEDS.filter((s) => !existingNames.has(s.name)).map(seedToPreset);
    if (toAdd.length === 0) return 0;
    this.presets.next([...this.presets.value, ...toAdd]);
    this.save();
    return toAdd.length;
  };

  private loadOrSeed(): Preset[] {
    const raw = localStorage.getItem(STORAGE_KEY);

    // null = first visit, seed; '[]' = user cleared, don't re-seed.
    if (raw === null) {
      const seeded = PRESET_SEEDS.map(seedToPreset);
      this.save(seeded);
      return seeded;
    }

    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter(isValidPreset);
    } catch {
      return [];
    }
  }

  private save(list: Preset[] = this.presets.value): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  }
}

function presetMatchesSelection(preset: Preset, selectedNames: Set<string>): boolean {
  return preset.topicNames.length === selectedNames.size && preset.topicNames.every((name) => selectedNames.has(name));
}

function seedToPreset(seed: PresetSeed): Preset {
  return {
    id: uuidv4(),
    name: seed.name,
    topicNames: [...seed.topicNames],
    createdAt: Date.now()
  };
}

// Guards against malformed localStorage data
function isValidPreset(value: unknown): value is Preset {
  if (typeof value !== 'object' || value === null) return false;
  const { id, name, topicNames, createdAt } = value as Record<string, unknown>;
  return (
    typeof id === 'string' &&
    typeof name === 'string' &&
    Array.isArray(topicNames) &&
    topicNames.every((n) => typeof n === 'string') &&
    typeof createdAt === 'number' &&
    Number.isFinite(createdAt)
  );
}
