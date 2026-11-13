import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  linkedSignal,
  signal,
  untracked
} from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { LngLatBounds, Map as MapLibreMap, Marker, VectorTileSource } from 'maplibre-gl';
import { EMPTY, asyncScheduler, filter, from, merge, switchMap, tap, throttleTime } from 'rxjs';
import { getTrace } from 'src/api/trace.api';
import { addTrack, deleteTrack, editTrackLine } from 'src/api/track.api';
import SidebarToggleComponent from 'src/components/sidebar-toggle/sidebar-toggle.component';
import Storage from 'src/services/storage.service';
import { UiButtonDirective } from 'src/ui/button/button.directive';
import { ConfirmService } from 'src/ui/confirm/confirm.service';
import { UiInputDirective } from 'src/ui/field/field.directive';
import { cellClass, lightHeaderCellClass, tableClass } from 'src/ui/recipes/table';
import { cx, tw } from 'src/ui/recipes/tw';
import { UiSelectComponent } from 'src/ui/select/select.component';
import { ToastService } from 'src/ui/toast/toast.service';
import {
  LINES,
  LineSpec,
  draftLineGeoJson,
  fixAt,
  fromLngLat,
  linePoints,
  linesGeoJson,
  pointGeoJson,
  setOverlay,
  toFix,
  traceGeoJson
} from 'src/utils/map.utils';
import { lapTable } from 'src/utils/lap-timer.types';
import { topics } from 'src/utils/topic.utils';
import { Coordinate, Fix, TimingLine, Track } from 'src/utils/types.utils';
import MapCanvasComponent from './map-canvas/map-canvas.component';

const FIT_PADDING_PX = 60;
const MAX_FIT_ZOOM = 19;
// MapLibre re-tiles the whole trace on each redraw, too costly at GPS rates up to 10 Hz.
const TRACE_REDRAW_MS = 1_000;

// No scale: MapLibre positions markers with transform, which scale would multiply, moving the marker off the cursor.
const LINE_END_CLASS = tw('size-3 rounded-full hover:ring-3 hover:ring-fg/40 data-dragging:ring-4 data-dragging:ring-fg');

type Cursor = { point: Coordinate; fix: Fix | null };

const sameJson = (left: unknown, right: unknown) => JSON.stringify(left) === JSON.stringify(right);

@Component({
  selector: 'map',
  templateUrl: './map.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    SidebarToggleComponent,
    FormsModule,
    ReactiveFormsModule,
    MapCanvasComponent,
    DatePipe,
    DecimalPipe,
    UiButtonDirective,
    UiInputDirective,
    UiSelectComponent
  ],
  host: {
    class: 'flex h-[calc(100vh-76px)] flex-col max-md:h-dvh',
    '(window:resize)': 'onResize()',
    '(document:keydown.escape)': 'cancelPlacing()'
  }
})
export default class MapComponent {
  private storage = inject(Storage);
  private toastService = inject(ToastService);
  private confirmService = inject(ConfirmService);
  private map = signal<MapLibreMap | undefined>(undefined);
  private traceFixes = signal<Fix[]>([]);
  readonly trace = this.traceFixes.asReadonly();
  // Live view refits to the trace until the user pans or zooms.
  private followCar = true;

