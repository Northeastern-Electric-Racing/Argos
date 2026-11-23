import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  DOCUMENT,
  effect,
  ElementRef,
  inject,
  input,
  output,
  signal,
  viewChild,
  viewChildren
} from '@angular/core';
import { UiIconComponent } from 'src/ui/icon/icon.component';
import { buttonClass } from 'src/ui/recipes/button';
import { segmentedClasses } from 'src/ui/recipes/segmented';
import { cx, tw } from 'src/ui/recipes/tw';
import { loopOf, loopSummary, readStateColours } from '../../shutdown-loop.display';
import { cssVarReader, readThemeColour } from '../../shutdown-loop.theme';
import { NodeStatus } from '../../shutdown-loop.utils';
import { CarLoopView } from '../../loop-view/loop-view';
import { CarScene, ScreenPoint } from './car-scene.types';
import { BADGE_SIZE, BadgePlacement, placeBadges, ViewPreset } from './car-view-3d.projection';
import { CAR_SCENE_LOADER, WEBGL_SUPPORT } from './car-view-3d.tokens';
import { CAR_MODEL_URL } from './car-model-url.token';
import {
  ABSENT_MODEL_NOTICE,
  BADGE_FALLBACK_WIDTH,
  BadgeModel,
  badgeModels,
  FallbackReason,
  fallbackReasonFor,
  MATERIAL_MODES,
  MaterialMode,
  orbitHint,
  readMaterialMode,
  sameSceneStatus,
  SCENE_COLOR_TOKENS,
  SceneColours,
  sceneStatus,
  writeMaterialMode
} from './car-view-3d.utils';

/** A click that moved further than this since pointerdown was an orbit drag, not a pick. */
const CLICK_SLOP_PX = 5;

const VIEW_PRESETS: { id: ViewPreset; label: string }[] = [
  { id: 'side', label: 'Side' },
  { id: 'top', label: 'Top' },
  { id: 'iso', label: 'Iso' }
];

type Phase = 'starting' | 'loading' | 'ready' | 'absent' | 'failed';

const storage = (): Storage => localStorage;

const BADGE_BASE = tw(
  'pointer-events-auto invisible absolute top-0 left-0 inline-flex cursor-pointer items-center gap-0.5 rounded-full border-2 font-mono font-bold whitespace-nowrap select-none'
);
const BADGE_TEXT = { normal: tw('h-6 px-1 text-xs'), suspect: tw('h-6 px-1.5 text-sm') };
const BADGE_HIGHLIGHT = tw('z-10 ring-2 ring-fg ring-offset-1 ring-offset-page');

/**
 * 3D car view (glTF): draws the shutdown loop as tubes and markers at once, then loads the car model (GLB) around
 * them. Loop nodes are placed from NODE_POSITIONS_3D unless the model names an anchor for them. A LoopView: it
 * highlights `previewId ?? selectedId`, a pick toggles the pin, hover previews; the strip is the keyboard path, so
 * the canvas is an image labelled with the loop summary and the badges are pointer-only. When 3D can't run (no
 * WebGL, a broken model, a lost context) it emits `unavailable` and the page shows the 2D view. Renders on change.
 */
@Component({
  selector: 'car-view-3d',
  templateUrl: './car-view-3d.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [UiIconComponent],
  host: { class: 'flex flex-col gap-2', '(keydown.escape)': 'nodeSelect.emit(null)' }
})
export class CarView3dComponent implements CarLoopView {
  readonly nodes = input.required<NodeStatus[]>();
  readonly selectedId = input<string | null>(null);
  readonly previewId = input<string | null>(null);
  /** False below `sm`: an overview, so no picking and only the active loop node's badge. */
  readonly interactive = input(true);
  readonly nodeSelect = output<string | null>();
  readonly nodePreview = output<string | null>();
  /** 3D can't run here; the page switches to 2D and shows FALLBACK_NOTICES[reason]. */
  readonly unavailable = output<FallbackReason>();

  private loadScene = inject(CAR_SCENE_LOADER);
  private webglSupported = inject(WEBGL_SUPPORT);
  private modelUrl = inject(CAR_MODEL_URL);
  private doc = inject(DOCUMENT);
  private stage = viewChild.required<ElementRef<HTMLElement>>('stage');
  private canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private badgeEls = viewChildren<ElementRef<HTMLElement>>('badge');
  private leaderEls = viewChildren<ElementRef<SVGLineElement>>('leader');

