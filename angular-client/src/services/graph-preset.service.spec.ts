import { TestBed } from '@angular/core/testing';
import { MessageService } from 'primeng/api';
import { GraphPresetService, PRESET_SEEDS, Preset } from './graph-preset.service';

const STORAGE_KEY = 'argos.graphPresets';

function makeStoredPreset(overrides: Partial<Preset> = {}): Preset {
  return {
    id: 'fixture-id',
    name: 'Fixture',
    topicNames: ['BMS/Pack/SOC'],
    createdAt: 1700000000000,
    ...overrides
  };
}

describe('GraphPresetService', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  function build(): GraphPresetService {
    TestBed.configureTestingModule({ providers: [GraphPresetService, MessageService] });
    return TestBed.inject(GraphPresetService);
  }

  it('seeds defaults when localStorage has never been written', (done) => {
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();

    const service = build();

    service.getPresets().subscribe((presets) => {
      expect(presets.map((p) => p.name)).toEqual(PRESET_SEEDS.map((s) => s.name));
      expect(presets.every((p) => p.id.length > 0)).toBe(true);
      expect(presets.every((p) => p.createdAt > 0)).toBe(true);
      expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)).toEqual(presets);
      done();
    });
  });

  it('does not seed when localStorage holds an empty array', (done) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([]));

    const service = build();

    service.getPresets().subscribe((presets) => {
      expect(presets).toEqual([]);
      done();
    });
  });

  it('does not seed when localStorage already has user presets', (done) => {
    const stored = makeStoredPreset({ id: 'user-1', name: 'My Preset' });
    localStorage.setItem(STORAGE_KEY, JSON.stringify([stored]));

    const service = build();

    service.getPresets().subscribe((presets) => {
      expect(presets).toEqual([stored]);
      done();
    });
  });

  it('addPreset appends a preset and persists it', (done) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
    const service = build();

    const preset = service.addPreset('Vitals', ['BMS/Pack/SOC', 'MPU/State/Speed']);

    expect(preset.name).toBe('Vitals');
    expect(preset.topicNames).toEqual(['BMS/Pack/SOC', 'MPU/State/Speed']);
    expect(preset.id).toBeTruthy();
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)).toEqual([preset]);

    service.getPresets().subscribe((presets) => {
      expect(presets).toEqual([preset]);
      done();
    });
  });

  it('addPreset trims whitespace from the name', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
    const service = build();

    const preset = service.addPreset('  Race-day  ', ['A']);
    expect(preset.name).toBe('Race-day');
  });

  it('addPreset throws on empty/whitespace-only names', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
    const service = build();

    expect(() => service.addPreset('', ['A'])).toThrowError(/empty/i);
    expect(() => service.addPreset('   ', ['A'])).toThrowError(/empty/i);
  });

  it('replacePreset updates fields without changing id or createdAt', (done) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
    const service = build();
    const original = service.addPreset('Vitals', ['A']);

    service.replacePreset(original.id, { name: 'Vitals v2', topicNames: ['A', 'B'] });

    service.getPresets().subscribe(([updated]) => {
      expect(updated.id).toBe(original.id);
      expect(updated.createdAt).toBe(original.createdAt);
      expect(updated.name).toBe('Vitals v2');
      expect(updated.topicNames).toEqual(['A', 'B']);
      done();
    });
  });

  it('deletePreset removes the entry by id', (done) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
    const service = build();
    const a = service.addPreset('A', ['x']);
    const b = service.addPreset('B', ['y']);

    service.deletePreset(a.id);

    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)).toEqual([b]);
    service.getPresets().subscribe((presets) => {
      expect(presets).toEqual([b]);
      done();
    });
  });

  it('findByName matches case-sensitively', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
    const service = build();
    service.addPreset('Vitals', ['x']);

    expect(service.findByName('Vitals')).toBeDefined();
    expect(service.findByName('vitals')).toBeUndefined();
  });

  it('clearAll empties the list and writes [] to localStorage', (done) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
    const service = build();
    service.addPreset('A', ['x']);
    service.addPreset('B', ['y']);

    service.clearAll();

    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)).toEqual([]);
    service.getPresets().subscribe((presets) => {
      expect(presets).toEqual([]);
      done();
    });
  });

  it('addDefaultPresets adds only seed entries whose names are missing', (done) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
    const service = build();

    // No defaults shipped yet — addDefaultPresets is a no-op.
    if (PRESET_SEEDS.length === 0) {
      expect(service.addDefaultPresets()).toBe(0);
      done();
      return;
    }

    const [firstSeed] = PRESET_SEEDS;
    service.addPreset(firstSeed.name, ['existing-topic']);

    const added = service.addDefaultPresets();
    expect(added).toBe(PRESET_SEEDS.length - 1);

    const kept = service.findByName(firstSeed.name);
    expect(kept!.topicNames).toEqual(['existing-topic']);

    service.getPresets().subscribe((presets) => {
      expect(presets.map((p) => p.name)).toEqual(jasmine.arrayWithExactContents(PRESET_SEEDS.map((s) => s.name)));
      done();
    });
  });

  it('addDefaultPresets assigns fresh ids and createdAt to new seeded entries', (done) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
    const service = build();

    // No defaults shipped yet — addDefaultPresets is a no-op.
    if (PRESET_SEEDS.length === 0) {
      expect(service.addDefaultPresets()).toBe(0);
      done();
      return;
    }

    const before = Date.now();
    service.addDefaultPresets();
    const after = Date.now();

    service.getPresets().subscribe((presets) => {
      expect(presets.length).toBe(PRESET_SEEDS.length);
      presets.forEach((p) => {
        expect(p.id).toBeTruthy();
        expect(p.createdAt).toBeGreaterThanOrEqual(before);
        expect(p.createdAt).toBeLessThanOrEqual(after);
      });
      done();
    });
  });

  it('addDefaultPresets returns 0 when all defaults are already present', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
    const service = build();
    service.addDefaultPresets();

    const added = service.addDefaultPresets();

    expect(added).toBe(0);
  });

  it('falls back to an empty list on corrupt JSON (no auto-seed)', (done) => {
    localStorage.setItem(STORAGE_KEY, 'not json');

    const service = build();

    service.getPresets().subscribe((presets) => {
      expect(presets).toEqual([]);
      done();
    });
  });

  it('drops malformed entries but keeps valid ones', (done) => {
    const valid = makeStoredPreset({ id: 'valid' });
    const malformed = [
      { id: 1, name: 'wrong-id-type', topicNames: ['x'], createdAt: 1 },
      { id: 'no-name', topicNames: ['x'], createdAt: 1 },
      { id: 'bad-topics', name: 'x', topicNames: ['ok', 7], createdAt: 1 },
      { id: 'bad-time', name: 'x', topicNames: ['x'], createdAt: 'not-a-number' },
      valid
    ];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(malformed));

    const service = build();

    service.getPresets().subscribe((presets) => {
      expect(presets).toEqual([valid]);
      done();
    });
  });

  it('falls back to an empty list when stored value is not an array', (done) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ not: 'an array' }));

    const service = build();

    service.getPresets().subscribe((presets) => {
      expect(presets).toEqual([]);
      done();
    });
  });
});
