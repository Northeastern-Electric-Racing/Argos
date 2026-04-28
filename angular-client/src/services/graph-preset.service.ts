import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, combineLatest, map } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';
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

// Names that don't match the live schema in src/utils/topic.utils.ts get
// silently skipped on Apply (with a warn toast), not hard-errored.
export const PRESET_SEEDS: PresetSeed[] = [
  {
    name: 'test preset',
    topicNames: ['BMS/Pack/SOC']
  }
];

@Injectable({ providedIn: 'root' })
export class GraphPresetService {
  private topicSelectionService = inject(TopicSelectionService);
  private subject = new BehaviorSubject<Preset[]>([]);
  private activePresetName$: Observable<string | undefined> = combineLatest([
    this.subject,
    this.topicSelectionService.getSelectedDataTypes()
  ]).pipe(
    map(([presets, selectedDataTypes]) => {
      const selected = new Set(selectedDataTypes.map((dt) => dt.name));
      if (selected.size === 0) return undefined;
      return presets.find(
        (p) => p.topicNames.length === selected.size && p.topicNames.every((n) => selected.has(n))
      )?.name;
    })
  );

  constructor() {
    this.subject.next(this.loadOrSeed());
  }

  getPresets = (): BehaviorSubject<Preset[]> => this.subject;

  getActivePresetName = (): Observable<string | undefined> => this.activePresetName$;

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
    this.subject.next([...this.subject.value, preset]);
    this.save();
    return preset;
  };

  replacePreset = (id: string, patch: Partial<Pick<Preset, 'name' | 'topicNames'>>): void => {
    const next = this.subject.value.map((p) => {
      if (p.id !== id) return p;
      return {
        ...p,
        ...(patch.name !== undefined ? { name: patch.name.trim() } : {}),
        ...(patch.topicNames !== undefined ? { topicNames: [...patch.topicNames] } : {})
      };
    });
    this.subject.next(next);
    this.save();
  };

  deletePreset = (id: string): void => {
    this.subject.next(this.subject.value.filter((p) => p.id !== id));
    this.save();
  };

  findByName = (name: string): Preset | undefined => {
    return this.subject.value.find((p) => p.name === name);
  };

  clearAll = (): void => {
    this.subject.next([]);
    this.save();
  };

  restoreDefaults = (): number => {
    const existingNames = new Set(this.subject.value.map((p) => p.name));
    const toAdd = PRESET_SEEDS.filter((s) => !existingNames.has(s.name)).map(seedToPreset);
    if (toAdd.length === 0) return 0;
    this.subject.next([...this.subject.value, ...toAdd]);
    this.save();
    return toAdd.length;
  };

  private loadOrSeed(): Preset[] {
    const raw = localStorage.getItem(STORAGE_KEY);

    // null = first visit (seed); '[]' = user cleared all (don't re-seed).
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

  private save(list: Preset[] = this.subject.value): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  }
}

function seedToPreset(seed: PresetSeed): Preset {
  return {
    id: uuidv4(),
    name: seed.name,
    topicNames: [...seed.topicNames],
    createdAt: Date.now()
  };
}

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
