import type { MockInstance } from 'vitest';
import { Component, input, output } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Map as MapLibreMap, StyleSpecification } from 'maplibre-gl';
import { ConfirmationService, MessageService } from 'primeng/api';
import { EnvService } from 'src/services/env.service';
import Storage from 'src/services/storage.service';
import { LINES } from 'src/utils/map.utils';
import { topics } from 'src/utils/topic.utils';
import { Run, TimedLap, Track } from 'src/utils/types.utils';
import MapCanvasComponent from './map-canvas/map-canvas.component';
import MapComponent from './map.component';

const run = (id: number): Run => ({ id, locationName: '', driverName: '', time: new Date(0), notes: '' });
const track = (id: number, name = 'Track'): Track => ({ id, name, startLine: null, finishLine: null });
const json = (body: unknown) => ({ ok: true, json: () => Promise.resolve(body) }) as Response;
const fix = (lat: string, time: string) => ({ values: [lat, '-84'], time, unit: 'deg' });
const historyUrl = `/data/${encodeURIComponent(topics.gpsLocation())}/1`;
const pending = new Promise<Response>(() => undefined);
const failed = { ok: false, status: 500, statusText: 'Down', text: () => Promise.resolve('Down') } as Response;
const settle = () => new Promise((resolve) => setTimeout(resolve));
@Component({ selector: 'map-canvas', standalone: true, template: '' })
class StubMapCanvasComponent {
  mapStyle = input.required<StyleSpecification>();
  loaded = output<MapLibreMap>();
}
const configure = () =>
  TestBed.configureTestingModule({
    providers: [MessageService, { provide: EnvService, useValue: { mapPmtilesUrl: undefined } }]
  }).overrideComponent(MapComponent, {
    remove: { imports: [MapCanvasComponent] },
    add: { imports: [StubMapCanvasComponent] }
  });