  // A dropped socket clears the current run; keep this Run's trace and the engineer's view until another Run starts.
  runId = toSignal(this.storage.getCurrentRunId().pipe(filter((runId) => runId !== undefined)));
  // scylla sends the tracks and live laps every second; an unchanged copy must not redraw the map under a drag.
  tracks = toSignal(this.storage.getTracks(), { requireSync: true, equal: sameJson });
  selectedTrackId = signal<number | null>(null);
  selectedTrack = computed(() => this.tracks().find((track) => track.id === this.selectedTrackId()) ?? null);
  private liveLaps = toSignal(this.storage.getLiveLaps(), { requireSync: true, equal: sameJson });
  // A FormControl updates the input immediately; a reset signal only reaches it on the next render.
  newTrackName = new FormControl('', { nonNullable: true });
  private newTrackNameValue = toSignal(this.newTrackName.valueChanges, { initialValue: '' });
  private saving = false;
  canCreateTrack = computed(() => !!this.newTrackNameValue().trim());
  placing = linkedSignal<number | undefined, LineSpec | null>({
    source: () => this.selectedTrack()?.id,
    computation: () => null
  });
  pendingEnd = linkedSignal<LineSpec | null, Coordinate | null>({ source: this.placing, computation: () => null });
  cursor = signal<Cursor | null>(null);
  private draggedMarker = signal<Marker | null>(null);
  readonly lineEnds: (keyof TimingLine)[] = ['a', 'b'];
  lineRows = computed(() => LINES.map((spec) => ({ spec, line: this.selectedTrack()?.[spec.field] ?? null })));
  private laps = computed(() => {
    const live = this.liveLaps();
    const track = this.selectedTrack();
    return live && track && live.runId === this.runId() ? live.laps[track.id] ?? [] : [];
  });
  lapTable = computed(() => lapTable(this.laps()));
  protected readonly lapClasses = {
    table: cx(tableClass('sm'), tw('tabular-nums')),
    header: lightHeaderCellClass(),
    cell: cellClass(),
    delta: cx(cellClass(), tw('text-fg-label')),
    best: tw('bg-battery-high/15 text-battery-high')
  };
  isMobile = signal(window.innerWidth <= 768);
  private lineEndMarkers = new Map<string, Marker>();

