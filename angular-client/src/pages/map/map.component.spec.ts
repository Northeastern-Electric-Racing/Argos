import { Component, input, output } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Map as MapLibreMap, StyleSpecification } from 'maplibre-gl';
import { MessageService } from 'primeng/api';
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
const pending = new Promise<Response>(() => undefined);
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
  let fetchSpy: jasmine.Spy;

  beforeEach(() => {
    fetchSpy = spyOn(window, 'fetch').and.returnValue(pending);
    configure();
    storage = TestBed.inject(Storage);
    fixture = TestBed.createComponent(MapComponent);
    map = fixture.componentInstance;
  });

  it('follows the current run live until a run is picked', () => {
    storage.setCurrentRunId(1);
    storage.setCurrentRunId(2);

    expect(map.runId()).toBe(2);
    expect(map.isLive()).toBeTrue();
  });

  it('stays on the picked run when a new run starts', () => {
    storage.setCurrentRunId(2);
    map.onRunSelected(run(1));
    storage.setCurrentRunId(3);

    expect(map.runId()).toBe(1);
    expect(map.isLive()).toBeFalse();
  });

  it('clears the trace and laps when the run changes', async () => {
    const laps: TimedLap[] = [{ number: 1, startMs: 0, endMs: 72500, durationMs: 72500 }];
    fetchSpy.and.callFake((url: RequestInfo | URL) =>
      String(url).endsWith('/laps/1/7') ? Promise.resolve(json(laps)) : pending
    );
    storage.setCurrentRunId(1);
    map.selectedTrack.set(track(7));
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
});

describe('MapComponent placing', () => {
  let map: MapComponent;
  let finishSave: (response: Response) => void;

  beforeEach(() => {
    spyOn(window, 'fetch').and.callFake((url: RequestInfo | URL) =>
      String(url).includes('/tracks/edit/') ? new Promise<Response>((resolve) => (finishSave = resolve)) : pending
    );
    configure();
    map = TestBed.createComponent(MapComponent).componentInstance;
    map.tracks.set([track(7)]);
    map.selectedTrack.set(track(7));
  });

  it('keeps placing when a save of the same track finishes', async () => {
    map.clearLine(LINES[1]);
    map.togglePlacing(LINES[0]);
    await settle();
    finishSave(json(track(7, 'Saved')));
    await settle();

    expect(map.selectedTrack()?.name).toBe('Saved');
    expect(map.placing()).toBe(LINES[0]);
  });

  it('stops placing when another track is selected', () => {
    map.togglePlacing(LINES[0]);
    map.selectedTrack.set(track(8));

    expect(map.placing()).toBeNull();
  });
});

describe('MapComponent new track', () => {
  let fixture: ComponentFixture<MapComponent>;
  let nameInput: HTMLInputElement;
  let addResponse: Promise<Response>;
  let fetchSpy: jasmine.Spy;
  const pressEnter = () => nameInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
  // Synchronous, so the create settles in microtasks before any render can run.
  const submit = (name: string) => {
    nameInput.value = name;
    nameInput.dispatchEvent(new Event('input'));
    pressEnter();
  };
  const addCalls = () => fetchSpy.calls.allArgs().filter(([url]) => String(url).endsWith('/tracks/add')).length;

  beforeEach(async () => {
    fetchSpy = spyOn(window, 'fetch').and.callFake((url: RequestInfo | URL) =>
      String(url).endsWith('/tracks/add') ? addResponse : pending
    );
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
    expect(fixture.componentInstance.tracks()).toEqual([track(9, 'Gainesville')]);
  });

  it('keeps the name when the create fails', async () => {
    addResponse = Promise.resolve({ ok: false, text: () => Promise.resolve('Duplicate') } as Response);
    submit('Gainesville');
    await settle();

    expect(nameInput.value).toBe('Gainesville');
    expect(fixture.componentInstance.tracks()).toEqual([]);
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
    expect(fixture.componentInstance.tracks()).toEqual([track(9, 'Gainesville')]);
  });
});

describe('MapComponent saving', () => {
  const line = { a: { lat: 42, lon: -84 }, b: { lat: 42.001, lon: -84 } };
  const placed: Track = { ...track(7), startLine: line };
  let fixture: ComponentFixture<MapComponent>;
  let map: MapComponent;
  let finishSave: (response: Response) => void;
  let fetchSpy: jasmine.Spy;
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
  const writeCalls = () => fetchSpy.calls.allArgs().filter(([url]) => /\/tracks\/(add|edit)/.test(String(url))).length;

  beforeEach(async () => {
    fetchSpy = spyOn(window, 'fetch').and.callFake((url: RequestInfo | URL) =>
      /\/tracks\/(add|edit)/.test(String(url)) ? new Promise<Response>((resolve) => (finishSave = resolve)) : pending
    );
    configure();
    fixture = TestBed.createComponent(MapComponent);
    map = fixture.componentInstance;
    map.tracks.set([placed]);
    map.selectedTrack.set(placed);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('disables the controls while a save is in flight and re-enables them when it succeeds', async () => {
    button('Clear').click();
    fixture.detectChanges();

    expect(disabled()).toEqual({ clear: true, place: true, delete: true, latitude: true, trackSelect: true });

    finishSave(json(track(7)));
    await settle();
    fixture.detectChanges();

    expect(trackControlsDisabled()).toEqual({ place: false, delete: false, trackSelect: false });
    expect(map.selectedTrack()).toEqual(track(7));
  });

  it('re-enables the controls and keeps the saved track when the save fails', async () => {
    button('Clear').click();
    fixture.detectChanges();
    finishSave({ ok: false, text: () => Promise.resolve('Down') } as Response);
    await settle();
    fixture.detectChanges();

    expect(disabled()).toEqual({ clear: false, place: false, delete: false, latitude: false, trackSelect: false });
    expect(map.selectedTrack()).toEqual(placed);
  });

  it('ignores a second action while a save is in flight', async () => {
    button('Clear').click();
    fixture.detectChanges();
    button('Clear').click();
    button('Place').click();
    await settle();

    expect(writeCalls()).toBe(1);
    expect(map.placing()).toBeNull();
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