  private scene = signal<CarScene | null>(null);
  private destroyed = false;
  private pointerDown?: { x: number; y: number; id: number };
  private hoverId: string | null = null;
  private placements: BadgePlacement[] = [];
  private badgeWidths = new Map<string, number>();

  readonly phase = signal<Phase>('starting');
  readonly progress = signal<number | null>(null);
  readonly materialMode = signal<MaterialMode>(readMaterialMode(storage));
  readonly coarsePointer = this.media('(pointer: coarse)');
  readonly hint = orbitHint(this.coarsePointer);
  readonly absentNotice = ABSENT_MODEL_NOTICE;
  readonly viewPresets = VIEW_PRESETS;
  readonly materialModes = MATERIAL_MODES;
  readonly presetClass = buttonClass('neutral', 'sm');
  readonly modelListClass = segmentedClasses.list;
  readonly modelItemClass = cx(segmentedClasses.item, tw('whitespace-nowrap'));

  /** previewId ?? selectedId: the loop node every view highlights. */
  readonly active = computed(() => this.previewId() ?? this.selectedId());
  readonly label = computed(() => `3D car view with shutdown loop nodes. ${loopSummary(loopOf(this.nodes()))}`);
  readonly loadingText = computed(() => {
    const p = this.progress();
    return p === null ? 'Loading car model…' : `Loading car model… ${Math.round(p * 100)} %`;
  });
  readonly badges = computed(() => badgeModels(this.nodes()));
  /** What the scene draws; equal across ticks that change only values or ages, so those never reach three. */
  private sceneStatus = computed(() => sceneStatus(this.nodes()), { equal: sameSceneStatus });

  constructor() {
    afterNextRender(() => void this.start());

    effect(() => {
      const scene = this.scene();
      const status = this.sceneStatus();
      scene?.setStatuses(status);
    });
    effect(() => {
      const scene = this.scene();
      const mode = this.materialMode();
      scene?.setMaterialMode(mode);
    });
    effect(() => {
      const scene = this.scene();
      const id = this.active();
      scene?.setHighlight(id);
    });
    effect(() => {
      // A new set of badges is laid out again before its first placement.
      this.badgeEls();
      this.badgeWidths.clear();
    });

    inject(DestroyRef).onDestroy(() => {
      this.destroyed = true;
      this.scene()?.dispose();
    });
  }

  badgeClass(b: BadgeModel): string {
    const active = this.active() === b.id;
    return cx(
      BADGE_BASE,
      b.suspect ? BADGE_TEXT.suspect : BADGE_TEXT.normal,
      b.classes,
      active && BADGE_HIGHLIGHT,
      !this.interactive() && (active ? tw('pointer-events-none') : tw('hidden'))
    );
  }

  setView(preset: ViewPreset): void {
    this.scene()?.setView(preset);
  }

  setMaterialMode(mode: MaterialMode): void {
    this.materialMode.set(mode);
    writeMaterialMode(storage, mode);
  }

  /** Rule 2: a pick pins a loop node, picking the pinned one (or nothing) clears the pin. */
  toggle(id: string | null): void {
    this.nodeSelect.emit(id === null || id === this.selectedId() ? null : id);
  }

  preview(id: string | null): void {
    if (id === this.hoverId) return;
    this.hoverId = id;
    this.nodePreview.emit(id);
  }

  onPointerDown(event: PointerEvent): void {
    if (event.button !== 0 || event.isPrimary === false) return;
    this.pointerDown = { x: event.clientX, y: event.clientY, id: event.pointerId };
  }

  onPointerMove(event: PointerEvent): void {
    if (event.buttons || event.pointerType === 'touch' || !this.interactive()) return;
    const scene = this.scene();
    if (scene) this.preview(scene.pick(event.clientX, event.clientY));
  }

  onCanvasClick(event: MouseEvent): void {
    const start = this.pointerDown;
    this.pointerDown = undefined;
    if (!start || Math.hypot(event.clientX - start.x, event.clientY - start.y) > CLICK_SLOP_PX) return;
    const scene = this.scene();
    if (scene && this.interactive()) this.toggle(scene.pick(event.clientX, event.clientY));
  }

