import { TestBed } from '@angular/core/testing';
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
    TestBed.configureTestingModule({ providers: [GraphPresetService] });
    return TestBed.inject(GraphPresetService);
  }

  it('seeds defaults when localStorage has never been written', () => {
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();

    const service = build();

    const presets = service.getPresets().value;
    expect(presets.map((p) => p.name)).toEqual(PRESET_SEEDS.map((s) => s.name));
    expect(presets.every((p) => p.id.length > 0)).toBe(true);
    expect(presets.every((p) => p.createdAt > 0)).toBe(true);

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(stored).toEqual(presets);
  });

  it('does not seed when localStorage holds an empty array', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([]));

    const service = build();

    expect(service.getPresets().value).toEqual([]);
  });

  it('does not seed when localStorage already has user presets', () => {
    const stored = makeStoredPreset({ id: 'user-1', name: 'My Preset' });
    localStorage.setItem(STORAGE_KEY, JSON.stringify([stored]));

    const service = build();

    expect(service.getPresets().value).toEqual([stored]);
  });

  it('addPreset appends a preset and persists it', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
    const service = build();

    const preset = service.addPreset('Vitals', ['BMS/Pack/SOC', 'MPU/State/Speed']);

    expect(preset.name).toBe('Vitals');
    expect(preset.topicNames).toEqual(['BMS/Pack/SOC', 'MPU/State/Speed']);
    expect(preset.id).toBeTruthy();
    expect(service.getPresets().value).toEqual([preset]);

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(stored).toEqual([preset]);
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

  it('replacePreset updates fields without changing id or createdAt', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
    const service = build();
    const original = service.addPreset('Vitals', ['A']);

    service.replacePreset(original.id, { name: 'Vitals v2', topicNames: ['A', 'B'] });

    const [updated] = service.getPresets().value;
    expect(updated.id).toBe(original.id);
    expect(updated.createdAt).toBe(original.createdAt);
    expect(updated.name).toBe('Vitals v2');
    expect(updated.topicNames).toEqual(['A', 'B']);
  });

  it('deletePreset removes the entry by id', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
    const service = build();
    const a = service.addPreset('A', ['x']);
    const b = service.addPreset('B', ['y']);

    service.deletePreset(a.id);

    expect(service.getPresets().value).toEqual([b]);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)).toEqual([b]);
  });

  it('findByName matches case-sensitively', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
    const service = build();
    service.addPreset('Vitals', ['x']);

    expect(service.findByName('Vitals')).toBeDefined();
    expect(service.findByName('vitals')).toBeUndefined();
  });

  it('clearAll empties the list and writes [] to localStorage', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
    const service = build();
    service.addPreset('A', ['x']);
    service.addPreset('B', ['y']);

    service.clearAll();

    expect(service.getPresets().value).toEqual([]);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)).toEqual([]);
  });

  it('addDefaultPresets adds only seed entries whose names are missing', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
    const service = build();
    const [firstSeed] = PRESET_SEEDS;
    service.addPreset(firstSeed.name, ['existing-topic']);

    const added = service.addDefaultPresets();

    expect(added).toBe(PRESET_SEEDS.length - 1);
    const namesNow = service.getPresets().value.map((p) => p.name);
    expect(namesNow).toEqual(jasmine.arrayWithExactContents(PRESET_SEEDS.map((s) => s.name)));
    const kept = service.findByName(firstSeed.name);
    expect(kept!.topicNames).toEqual(['existing-topic']);
  });

  it('addDefaultPresets assigns fresh ids and createdAt to new seeded entries', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
    const service = build();

    const before = Date.now();
    service.addDefaultPresets();
    const after = Date.now();

    const presets = service.getPresets().value;
    expect(presets.length).toBe(PRESET_SEEDS.length);
    presets.forEach((p) => {
      expect(p.id).toBeTruthy();
      expect(p.createdAt).toBeGreaterThanOrEqual(before);
      expect(p.createdAt).toBeLessThanOrEqual(after);
    });
  });

  it('addDefaultPresets returns 0 when all defaults are already present', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
    const service = build();
    service.addDefaultPresets();

    const added = service.addDefaultPresets();

    expect(added).toBe(0);
  });

  it('falls back to an empty list on corrupt JSON (no auto-seed)', () => {
    localStorage.setItem(STORAGE_KEY, 'not json');

    const service = build();

    expect(service.getPresets().value).toEqual([]);
  });

  it('drops malformed entries but keeps valid ones', () => {
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

    expect(service.getPresets().value).toEqual([valid]);
  });

  it('falls back to an empty list when stored value is not an array', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ not: 'an array' }));

    const service = build();

    expect(service.getPresets().value).toEqual([]);
  });
});
