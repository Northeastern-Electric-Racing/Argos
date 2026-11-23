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
  linkedSignal,
  output,
  signal,
  untracked,
  viewChild
} from '@angular/core';
import { segmentedClasses } from 'src/ui/recipes/segmented';
import { loopOf, loopSummary } from '../../shutdown-loop.display';
import { cssVarReader } from '../../shutdown-loop.theme';
import { NodeStatus } from '../../shutdown-loop.utils';
import { CarLoopView } from '../../loop-view/loop-view';
import { UiIconComponent } from 'src/ui/icon/icon.component';
import { CarScene } from './car-scene.types';
import { BadgePlacement, BadgePoint, placeBadges, ScreenPoint, ViewPreset } from './car-view-3d.projection';
import { badgeModels, FallbackReason, fallbackReasonFor, readSceneColours } from './car-view-3d.utils';
import { CAR_SCENE_LOADER, WEBGL_SUPPORT } from './car-view-3d.tokens';

const VIEW_PRESETS: readonly { id: ViewPreset; label: string }[] = [
  { id: 'iso', label: 'Iso' },
  { id: 'side', label: 'Side' },
  { id: 'top', label: 'Top' }
];

/**
 * The car in 3D (three.js, loaded on demand) with each loop node where it sits and the loop wired through them in
 * order. A CarLoopView (loop-view/loop-view.ts): the page owns selection and the detail panel; a pick toggles the
 * pin, hover previews, and the camera closes in on the pinned loop node. Keyboard and assistive-tech access is the
 * loop strip: this view is an image labelled with the loop summary, and its badges take pointer clicks only.
 * When it can't draw (no WebGL, the scene fails to start, the context is lost) it emits `unavailable` and the page
 * shows the 2D car instead.
 */
@Component({
  selector: 'car-view-3d',
  templateUrl: './car-view-3d.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  imports: [UiIconComponent]
})
export class CarView3dComponent implements CarLoopView {
  readonly nodes = input.required<NodeStatus[]>();
  readonly selectedId = input<string | null>(null);
  readonly previewId = input<string | null>(null);
  /** False below `sm`: an overview (only the active loop node's badge, no picking). */
  readonly interactive = input(true);
  readonly nodeSelect = output<string | null>();
  readonly nodePreview = output<string | null>();
  /** The 3D view can't draw; the page shows the 2D car instead. */
  readonly unavailable = output<FallbackReason>();

  private readonly doc = inject(DOCUMENT);
  private readonly loadScene = inject(CAR_SCENE_LOADER);
  private readonly webgl = inject(WEBGL_SUPPORT);
  private readonly canvas = viewChild<ElementRef<HTMLCanvasElement>>('canvas');
  private readonly stage = viewChild<ElementRef<HTMLElement>>('stage');
  private scene?: CarScene;
  private destroyed = false;

  protected readonly ready = signal(false);
  protected readonly presets = VIEW_PRESETS;
  protected readonly segmented = segmentedClasses;
  protected readonly hint = this.matches('(pointer: coarse)')
    ? 'Two fingers to rotate and zoom'
    : 'Drag to orbit, scroll to zoom, right-drag to pan';

  protected readonly highlightId = computed(() => this.previewId() ?? this.selectedId());
  protected readonly summary = computed(() => loopSummary(loopOf(this.nodes())));
  private readonly breakId = computed(
    () =>
      this.nodes()
        .filter((s) => s.state === 'suspect')
        .at(-1)?.node.id ?? null
  );