describe('MapComponent run', () => {
  let storage: Storage;
  let fixture: ComponentFixture<MapComponent>;
  let map: MapComponent;
  let fetchSpy: MockInstance<typeof window.fetch>;

  beforeEach(() => {
    fetchSpy = vi.spyOn(window, 'fetch').mockReturnValue(pending);
    configure();
    storage = TestBed.inject(Storage);
    fixture = TestBed.createComponent(MapComponent);
    map = fixture.componentInstance;
  });

  it('follows the current run live until a run is picked', () => {
    storage.setCurrentRunId(1);
    storage.setCurrentRunId(2);

    expect(map.runId()).toBe(2);
    expect(map.isLive()).toBe(true);
  });

  it('stays on the picked run when a new run starts', () => {
    storage.setCurrentRunId(2);
    map.onRunSelected(run(1));
    storage.setCurrentRunId(3);

    expect(map.runId()).toBe(1);
    expect(map.isLive()).toBe(false);
  });

  it('clears the trace and laps when the run changes', async () => {
    const laps: TimedLap[] = [{ startMs: 0, endMs: 72500, durationMs: 72500 }];
    storage.setCurrentRunId(1);
    storage.setTracks([track(7)]);
    map.selectedTrackId.set(7);
    storage.setLiveLaps({ runId: 1, laps: { 7: laps } });
    fixture.detectChanges();
    storage.addValue(topics.gpsLocation(), { values: ['42', '-84'], time: '1000', unit: 'deg' });
    await settle();

    expect(map.trace()).toEqual([{ lat: 42, lon: -84, timeMs: 1000 }]);
    expect(map.lapTable()).toEqual({
      best: '01:12.50',
      rows: [{ number: 1, time: '01:12.50', deltaToBest: '±00:00.00', isBest: true }]
    });

    storage.setCurrentRunId(2);
    fixture.detectChanges();

    expect(map.trace()).toEqual([]);
    expect(map.lapTable()).toBeNull();
  });

  it("shows a live run's stored history, then appends only newer live fixes", async () => {
    fetchSpy.mockImplementation((url: RequestInfo | URL) =>
      String(url).endsWith(historyUrl) ? Promise.resolve(json([fix('42', '1000'), fix('42.1', '2000')])) : pending
    );
    storage.setCurrentRunId(1);
    fixture.detectChanges();
    await settle();

    expect(map.trace()).toEqual([
      { lat: 42, lon: -84, timeMs: 1000 },
      { lat: 42.1, lon: -84, timeMs: 2000 }
    ]);

    storage.addValue(topics.gpsLocation(), fix('42.2', '3000'));
    storage.addValue(topics.gpsLocation(), fix('43', '2500'));
    storage.addValue(topics.gpsLocation(), fix('44', '3000'));

    expect(map.trace()).toEqual([
      { lat: 42, lon: -84, timeMs: 1000 },
      { lat: 42.1, lon: -84, timeMs: 2000 },
      { lat: 42.2, lon: -84, timeMs: 3000 }
    ]);
  });

  it("keeps the live fixes newer than a live run's stored history when it arrives", async () => {
    let finishHistory: (response: Response) => void = () => undefined;
    fetchSpy.mockImplementation((url: RequestInfo | URL) =>
      String(url).endsWith(historyUrl) ? new Promise<Response>((resolve) => (finishHistory = resolve)) : pending
    );
    storage.setCurrentRunId(1);
    fixture.detectChanges();
    storage.addValue(topics.gpsLocation(), fix('42.1', '2000'));
    storage.addValue(topics.gpsLocation(), fix('42.3', '3000'));
    finishHistory(json([fix('42', '1000'), fix('42.2', '2000')]));
    await settle();

    expect(map.trace()).toEqual([
      { lat: 42, lon: -84, timeMs: 1000 },
      { lat: 42.2, lon: -84, timeMs: 2000 },
      { lat: 42.3, lon: -84, timeMs: 3000 }
    ]);
  });

  it("toasts a live run's failed history without covering the map and keeps drawing live fixes", async () => {
    const toast = vi.spyOn(TestBed.inject(MessageService), 'add');
    let failHistory: (response: Response) => void = () => undefined;
    fetchSpy.mockImplementation((url: RequestInfo | URL) =>
      String(url).endsWith(historyUrl) ? new Promise<Response>((resolve) => (failHistory = resolve)) : pending
    );
    const overlay = () => fixture.nativeElement.querySelector('loading-page, error-page');
    storage.setCurrentRunId(1);
    fixture.detectChanges();

    expect(overlay()).toBeNull();

    failHistory({ ok: false, text: () => Promise.resolve('Down') } as Response);
    await settle();
    storage.addValue(topics.gpsLocation(), fix('42', '1000'));
    fixture.detectChanges();

    expect(toast).toHaveBeenCalledExactlyOnceWith({ severity: 'error', summary: 'GPS History Unavailable', detail: 'Down' });
    expect(overlay()).toBeNull();
    expect(map.trace()).toEqual([{ lat: 42, lon: -84, timeMs: 1000 }]);
  });

  it('shows the live laps of the selected track on the live run only', () => {
    const laps: TimedLap[] = [{ startMs: 0, endMs: 72500, durationMs: 72500 }];
    storage.setCurrentRunId(1);
    storage.setTracks([track(7), track(8)]);
    map.selectedTrackId.set(7);

    storage.setLiveLaps({ runId: 1, laps: { 8: laps } });
    expect(map.lapTable()).toBeNull();

    storage.setLiveLaps({ runId: 2, laps: { 7: laps } });
    expect(map.lapTable()).toBeNull();

    storage.setLiveLaps({ runId: 1, laps: { 7: laps, 8: [] } });
    expect(map.lapTable()?.best).toBe('01:12.50');
  });

  it("fetches a recorded run's laps on the selected track", async () => {
    const laps: TimedLap[] = [{ startMs: 0, endMs: 72500, durationMs: 72500 }];
    fetchSpy.mockImplementation((url: RequestInfo | URL) =>
      String(url).endsWith('/laps/1/7') ? Promise.resolve(json(laps)) : pending
    );
    storage.setCurrentRunId(2);
    storage.setTracks([track(7)]);
    map.selectedTrackId.set(7);
    map.onRunSelected(run(1));
    fixture.detectChanges();
    await settle();

    expect(map.lapTable()?.best).toBe('01:12.50');
  });

  it("covers the map with the error when a recorded run's history fails", async () => {
    fetchSpy.mockImplementation((url: RequestInfo | URL) =>
      String(url).endsWith(historyUrl) ? Promise.resolve(failed) : pending
    );
    storage.setCurrentRunId(2);
    map.onRunSelected(run(1));
    fixture.detectChanges();
    await settle();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('error-page')).not.toBeNull();
  });

  it("toasts a recorded run's failed laps", async () => {
    const toast = vi.spyOn(TestBed.inject(MessageService), 'add');
    fetchSpy.mockImplementation((url: RequestInfo | URL) =>
      String(url).endsWith('/laps/1/7') ? Promise.resolve(failed) : pending
    );
    storage.setCurrentRunId(2);
    storage.setTracks([track(7)]);
    map.selectedTrackId.set(7);
    map.onRunSelected(run(1));
    fixture.detectChanges();
    await settle();

    expect(toast).toHaveBeenCalledExactlyOnceWith({ severity: 'error', summary: 'Laps Unavailable', detail: 'Down' });
  });
});

