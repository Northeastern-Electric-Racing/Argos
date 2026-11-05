import { Component, computed, effect, inject, linkedSignal, signal, untracked } from '@angular/core';
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
import { EMPTY, asyncScheduler, first, from, merge, switchMap, tap, throttleTime } from 'rxjs';
import { getDataByDataTypeNameAndRunId } from 'src/api/data.api';
import { getLaps } from 'src/api/lap.api';
import { addTrack, deleteTrack, editTrackLine } from 'src/api/track.api';
import ErrorPageComponent from 'src/components/error-page/error-page.component';
import LoadingPageComponent from 'src/components/loading-page/loading-page.component';
import SidebarToggleComponent from 'src/components/sidebar-toggle/sidebar-toggle.component';
import TypographyComponent from 'src/components/typography/typography.component';
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

const FIT_PADDING_PX = 60;
const MAX_FIT_ZOOM = 19;
// MapLibre re-tiles the whole trace on each redraw, too costly at the 10 Hz GPS rate.
const TRACE_REDRAW_MS = 1_000;

type Cursor = { point: Coordinate; fix: Fix | null; target: Coordinate };

const sameJson = (left: unknown, right: unknown) => JSON.stringify(left) === JSON.stringify(right);

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
    TypographyComponent,
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
  ],
  host: {
    '(window:resize)': 'onResize()',
    '(document:keydown.escape)': 'cancelPlacing()'
  }
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
  // scylla sends the tracks and live laps every second; an unchanged copy must not redraw the map under a drag.
  tracks = toSignal(this.storage.getTracks(), { requireSync: true, equal: sameJson });
  selectedTrackId = signal<number | null>(null);
  selectedTrack = computed(() => this.tracks().find((track) => track.id === this.selectedTrackId()) ?? null, {
    equal: sameJson
  });
  private liveLaps = toSignal(this.storage.getLiveLaps(), { requireSync: true, equal: sameJson });
  // A FormControl updates the input immediately; a reset signal only reaches it on the next render.
  newTrackName = new FormControl('', { nonNullable: true });
  private newTrackNameValue = toSignal(this.newTrackName.valueChanges, { initialValue: '' });
  saving = signal(false);
  canCreateTrack = computed(() => !this.saving() && !!this.newTrackNameValue().trim());
  placing = linkedSignal<number | undefined, LineSpec | null>({
    source: () => this.selectedTrack()?.id,
    computation: () => null
  });
  pendingEnd = linkedSignal<LineSpec | null, Coordinate | null>({ source: this.placing, computation: () => null });
  cursor = signal<Cursor | null>(null);
  private draggedMarker = signal<Marker | null>(null);
  snapTarget = computed(() => (this.placing() || this.draggedMarker() ? this.cursor()?.fix ?? null : null));
  readonly lineEnds: (keyof TimingLine)[] = ['a', 'b'];
  lineRows = computed(() =>
    LINES.map((spec) => {
      const line = this.selectedTrack()?.[spec.field] ?? null;
      return { spec, line, lengthMetres: line && lineLengthMetres(line) };
    })
  );
  private recordedLaps = signal<TimedLap[]>([]);
  private laps = computed(() => {
    if (!this.isLive()) return this.recordedLaps();
    const live = this.liveLaps();
    const track = this.selectedTrack();
    return live && track && live.runId === this.runId() ? live.laps[track.id] ?? [] : [];
  });
  lapTable = computed(() => lapTable(this.laps()));
  isLoading = signal(false);
  historyError = signal<Error | null>(null);
  isMobile = signal(window.innerWidth <= 768);
  private lineEndMarkers = new Map<string, Marker>();

  constructor() {
    toObservable(computed(() => ({ runId: this.runId(), isLive: this.isLive() })))
      .pipe(
        switchMap(({ runId, isLive }) => {
          this.traceFixes.set([]);
          this.followCar = true;
          this.isLoading.set(false);
          this.historyError.set(null);
          if (runId === undefined) return EMPTY;
          return isLive ? merge(this.liveHistory(runId), this.liveTrace()) : this.recordedTrace(runId);
        }),
        takeUntilDestroyed()
      )
      .subscribe();

    toObservable(computed(() => ({ runId: this.runId(), track: this.selectedTrack(), isLive: this.isLive() })))
      .pipe(
        switchMap(({ runId, track, isLive }) => {
          this.recordedLaps.set([]);
          if (isLive || runId === undefined || !track) return EMPTY;
          return from(this.request<TimedLap[]>('Laps Unavailable', () => getLaps(runId, track.id)));
        }),
        takeUntilDestroyed()
      )
      .subscribe((laps) => laps && this.recordedLaps.set(laps));

    toObservable(computed(() => ({ map: this.map(), trace: this.trace() })))
      .pipe(throttleTime(TRACE_REDRAW_MS, asyncScheduler, { leading: true, trailing: true }), takeUntilDestroyed())
      .subscribe(({ map, trace }) => setOverlay(map, 'trace', traceGeoJson(trace)));
    effect(() => setOverlay(this.map(), 'car', carGeoJson(this.trace())));
    effect(() => {
      const map = this.map();
      const track = this.selectedTrack();
      if (!map) return;
      setOverlay(map, 'lines', linesGeoJson(track));
      // Another engineer's save must not pull the end being dragged out from under the cursor.
      const dragged = untracked(this.draggedMarker);
      LINES.forEach((spec) =>
        this.lineEnds.forEach((end) => {
          const key = `${spec.kind}-${end}`;
          const line = track?.[spec.field];
          const marker = this.lineEndMarkers.get(key);
          if (!line) {
            // A removed marker never fires dragend.
            if (marker === dragged) this.draggedMarker.set(null);
            marker?.remove();
            this.lineEndMarkers.delete(key);
          } else if (!marker)
            this.lineEndMarkers.set(key, this.lineEndMarker(map, spec, end).setLngLat(line[end]).addTo(map));
          else if (marker !== dragged) marker.setLngLat(line[end]);
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
      if (map) map.getCanvas().style.cursor = this.placing() ? 'crosshair' : this.draggedMarker() ? 'grabbing' : '';
    });
  }

  onResize() {
    this.isMobile.set(window.innerWidth <= 768);
  }

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
    const added = await this.write<Track>('Save Failed', () => addTrack(name));
    if (!added) return;
    this.selectedTrackId.set(added.id);
    if (this.newTrackName.value.trim() === name) this.newTrackName.reset();
  }

  async moveLineEnd(spec: LineSpec, end: keyof TimingLine, axis: keyof Coordinate, input: HTMLInputElement) {
    const value = input.valueAsNumber;
    if (
      isValidCoordinate(axis, value) &&
      (await this.editLine(spec, (line) => line && { ...line, [end]: { ...line[end], [axis]: value } }))
    )
      return;
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
      accept: () => this.write<string>('Delete Failed', () => deleteTrack(track.id))
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
        const last = this.trace().at(-1);
        // The stored history may already hold this fix.
        if (last && point.timeMs <= last.timeMs) return;
        this.traceFixes.update((trace) => [...trace, point]);
        if (this.trace().length === 1 || (this.followCar && !this.map()?.getBounds().contains(point))) this.fitTrace();
      })
    );
  }

  // The live trace draws while this loads, so a failure toasts instead of covering the map.
  private liveHistory(runId: number) {
    return from(
      this.request<DataValue[]>('GPS History Unavailable', () => getDataByDataTypeNameAndRunId(topics.gpsLocation(), runId))
    ).pipe(
      tap((points) => {
        if (!points) return;
        const history = traceFromPoints(points);
        const lastTimeMs = history.at(-1)?.timeMs ?? -Infinity;
        this.traceFixes.update((live) => [...history, ...live.filter((fix) => fix.timeMs > lastTimeMs)]);
        this.fitTrace();
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
    element.style.background = `var(${spec.colorVar})`;
    const marker = new Marker({ element, draggable: true });
    const markerCursor = () => this.cursorAt(map, fromLngLat(marker.getLngLat()));
    marker.on('dragstart', () => {
      element.classList.add('dragging');
      this.draggedMarker.set(marker);
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
      this.draggedMarker.set(null);
      const { target } = markerCursor();
      marker.setLngLat(target);
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
    return !!(await this.write<Track>('Save Failed', () => editTrackLine(track.id, spec.kind, edit(track[spec.field]))));
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
