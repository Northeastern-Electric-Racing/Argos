import { Component, output } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Map as MapLibreMap } from 'maplibre-gl';
import Storage from 'src/services/storage.service';
import { ConfirmService } from 'src/ui/confirm/confirm.service';
import { ToastService } from 'src/ui/toast/toast.service';
import { LINES } from 'src/utils/map.utils';
import { topics } from 'src/utils/topic.utils';
import { Fix, TimedLap, Track } from 'src/utils/types.utils';
import MapCanvasComponent from './map-canvas/map-canvas.component';
import MapComponent from './map.component';

const track = (id: number, name = 'Track'): Track => ({ id, name, startLine: null, finishLine: null });
const placed: Track = { ...track(7), startLine: { a: { lat: 42, lon: -84 }, b: { lat: 42.001, lon: -84 } } };
const fix = (lat: number, timeMs: number): Fix => ({ lat, lon: -84, timeMs });
const liveFix = (lat: number, timeMs: number) => ({ values: [String(lat), '-84'], time: String(timeMs), unit: 'deg' });
const laps: TimedLap[] = [{ startMs: 0, endMs: 72500, durationMs: 72500 }];
const json = (body: unknown) => ({ ok: true, json: () => Promise.resolve(body) }) as Response;
const failed = { ok: false, text: () => Promise.resolve('Down') } as Response;
const pending = new Promise<Response>(() => undefined);
const settle = () => new Promise((resolve) => setTimeout(resolve));

@Component({ selector: 'map-canvas', template: '' })
class StubMapCanvasComponent {
  loaded = output<MapLibreMap>();
}

/** The map page, with `respond` answering its requests by URL */
const setup = (respond: (url: string) => Promise<Response> = () => pending) => {
  const fetchSpy = vi.spyOn(window, 'fetch').mockImplementation((url) => respond(String(url)));
  TestBed.overrideComponent(MapComponent, {
    remove: { imports: [MapCanvasComponent] },
    add: { imports: [StubMapCanvasComponent] }
  });
  const storage = TestBed.inject(Storage);
  const fixture = TestBed.createComponent(MapComponent);
  const calls = (path: RegExp) => fetchSpy.mock.calls.filter(([url]) => path.test(String(url)));
  return { calls, storage, fixture, map: fixture.componentInstance };
};