  /** Each marker on screen after the last rendered frame. */
  private readonly points = signal<ScreenPoint[]>([]);
  protected readonly badges = computed(() => {
    const all = badgeModels(this.nodes(), this.highlightId());
    if (this.interactive()) return all;
    const only = this.highlightId() ?? this.breakId();
    return all.filter((b) => b.id === only);
  });
  /** Badge spots, keeping each badge's previous spot while it is clear (no hopping while orbiting). */
  private readonly placements = linkedSignal<BadgePoint[], BadgePlacement[]>({
    source: () => {
      const at = new Map(this.points().map((p) => [p.id, p]));
      return this.badges()
        .filter((b) => at.has(b.id))
        .map((b) => ({ ...at.get(b.id)!, suspect: b.suspect, width: b.width }));
    },
    computation: (points, previous) => placeBadges(points, previous?.value)
  });
  protected readonly overlay = computed(() => {
    const placed = new Map(this.placements().map((p) => [p.id, p]));
    return this.badges()
      .filter((b) => placed.get(b.id)?.visible)
      .map((b) => ({ ...b, at: placed.get(b.id)! }));
  });
  /** Suspects' halos and the highlight ring, over the canvas so nothing in the scene can hide them. */
  protected readonly rings = computed(() => {
    const suspects = new Set(
      this.nodes()
        .filter((s) => s.state === 'suspect')
        .map((s) => s.node.id)
    );
    const highlight = this.highlightId();
    return this.points()
      .filter((p) => p.visible && (suspects.has(p.id) || p.id === highlight))
      .map((p) => ({ id: p.id, x: p.x, y: p.y, suspect: suspects.has(p.id), highlighted: p.id === highlight }));
  });
  /** Re-keys the halo's three pings when the break moves. */
  protected readonly pingKey = computed(() => this.breakId() ?? '');

  constructor() {
    afterNextRender(() => void this.start());
    effect(() => {
      const nodes = this.nodes();
      if (this.ready()) this.scene?.setStatuses(nodes);
    });
    effect(() => {
      const id = this.highlightId();
      if (this.ready()) this.scene?.setHighlight(id);
    });
    effect(() => {
      const on = this.interactive();
      if (this.ready()) this.scene?.setInteractive(on);
    });
    // The camera follows the pin, and nothing else.
    effect(() => {
      const id = this.selectedId();
      if (this.ready()) untracked(() => this.scene?.focus(id));
    });
    inject(DestroyRef).onDestroy(() => {
      this.destroyed = true;
      this.stop();
    });
  }

  protected setView(preset: ViewPreset): void {
    this.scene?.setView(preset);
  }

  /** A pick toggles the pin (LoopView rule 2); empty canvas clears it. */
  protected toggle(id: string | null): void {
    if (!this.interactive()) return;
    const selected = this.selectedId();
    if (id === null) {
      if (selected !== null) this.nodeSelect.emit(null);
      return;
    }
    this.nodeSelect.emit(id === selected ? null : id);
  }

  protected preview(id: string | null): void {
    if (this.interactive() || id === null) this.nodePreview.emit(id);
  }

  protected onEscape(): void {
    if (this.selectedId() !== null) this.nodeSelect.emit(null);
  }

  private async start(): Promise<void> {
    if (!this.webgl()) return this.fallBack('webgl');
    const canvas = this.canvas()?.nativeElement;
    const container = this.stage()?.nativeElement;
    if (!canvas || !container) return this.fallBack('init');
    try {
      const create = await this.loadScene();
      if (this.destroyed) return;
      this.scene = create({
        canvas,
        container,
        colours: readSceneColours(cssVarReader(this.doc.documentElement)),
        reducedMotion: this.matches('(prefers-reduced-motion: reduce)'),
        coarsePointer: this.matches('(pointer: coarse)'),
        onFrame: (points) => this.points.set(points),
        onPick: (id) => this.toggle(id),
        onHover: (id) => this.preview(id),
        onContextLost: () => this.fallBack('context-lost')
      });
      this.ready.set(true);
    } catch (err) {
      console.warn('3D car view unavailable, showing 2D', err);
      this.fallBack(fallbackReasonFor(err));
    }
  }

  private matches(query: string): boolean {
    return this.doc.defaultView?.matchMedia?.(query).matches ?? false;
  }

  private fallBack(reason: FallbackReason): void {
    this.stop();
    if (!this.destroyed) this.unavailable.emit(reason);
  }

  private stop(): void {
    this.scene?.dispose();
    this.scene = undefined;
    this.ready.set(false);
  }
}