describe('MapComponent selected track', () => {
  let storage: Storage;
  let fixture: ComponentFixture<MapComponent>;
  let map: MapComponent;
  let fetchSpy: MockInstance<typeof window.fetch>;

  beforeEach(() => {
    fetchSpy = vi.spyOn(window, 'fetch').mockReturnValue(pending);
    configure();
    storage = TestBed.inject(Storage);
    fixture = TestBed.createComponent(MapComponent);
    map = fixture.componentInstance;
    storage.setTracks([track(7), track(8)]);
    map.selectedTrackId.set(7);
  });

  it('keeps the same selected track when the server resends unchanged tracks', () => {
    const shown = map.selectedTrack();
    storage.setTracks([track(7), track(8)]);

    expect(map.selectedTrack()).toBe(shown);
  });

  it('stops placing when another track is selected', () => {
    map.togglePlacing(LINES[0]);
    map.selectedTrackId.set(8);

    expect(map.placing()).toBeNull();
  });

  it('stops placing when the selected track is deleted', () => {
    map.togglePlacing(LINES[0]);
    storage.setTracks([track(8)]);

    expect(map.selectedTrack()).toBeNull();
    expect(map.placing()).toBeNull();
  });

  it('saves the line placed by two map clicks, and only that line', () => {
    const clicks: ((event: { lngLat: { lng: number; lat: number } }) => void)[] = [];
    map.onMapLoaded({
      addSource: () => undefined,
      addLayer: () => undefined,
      getSource: () => undefined,
      getCanvas: () => ({ style: {} }),
      on: (type: string, handler: (typeof clicks)[number]) => type === 'click' && clicks.push(handler)
    } as unknown as MapLibreMap);
    map.togglePlacing(LINES[0]);
    clicks[0]({ lngLat: { lng: -84, lat: 42 } });
    clicks[0]({ lngLat: { lng: -84, lat: 42.001 } });

    expect(fetchSpy).toHaveBeenCalledExactlyOnceWith(expect.stringMatching(/\/tracks\/edit\/7\/start$/), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ a: { lat: 42, lon: -84 }, b: { lat: 42.001, lon: -84 } })
    });
  });

  it('deletes a track once the dialog confirms it', () => {
    const confirmation = fixture.debugElement.injector.get(ConfirmationService);
    vi.spyOn(confirmation, 'confirm').mockImplementation(({ accept }) => {
      accept?.();
      return confirmation;
    });
    map.confirmDelete(track(7));

    expect(fetchSpy).toHaveBeenCalledExactlyOnceWith(expect.stringMatching(/\/tracks\/delete\/7$/), { method: 'POST' });
  });
});