  private async start(): Promise<void> {
    if (!this.webglSupported()) return this.fail('webgl');
    let createCarScene;
    try {
      createCarScene = await this.loadScene();
    } catch (error) {
      return this.fail('init', error);
    }
    if (this.destroyed) return;
    let scene: CarScene;
    try {
      scene = await createCarScene({
        container: this.stage().nativeElement,
        canvas: this.canvas().nativeElement,
        nodes: this.nodes().map((s) => s.node),
        view: 'iso',
        materialMode: this.materialMode(),
        colours: this.colours(),
        reducedMotion: this.media('(prefers-reduced-motion: reduce)'),
        coarsePointer: this.coarsePointer,
        onFrame: (points) => this.placeBadges(points),
        onContextLost: () => this.fail('context')
      });
    } catch (error) {
      return this.fail(fallbackReasonFor(error), error);
    }
    if (this.destroyed) return scene.dispose();
    this.scene.set(scene);
    this.phase.set('loading');
    try {
      const result = await scene.loadModel(this.modelUrl, (p) => this.progress.set(p));
      if (this.destroyed) return;
      if (result.kind === 'absent') {
        console.info(`Shutdown 3D view: no car model (${result.reason}); drawing the loop wiring only.`);
        this.phase.set('absent');
      } else {
        console.info(`Shutdown 3D view: ${result.summary}`);
        result.warnings.forEach((w) => console.warn(`Shutdown 3D view: ${w}`));
        this.phase.set('ready');
      }
    } catch (error) {
      if (!this.destroyed) this.fail(fallbackReasonFor(error), error);
    }
  }

  private fail(reason: FallbackReason, error?: unknown): void {
    if (this.destroyed || this.phase() === 'failed') return;
    console.warn(`Shutdown 3D view unavailable (${reason}), showing 2D.`, error ?? '');
    this.phase.set('failed');
    this.scene()?.dispose();
    this.scene.set(null);
    this.unavailable.emit(reason);
  }

  /** Moves each badge next to its marker, with a leader line when it had to move away. Runs per rendered frame. */
  private placeBadges(points: ScreenPoint[]): void {
    const els = new Map(this.badgeEls().map((r) => [r.nativeElement.dataset['nodeId']!, r.nativeElement]));
    const leaders = new Map(this.leaderEls().map((r) => [r.nativeElement.dataset['nodeId']!, r.nativeElement]));
    const suspects = new Set(
      this.badges()
        .filter((b) => b.suspect)
        .map((b) => b.id)
    );
    if (!this.badgeWidths.size) {
      for (const [id, el] of els) this.badgeWidths.set(id, el.offsetWidth || BADGE_FALLBACK_WIDTH);
    }
    const stage = this.stage().nativeElement;
    const input = points
      .filter((p) => els.has(p.id))
      .map((p) => ({ ...p, suspect: suspects.has(p.id), width: this.badgeWidths.get(p.id) ?? BADGE_FALLBACK_WIDTH }));
    const bounds = stage.clientWidth ? { width: stage.clientWidth, height: stage.clientHeight } : undefined;
    this.placements = placeBadges(input, this.placements, bounds);
    for (const b of this.placements) {
      const el = els.get(b.id)!;
      el.style.transform = `translate(${b.left}px, ${b.top}px)`;
      el.style.visibility = b.visible ? 'visible' : 'hidden';
      const line = leaders.get(b.id);
      if (!line) continue;
      line.style.visibility = b.leader && b.visible && !el.classList.contains('hidden') ? 'visible' : 'hidden';
      line.setAttribute('x1', String(b.x));
      line.setAttribute('y1', String(b.y));
      // To the nearest point of the badge.
      line.setAttribute('x2', String(Math.min(Math.max(b.x, b.left), b.left + b.width)));
      line.setAttribute('y2', String(Math.min(Math.max(b.y, b.top), b.top + BADGE_SIZE)));
    }
  }

  private colours(): { states: ReturnType<typeof readStateColours>; scene: SceneColours } {
    const read = cssVarReader(this.doc.documentElement);
    const scene = Object.fromEntries(
      Object.entries(SCENE_COLOR_TOKENS).map(([name, token]) => [name, readThemeColour(token, read)])
    ) as SceneColours;
    return { states: readStateColours(read), scene };
  }

  private media(query: string): boolean {
    try {
      return this.doc.defaultView?.matchMedia?.(query).matches ?? false;
    } catch {
      return false;
    }
  }
}