describe('MapComponent live trace and laps', () => {
  it('follows the current run', () => {
    const { storage, map } = setup();
    storage.setCurrentRunId(1);
    storage.setCurrentRunId(2);

    expect(map.runId()).toBe(2);
  });

  it('clears the trace and laps when the run changes', () => {
    const { storage, fixture, map } = setup();
    storage.setCurrentRunId(1);
    storage.setTracks([track(7)]);
    map.selectedTrackId.set(7);
    storage.setLiveLaps({ runId: 1, laps: { 7: laps } });
    fixture.detectChanges();
    storage.addValue(topics.gpsLocation(), liveFix(42, 1000));

    expect(map.trace()).toEqual([fix(42, 1000)]);
    expect(map.lapTable()?.best).toBe('01:12.50');

    storage.setCurrentRunId(2);
    fixture.detectChanges();

    expect(map.trace()).toEqual([]);
    expect(map.lapTable()).toBeNull();
  });

  it("shows the run's stored trace, then appends only newer live fixes", async () => {
    const { storage, fixture, map } = setup((url) =>
      url.endsWith('/trace/1') ? Promise.resolve(json([fix(42, 1000), fix(42.1, 2000)])) : pending
    );
    storage.setCurrentRunId(1);
    fixture.detectChanges();
    await settle();
    [liveFix(42.2, 3000), liveFix(43, 2500), liveFix(44, 3000)].forEach((value) =>
      storage.addValue(topics.gpsLocation(), value)
    );

    expect(map.trace()).toEqual([fix(42, 1000), fix(42.1, 2000), fix(42.2, 3000)]);
  });

  it('keeps the trace when the socket drops and comes back on the same run', async () => {
    const { calls, storage, fixture, map } = setup((url) =>
      url.endsWith('/trace/1') ? Promise.resolve(json([fix(42, 1000)])) : pending
    );
    storage.setCurrentRunId(1);
    fixture.detectChanges();
    await settle();
    storage.setCurrentRunId(undefined);
    fixture.detectChanges();
    storage.setCurrentRunId(1);
    fixture.detectChanges();
    await settle();

    expect(map.trace()).toEqual([fix(42, 1000)]);
    expect(calls(/\/trace\//).length).toBe(1);
  });

  it('keeps the live fixes newer than the stored trace when it arrives', async () => {
    let finishTrace: (response: Response) => void = () => undefined;
    const { storage, fixture, map } = setup((url) =>
      url.endsWith('/trace/1') ? new Promise((resolve) => (finishTrace = resolve)) : pending
    );
    storage.setCurrentRunId(1);
    fixture.detectChanges();
    storage.addValue(topics.gpsLocation(), liveFix(42.1, 2000));
    storage.addValue(topics.gpsLocation(), liveFix(42.3, 3000));
    finishTrace(json([fix(42, 1000), fix(42.2, 2000)]));
    await settle();

    expect(map.trace()).toEqual([fix(42, 1000), fix(42.2, 2000), fix(42.3, 3000)]);
  });

  it('toasts a failed stored trace and keeps drawing live fixes', async () => {
    const { storage, fixture, map } = setup((url) => (url.endsWith('/trace/1') ? Promise.resolve(failed) : pending));
    const toast = vi.spyOn(TestBed.inject(ToastService), 'add');
    storage.setCurrentRunId(1);
    fixture.detectChanges();
    await settle();
    storage.addValue(topics.gpsLocation(), liveFix(42, 1000));

    expect(toast).toHaveBeenCalledExactlyOnceWith({ severity: 'error', summary: 'GPS History Unavailable', detail: 'Down' });
    expect(map.trace()).toEqual([fix(42, 1000)]);
  });

  it('shows the live laps of the selected track on the current run only', () => {
    const { storage, map } = setup();
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
});

describe('MapComponent tracks', () => {
  const selected = (tracks: Track[], respond?: (url: string) => Promise<Response>) => {
    const page = setup(respond);
    page.storage.setTracks(tracks);
    page.map.selectedTrackId.set(7);
    return page;
  };
  const latitudeInput = (page: ReturnType<typeof selected>): HTMLInputElement => {
    page.fixture.detectChanges();
    return page.fixture.nativeElement.querySelector('input[aria-label="Start line end 1 latitude"]');
  };

  it('keeps the same selected track when scylla resends unchanged tracks', () => {
    const { storage, map } = selected([track(7), track(8)]);
    const shown = map.selectedTrack();
    storage.setTracks([track(7), track(8)]);

    expect(map.selectedTrack()).toBe(shown);
  });

  it('stops placing when another track is selected', () => {
    const { map } = selected([track(7), track(8)]);
    map.togglePlacing(LINES[0]);
    map.selectedTrackId.set(8);

    expect(map.placing()).toBeNull();
  });

  it('stops placing when the selected track is deleted', () => {
    const { storage, map } = selected([track(7), track(8)]);
    map.togglePlacing(LINES[0]);
    storage.setTracks([track(8)]);

    expect(map.selectedTrack()).toBeNull();
    expect(map.placing()).toBeNull();
  });

  it('saves the line placed by two map clicks where they were clicked, and only that line', () => {
    const { calls, map } = selected([track(7)]);
    const clicks: ((event: { lngLat: { lng: number; lat: number } }) => void)[] = [];
    map.onMapLoaded({
      getSource: () => undefined,
      getCanvas: () => ({ style: {} }),
      on: (type: string, handler: (typeof clicks)[number]) => type === 'click' && clicks.push(handler)
    } as unknown as MapLibreMap);
    map.togglePlacing(LINES[0]);
    clicks[0]({ lngLat: { lng: -84, lat: 42 } });
    clicks[0]({ lngLat: { lng: -84, lat: 42.001 } });

    expect(calls(/\/tracks\//)).toEqual([
      [
        expect.stringMatching(/\/tracks\/edit\/7\/start$/),
        { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(placed.startLine) }
      ]
    ]);
  });

  it('saves a typed coordinate as that end of the line', () => {
    const page = selected([placed]);
    const latitude = latitudeInput(page);
    latitude.value = '42.0005';
    latitude.dispatchEvent(new Event('change'));

    expect(page.calls(/\/tracks\//)).toEqual([
      [
        expect.stringMatching(/\/tracks\/edit\/7\/start$/),
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...placed.startLine, a: { lat: 42.0005, lon: -84 } })
        }
      ]
    ]);
  });

  it('puts back a typed coordinate that scylla rejects', async () => {
    const page = selected([placed], (url) => (url.includes('/tracks/edit/') ? Promise.resolve(failed) : pending));
    const latitude = latitudeInput(page);
    latitude.value = '91';
    latitude.dispatchEvent(new Event('change'));
    await settle();

    expect(latitude.value).toBe('42.000000');
  });

  it('ignores a second write while one is saving', async () => {
    const { calls, map } = selected([placed]);
    map.clearLine(LINES[0]);
    map.clearLine(LINES[0]);
    await settle();

    expect(calls(/\/tracks\/edit\//).length).toBe(1);
  });

  it('deletes a track once the dialog confirms it', () => {
    const { calls, map } = selected([track(7)]);
    vi.spyOn(TestBed.inject(ConfirmService), 'confirm').mockImplementation(({ accept }) => accept?.());
    map.confirmDelete(track(7));

    expect(calls(/\/tracks\//)).toEqual([[expect.stringMatching(/\/tracks\/delete\/7$/), { method: 'POST' }]]);
  });
});

describe('MapComponent new track', () => {
  const create = async (addResponse: Promise<Response>) => {
    const page = setup((url) => (url.endsWith('/tracks/add') ? addResponse : pending));
    page.fixture.detectChanges();
    await page.fixture.whenStable();
    const nameInput: HTMLInputElement = page.fixture.nativeElement.querySelector('input[placeholder="New track name"]');
    nameInput.value = 'Gainesville';
    nameInput.dispatchEvent(new Event('input'));
    const pressEnter = () => nameInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    pressEnter();
    return { ...page, nameInput, pressEnter };
  };

  it('clears the name and selects the track once it is created', async () => {
    const { map, nameInput } = await create(Promise.resolve(json(track(9, 'Gainesville'))));
    await settle();

    expect(nameInput.value).toBe('');
    expect(map.selectedTrackId()).toBe(9);
  });

  it('keeps the name when the create fails', async () => {
    const { map, nameInput } = await create(Promise.resolve(failed));
    await settle();

    expect(nameInput.value).toBe('Gainesville');
    expect(map.selectedTrackId()).toBeNull();
  });

  it('ignores Enter while a create is in flight', async () => {
    const { calls, pressEnter } = await create(pending);
    pressEnter();
    await settle();

    expect(calls(/\/tracks\/add$/).length).toBe(1);
  });
});