describe('MapComponent new track', () => {
  let fixture: ComponentFixture<MapComponent>;
  let nameInput: HTMLInputElement;
  let addResponse: Promise<Response>;
  let fetchSpy: MockInstance<typeof window.fetch>;
  const pressEnter = () => nameInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
  // Synchronous, so the create settles in microtasks before any render can run.
  const submit = (name: string) => {
    nameInput.value = name;
    nameInput.dispatchEvent(new Event('input'));
    pressEnter();
  };
  const addCalls = () => fetchSpy.mock.calls.filter(([url]) => String(url).endsWith('/tracks/add')).length;

  beforeEach(async () => {
    fetchSpy = vi
      .spyOn(window, 'fetch')
      .mockImplementation((url: RequestInfo | URL) => (String(url).endsWith('/tracks/add') ? addResponse : pending));
    configure();
    fixture = TestBed.createComponent(MapComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    nameInput = fixture.nativeElement.querySelector('input[placeholder="New track name"]');
  });

  it('clears the name when the track is created, before any render', async () => {
    addResponse = Promise.resolve(json(track(9, 'Gainesville')));
    submit('Gainesville');
    await settle();

    expect(nameInput.value).toBe('');
    expect(fixture.componentInstance.selectedTrackId()).toBe(9);
  });

  it('keeps the name when the create fails', async () => {
    addResponse = Promise.resolve({ ok: false, text: () => Promise.resolve('Duplicate') } as Response);
    submit('Gainesville');
    await settle();

    expect(nameInput.value).toBe('Gainesville');
    expect(fixture.componentInstance.selectedTrackId()).toBeNull();
  });

  it('ignores Enter while a create is in flight', async () => {
    let finishAdd: (response: Response) => void = () => undefined;
    addResponse = new Promise((resolve) => (finishAdd = resolve));
    submit('Gainesville');
    pressEnter();
    await settle();
    finishAdd(json(track(9, 'Gainesville')));
    await settle();

    expect(addCalls()).toBe(1);
  });

  it('keeps a name typed while the create is in flight', async () => {
    let finishAdd: (response: Response) => void = () => undefined;
    addResponse = new Promise((resolve) => (finishAdd = resolve));
    submit('Gainesville');
    nameInput.value = 'Michigan';
    nameInput.dispatchEvent(new Event('input'));
    finishAdd(json(track(9, 'Gainesville')));
    await settle();

    expect(nameInput.value).toBe('Michigan');
  });
});

describe('MapComponent saving', () => {
  const line = { a: { lat: 42, lon: -84 }, b: { lat: 42.001, lon: -84 } };
  const placed: Track = { ...track(7), startLine: line };
  let fixture: ComponentFixture<MapComponent>;
  let map: MapComponent;
  let finishSave: (response: Response) => void;
  let fetchSpy: MockInstance<typeof window.fetch>;
  const element = (selector: string): HTMLElement => fixture.nativeElement.querySelector(selector);
  const button = (label: string) => element(`p-button[label="${label}"] button`) as HTMLButtonElement;
  const disabled = () => ({
    clear: button('Clear').disabled,
    latitude: (element('input[aria-label="Latitude"]') as HTMLInputElement).disabled,
    ...trackControlsDisabled()
  });
  const trackControlsDisabled = () => ({
    place: button('Place').disabled,
    delete: button('Delete').disabled,
    trackSelect: element('p-select').classList.contains('p-disabled')
  });
  const writeCalls = () => fetchSpy.mock.calls.filter(([url]) => /\/tracks\/(add|edit)/.test(String(url))).length;

  beforeEach(async () => {
    fetchSpy = vi
      .spyOn(window, 'fetch')
      .mockImplementation((url: RequestInfo | URL) =>
        /\/tracks\/(add|edit)/.test(String(url)) ? new Promise<Response>((resolve) => (finishSave = resolve)) : pending
      );
    configure();
    fixture = TestBed.createComponent(MapComponent);
    map = fixture.componentInstance;
    TestBed.inject(Storage).setTracks([placed]);
    map.selectedTrackId.set(7);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('disables the controls while a save is in flight and re-enables them when it succeeds', async () => {
    button('Clear').click();
    fixture.detectChanges();

    expect(disabled()).toEqual({ clear: true, place: true, delete: true, latitude: true, trackSelect: true });

    finishSave(json(track(7)));
    await settle();
    await fixture.whenStable();

    expect(trackControlsDisabled()).toEqual({ place: false, delete: false, trackSelect: false });
  });

  it('re-enables the controls and keeps the saved track when the save fails', async () => {
    button('Clear').click();
    fixture.detectChanges();
    finishSave({ ok: false, text: () => Promise.resolve('Down') } as Response);
    await settle();
    await fixture.whenStable();

    expect(disabled()).toEqual({ clear: false, place: false, delete: false, latitude: false, trackSelect: false });
    expect(map.selectedTrack()).toEqual(placed);
  });

  it('ignores a write started by a path the disabled controls do not cover', async () => {
    button('Clear').click();
    fixture.detectChanges();
    const latitude = Object.assign(document.createElement('input'), { type: 'number', value: '43' });
    await map.moveLineEnd(LINES[0], 'a', 'lat', latitude);
    map.clearLine(LINES[0]);
    await settle();

    expect(writeCalls()).toBe(1);
  });
});