  constructor() {
    toObservable(this.runId)
      .pipe(
        switchMap((runId) => {
          this.traceFixes.set([]);
          this.followCar = true;
          return runId === undefined ? EMPTY : merge(this.history(runId), this.liveTrace());
        }),
        takeUntilDestroyed()
      )
      .subscribe();

    toObservable(computed(() => ({ map: this.map(), trace: this.trace() })))
      .pipe(throttleTime(TRACE_REDRAW_MS, asyncScheduler, { leading: true, trailing: true }), takeUntilDestroyed())
      .subscribe(({ map, trace }) => setOverlay(map, 'trace', traceGeoJson(trace)));
    effect(() => setOverlay(this.map(), 'car', pointGeoJson(this.trace().at(-1) ?? null)));
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
    effect(() => setOverlay(this.map(), 'draft', draftLineGeoJson(this.pendingEnd(), this.cursor()?.point ?? null)));
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

  selectTrack(track: Track) {
    this.selectedTrackId.set(track.id);
    // Before the car drives there is no trace to frame, so show where the track's lines are.
    if (this.trace().length === 0) this.fit(linePoints(track));
  }

  togglePlacing(spec: LineSpec) {
    this.placing.set(this.placing() === spec ? null : spec);
  }

  async createTrack() {
    const name = this.newTrackName.value.trim();
    if (!name) return;
    this.placing.set(null);
    const added = await this.write<Track>('Save Failed', () => addTrack(name));
    if (!added) return;
    this.selectedTrackId.set(added.id);
    this.newTrackName.reset();
  }

  async moveLineEnd(spec: LineSpec, end: keyof TimingLine, axis: keyof Coordinate, input: HTMLInputElement) {
    const value = input.valueAsNumber;
    if (await this.editLine(spec, (line) => line && { ...line, [end]: { ...line[end], [axis]: value } })) return;
    const shown = this.selectedTrack()?.[spec.field]?.[end];
    if (shown) input.value = shown[axis].toFixed(6);
  }

  clearLine(spec: LineSpec) {
    this.editLine(spec, () => null);
  }

  confirmDelete(track: Track) {
    this.confirmService.confirm({
      header: 'Delete track',
      message: `Delete "${track.name}" and its timing lines?`,
      acceptLabel: 'Delete',
      rejectLabel: 'Cancel',
      danger: true,
      accept: () => this.write<string>('Delete Failed', () => deleteTrack(track.id))
    });
  }

  onMapLoaded(map: MapLibreMap) {
    this.map.set(map);
    // Open on the venues the offline map covers, not the whole world; a trace, if there is one, is framed after.
    const coverage = map.getSource<VectorTileSource>('basemap')?.bounds;
    if (coverage) map.fitBounds(coverage, { padding: FIT_PADDING_PX, animate: false });
    this.fit(this.trace());
    map.on('click', (event) => this.placeEnd(fromLngLat(event.lngLat)));
    map.on('mousemove', (event) => this.cursor.set(this.cursorAt(map, fromLngLat(event.lngLat))));
    map.on('mouseout', () => this.cursor.set(null));
    map.on('movestart', (event) => {
      if (event.originalEvent) this.followCar = false;
    });
  }

  private cursorAt(map: MapLibreMap, point: Coordinate): Cursor {
    return { point, fix: fixAt(this.trace(), point, (coordinate) => map.project(coordinate)) };
  }

  private liveTrace() {
    return this.storage.get(topics.gpsLocation()).pipe(
      tap((value) => {
        const point = toFix(value);
        const last = this.trace().at(-1);
        // The stored history may already hold this fix.
        if (last && point.timeMs <= last.timeMs) return;
        this.traceFixes.update((trace) => [...trace, point]);
        if (this.trace().length === 1 || (this.followCar && !this.map()?.getBounds().contains(point)))
          this.fit(this.trace());
      })
    );
  }

  // The live trace draws while this loads, so a failure toasts instead of covering the map.
  private history(runId: number) {
    return from(this.request<Fix[]>('GPS History Unavailable', () => getTrace(runId))).pipe(
      tap((history) => {
        if (!history) return;
        const lastTimeMs = history.at(-1)?.timeMs ?? -Infinity;
        this.traceFixes.update((live) => [...history, ...live.filter((fix) => fix.timeMs > lastTimeMs)]);
        this.fit(this.trace());
      })
    );
  }

  private placeEnd(end: Coordinate) {
    const spec = this.placing();
    const a = this.pendingEnd();
    if (!spec) return;
    if (!a) this.pendingEnd.set(end);
    else this.editLine(spec, () => ({ a, b: end }));
  }

  private lineEndMarker(map: MapLibreMap, spec: LineSpec, end: keyof TimingLine) {
    const element = document.createElement('div');
    element.className = LINE_END_CLASS;
    element.style.background = spec.color;
    const marker = new Marker({ element, draggable: true });
    const markerPoint = () => fromLngLat(marker.getLngLat());
    marker.on('dragstart', () => {
      element.dataset['dragging'] = '';
      this.draggedMarker.set(marker);
    });
    marker.on('drag', () => {
      const point = markerPoint();
      const track = this.selectedTrack();
      const line = track?.[spec.field];
      this.cursor.set(this.cursorAt(map, point));
      if (track && line) setOverlay(map, 'lines', linesGeoJson({ ...track, [spec.field]: { ...line, [end]: point } }));
    });
    marker.on('dragend', async () => {
      delete element.dataset['dragging'];
      this.draggedMarker.set(null);
      const point = markerPoint();
      if (await this.editLine(spec, (line) => line && { ...line, [end]: point })) return;
      const track = this.selectedTrack();
      const line = track?.[spec.field];
      if (line) marker.setLngLat(line[end]);
      setOverlay(map, 'lines', linesGeoJson(track));
    });
    return marker;
  }

  private async editLine(spec: LineSpec, edit: (line: TimingLine | null) => TimingLine | null): Promise<boolean> {
    const track = this.selectedTrack();
    if (!track) return false;
    this.placing.set(null);
    return !!(await this.write<Track>('Save Failed', () => editTrackLine(track.id, spec.kind, edit(track[spec.field]))));
  }

  // One write at a time: a click, drag or edit made while one saves is dropped.
  private async write<T>(summary: string, send: () => Promise<Response>): Promise<T | null> {
    if (this.saving) return null;
    this.saving = true;
    const result = await this.request<T>(summary, send);
    this.saving = false;
    return result;
  }

  private async request<T>(summary: string, send: () => Promise<Response>): Promise<T | null> {
    try {
      const response = await send();
      if (response.ok) return await response.json();
      this.toastService.add({ severity: 'error', summary, detail: await response.text() });
    } catch {
      this.toastService.add({ severity: 'error', summary, detail: 'Network error' });
    }
    return null;
  }

  private fit(points: Coordinate[]) {
    const map = this.map();
    if (!map || points.length === 0) return;
    const bounds = points.reduce((bounds, point) => bounds.extend(point), new LngLatBounds(points[0], points[0]));
    map.fitBounds(bounds, { padding: FIT_PADDING_PX, maxZoom: MAX_FIT_ZOOM, animate: false });
  }
}
