import { Component, HostListener, computed, effect, inject, linkedSignal, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { LngLatBounds, Map as MapLibreMap, Marker } from 'maplibre-gl';
import { ConfirmationService, MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { ConfirmDialog } from 'primeng/confirmdialog';
import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { EMPTY, Observable, exhaustMap, first, merge, of, switchMap, tap, timer } from 'rxjs';
import { getDataByDataTypeNameAndRunId } from 'src/api/data.api';
import { getLaps } from 'src/api/lap.api';
import { addTrack, deleteTrack, editTrack, getAllTracks } from 'src/api/track.api';
import ErrorPageComponent from 'src/components/error-page/error-page.component';
import LoadingPageComponent from 'src/components/loading-page/loading-page.component';
import SidebarToggleComponent from 'src/components/sidebar-toggle/sidebar-toggle.component';
import APIService from 'src/services/api.service';
import { EnvService } from 'src/services/env.service';
import Storage from 'src/services/storage.service';
import {
  LINES,
  LineSpec,
  OVERLAY_SOURCES,
  carGeoJson,
  draftLineGeoJson,
  fromLngLat,
  linesGeoJson,
  mapStyle,
  overlayLayers,
  pointGeoJson,
  setOverlay,
  toFix,
  traceFromPoints,
  traceGeoJson
} from 'src/utils/map.utils';
import { lapTable } from 'src/utils/lap-timer.types';
import { DataValue } from 'src/utils/socket.utils';
import { topics } from 'src/utils/topic.utils';
import { isValidCoordinate, lineLengthMetres, snapFix } from 'src/utils/track.utils';
import { Coordinate, Fix, Run, TimedLap, TimingLine, Track } from 'src/utils/types.utils';
import MapCanvasComponent from './map-canvas/map-canvas.component';
import { RunSelectorComponent } from '../graph-page/graph-caption/run-selector/run-selector.component';

const LAP_POLL_MS = 3000;
const FIT_PADDING_PX = 60;
const MAX_FIT_ZOOM = 19;

type Cursor = { point: Coordinate; fix: Fix | null; target: Coordinate };

@Component({
  selector: 'map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.css'],
  standalone: true,
  providers: [ConfirmationService],
  imports: [
    RunSelectorComponent,
    LoadingPageComponent,
    ErrorPageComponent,
    SidebarToggleComponent,
    FormsModule,
    ReactiveFormsModule,
    MapCanvasComponent,
    DatePipe,
    DecimalPipe,
    Button,
    ConfirmDialog,
    InputText,
    Select,
    TableModule
  ]
})
export default class MapComponent {
  private storage = inject(Storage);
  private apiService = inject(APIService);
  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService);
  private envService = inject(EnvService);
  readonly showOsmCredit = !!this.envService.mapPmtilesUrl;
  private rootStyle = getComputedStyle(document.documentElement);
  readonly baseStyle = mapStyle(this.color('--color-background-page'), this.envService.mapPmtilesUrl);
  private map = signal<MapLibreMap | undefined>(undefined);
  private traceFixes = signal<Fix[]>([]);
  readonly trace = this.traceFixes.asReadonly();
  // Live view refits to the trace until the user pans or zooms.
  private followCar = true;

  private currentRunId = toSignal(this.storage.getCurrentRunId());
  private pickedRunId = signal<number | undefined>(undefined);
  runId = computed(() => this.pickedRunId() ?? this.currentRunId());
  isLive = computed(() => this.runId() !== undefined && this.runId() === this.currentRunId());
  tracks = signal<Track[]>([]);
  selectedTrack = signal<Track | null>(null);
  // A FormControl updates the input immediately; a reset signal only reaches it on the next render.
  newTrackName = new FormControl('', { nonNullable: true });
  private newTrackNameValue = toSignal(this.newTrackName.valueChanges, { initialValue: '' });
  saving = signal(false);
  canCreateTrack = computed(() => !this.saving() && !!this.newTrackNameValue().trim());
  placing = linkedSignal<number | undefined, LineSpec | null>({
    source: computed(() => this.selectedTrack()?.id),
    computation: () => null
  });
  pendingEnd = linkedSignal<LineSpec | null, Coordinate | null>({ source: this.placing, computation: () => null });
  cursor = signal<Cursor | null>(null);
  private dragging = signal(false);
  snapTarget = computed(() => (this.placing() || this.dragging() ? this.cursor()?.fix ?? null : null));
  readonly lineEnds: (keyof TimingLine)[] = ['a', 'b'];
  lineRows = computed(() =>
    LINES.map((spec) => {
      const line = this.selectedTrack()?.[spec.field] ?? null;
      return { spec, line, lengthMetres: line && lineLengthMetres(line) };
    })
  );
  private laps = signal<TimedLap[]>([]);
  lapTable = computed(() => lapTable(this.laps()));
  isLoading = signal(false);
  historyError = signal<Error | null>(null);
  isMobile = signal(window.innerWidth <= 768);
  private lineEndMarkers = new Map<string, Marker>();

  constructor() {
    this.request<Track[]>('Tracks unavailable', getAllTracks).then((tracks) => tracks && this.tracks.set(tracks));

    toObservable(computed(() => ({ runId: this.runId(), isLive: this.isLive() })))
      .pipe(
        switchMap(({ runId, isLive }) => {
          this.traceFixes.set([]);
          this.followCar = true;
          this.isLoading.set(false);
          this.historyError.set(null);
          if (runId === undefined) return EMPTY;
          return isLive ? this.liveTrace() : this.recordedTrace(runId);
        }),
        takeUntilDestroyed()
      )
      .subscribe();

    toObservable(computed(() => ({ runId: this.runId(), track: this.selectedTrack(), isLive: this.isLive() })))
      .pipe(
        switchMap(({ runId, track, isLive }) => {
          this.laps.set([]);
          return runId === undefined || !track ? EMPTY : this.pollLaps(runId, track.id, isLive);
        }),
        takeUntilDestroyed()
      )
      .subscribe();

    effect(() => {
      const map = this.map();
      const trace = this.trace();
      setOverlay(map, 'trace', traceGeoJson(trace));
      setOverlay(map, 'car', carGeoJson(trace));
    });
    effect(() => {
      const map = this.map();
      const track = this.selectedTrack();
      if (!map) return;
      setOverlay(map, 'lines', linesGeoJson(track));
      LINES.forEach((spec) =>
        this.lineEnds.forEach((end) => {
          const key = `${spec.kind}-${end}`;
          const line = track?.[spec.field];
          const marker = this.lineEndMarkers.get(key);
          if (!line) {
            marker?.remove();
            this.lineEndMarkers.delete(key);
          } else if (marker) marker.setLngLat(line[end]);
          else this.lineEndMarkers.set(key, this.lineEndMarker(map, spec, end).setLngLat(line[end]).addTo(map));
        })
      );
    });
    effect(() => {
      const draggable = !this.saving();
      this.lineEndMarkers.forEach((marker) => marker.setDraggable(draggable));
    });
    effect(() => setOverlay(this.map(), 'draft', draftLineGeoJson(this.pendingEnd(), this.cursor()?.target ?? null)));
    effect(() => setOverlay(this.map(), 'snap', pointGeoJson(this.snapTarget())));
    effect(() => {
      const map = this.map();
      if (map) map.getCanvas().style.cursor = this.placing() ? 'crosshair' : this.dragging() ? 'grabbing' : '';
    });
  }

  @HostListener('window:resize')
  onResize() {
    this.isMobile.set(window.innerWidth <= 768);
  }

  @HostListener('document:keydown.escape')
  cancelPlacing() {
    this.placing.set(null);
  }

  onRunSelected = (run: Run) => {
    this.placing.set(null);
    this.pickedRunId.set(run.id);
  };

  togglePlacing(spec: LineSpec) {
    this.placing.set(this.placing() === spec ? null : spec);
  }

  async createTrack() {
    const name = this.newTrackName.value.trim();
    if (!name || this.saving()) return;
    this.placing.set(null);
    if ((await this.saveTrack(() => addTrack(name))) && this.newTrackName.value.trim() === name) this.newTrackName.reset();
  }

  async moveLineEnd(spec: LineSpec, end: keyof TimingLine, axis: keyof Coordinate, input: HTMLInputElement) {
    const value = input.valueAsNumber;
    if (isValidCoordinate(axis, value))
      await this.editLine(spec, (line) => line && { ...line, [end]: { ...line[end], [axis]: value } });
    const shown = this.selectedTrack()?.[spec.field]?.[end];
    if (shown) input.value = shown[axis].toFixed(6);
  }

  clearLine(spec: LineSpec) {
    this.editLine(spec, () => null);
  }

  confirmDelete(track: Track) {
    this.confirmationService.confirm({
      header: 'Delete track',
      message: `Delete "${track.name}" and its timing lines?`,
      acceptButtonProps: { label: 'Delete', severity: 'danger' },
      rejectButtonProps: { label: 'Cancel', severity: 'secondary', outlined: true },
      accept: async () => {
        if ((await this.write<string>('Delete Failed', () => deleteTrack(track.id))) === null) return;
        this.tracks.update((tracks) => tracks.filter((other) => other.id !== track.id));
        this.selectedTrack.set(null);
      }
    });
  }

  onMapLoaded(map: MapLibreMap) {
    OVERLAY_SOURCES.forEach((source) =>
      map.addSource(source, { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })
    );
    overlayLayers((variable) => this.color(variable)).forEach((layer) => map.addLayer(layer));
    this.map.set(map);
    this.fitTrace();
    map.on('click', (event) => this.placeEnd(this.cursorAt(map, fromLngLat(event.lngLat)).target));
    map.on('mousemove', (event) => this.cursor.set(this.cursorAt(map, fromLngLat(event.lngLat))));
    map.on('mouseout', () => this.cursor.set(null));
    map.on('movestart', (event) => {
      if (event.originalEvent) this.followCar = false;
    });
  }

  private color(variable: string) {
    return this.rootStyle.getPropertyValue(variable).trim();
  }

  private cursorAt(map: MapLibreMap, point: Coordinate): Cursor {
    const fix = snapFix(this.trace(), point, (coordinate) => map.project(coordinate));
    return { point, fix, target: fix ?? point };
  }

  private liveTrace() {
    return this.storage.get(topics.gpsLocation()).pipe(
      tap((value) => {
        const point = toFix(value);
        this.traceFixes.update((trace) => [...trace, point]);
        if (this.trace().length === 1 || (this.followCar && !this.map()?.getBounds().contains(point))) this.fitTrace();
      })
    );
  }

  private recordedTrace(runId: number) {
    const history = this.apiService.query<DataValue[]>(() => getDataByDataTypeNameAndRunId(topics.gpsLocation(), runId));
    return merge(
      history.isLoading.pipe(tap((isLoading) => this.isLoading.set(isLoading))),
      history.error.pipe(tap((error) => this.historyError.set(error))),
      history.data.pipe(
        first((points): points is DataValue[] => points !== null),
        tap((points) => {
          this.traceFixes.set(traceFromPoints(points));
          this.fitTrace();
        })
      )
    );
  }

  private pollLaps(runId: number, trackId: number, isLive: boolean) {
    let lastError: string | null = null;
    return (isLive ? timer(0, LAP_POLL_MS) : of(0)).pipe(
      exhaustMap(() => this.fetchLaps(runId, trackId, this.laps().at(-1)?.endMs)),
      tap((result) => {
        if (!(result instanceof Error)) {
          lastError = null;
          this.laps.update((laps) => [
            ...laps,
            ...result.map((lap, index) => ({ ...lap, number: laps.length + index + 1 }))
          ]);
        } else if (result.message !== lastError) {
          lastError = result.message;
          this.messageService.add({ severity: 'error', summary: 'Laps unavailable', detail: result.message });
        }
      })
    );
  }

  /** With `since`, only the laps starting at or after it, numbered from 1 */
  private fetchLaps(runId: number, trackId: number, since?: number): Observable<TimedLap[] | Error> {
    const query = this.apiService.query<TimedLap[]>(() => getLaps(runId, trackId, since));
    return merge(query.error, query.data).pipe(first((result): result is TimedLap[] | Error => result !== null));
  }

  private placeEnd(end: Coordinate) {
    const spec = this.placing();
    const a = this.pendingEnd();
    if (!spec || this.saving()) return;
    if (!a) this.pendingEnd.set(end);
    else this.editLine(spec, () => ({ a, b: end }));
  }

  private lineEndMarker(map: MapLibreMap, spec: LineSpec, end: keyof TimingLine) {
    const element = document.createElement('div');
    element.className = 'line-end-marker';
    element.style.setProperty('--line-end-color', `var(${spec.colorVar})`);
    const marker = new Marker({ element, draggable: true });
    const markerCursor = () => this.cursorAt(map, fromLngLat(marker.getLngLat()));
    marker.on('dragstart', () => {
      element.classList.add('dragging');
      this.dragging.set(true);
    });
    marker.on('drag', () => {
      const cursor = markerCursor();
      const track = this.selectedTrack();
      const line = track?.[spec.field];
      this.cursor.set(cursor);
      if (track && line)
        setOverlay(map, 'lines', linesGeoJson({ ...track, [spec.field]: { ...line, [end]: cursor.target } }));
    });
    marker.on('dragend', async () => {
      element.classList.remove('dragging');
      this.dragging.set(false);
      const { target } = markerCursor();
      if (await this.editLine(spec, (line) => line && { ...line, [end]: target })) return;
      const track = this.selectedTrack();
      const line = track?.[spec.field];
      if (line) marker.setLngLat(line[end]);
      setOverlay(map, 'lines', linesGeoJson(track));
    });
    return marker;
  }

  private async editLine(spec: LineSpec, edit: (line: TimingLine | null) => TimingLine | null): Promise<boolean> {
    const track = this.selectedTrack();
    if (!track || this.saving()) return false;
    this.placing.set(null);
    return !!(await this.saveTrack(() => editTrack({ ...track, [spec.field]: edit(track[spec.field]) })));
  }

  private async saveTrack(send: () => Promise<Response>): Promise<Track | null> {
    const saved = await this.write<Track>('Save Failed', send);
    if (!saved) return null;
    this.tracks.update((tracks) =>
      tracks.some((other) => other.id === saved.id)
        ? tracks.map((other) => (other.id === saved.id ? saved : other))
        : [...tracks, saved]
    );
    this.selectedTrack.set(saved);
    return saved;
  }

  // One write at a time; a drag already in progress or an unblurred input can still try to start a second.
  private async write<T>(summary: string, send: () => Promise<Response>): Promise<T | null> {
    if (this.saving()) return null;
    this.saving.set(true);
    const result = await this.request<T>(summary, send);
    this.saving.set(false);
    return result;
  }

  private async request<T>(summary: string, send: () => Promise<Response>): Promise<T | null> {
    try {
      const response = await send();
      if (response.ok) return await response.json();
      this.messageService.add({ severity: 'error', summary, detail: await response.text() });
    } catch {
      this.messageService.add({ severity: 'error', summary, detail: 'Network error' });
    }
    return null;
  }

  private fitTrace() {
    const map = this.map();
    const trace = this.trace();
    if (!map || trace.length === 0) return;
    const bounds = trace.reduce((bounds, point) => bounds.extend(point), new LngLatBounds(trace[0], trace[0]));
    map.fitBounds(bounds, { padding: FIT_PADDING_PX, maxZoom: MAX_FIT_ZOOM, animate: false });
  }
}
