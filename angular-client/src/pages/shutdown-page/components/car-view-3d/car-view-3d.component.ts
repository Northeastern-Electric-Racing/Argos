import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  InjectionToken,
  input,
  NgZone,
  signal,
  viewChild
} from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { NODE_STATE_DISPLAY, PLACEHOLDER_TAG } from '../../shutdown-loop.display';
import { NodeStatus } from '../../shutdown-loop.utils';
import { CarViewComponent } from '../car-view/car-view.component';
import { StatusGlyphComponent } from '../status-glyph/status-glyph.component';
import { CarScene, CarSceneModule, ScreenPoint } from './car-scene.types';
import {
  FALLBACK_NOTICES,
  FallbackReason,
  fallbackReasonFor,
  isWebGLAvailable,
  MaterialMode,
  nodeDetail,
  PositionSource,
  resolveStateColours,
  StateColours,
  ViewPreset
} from './car-view-3d.utils';

/** Loads the three.js scene module on demand, so three is a lazy chunk. Overridden in tests. */
export const CAR_SCENE_LOADER = new InjectionToken<() => Promise<CarSceneModule>>('CAR_SCENE_LOADER', {
  providedIn: 'root',
  factory: () => () => import('./car-scene')
});

/** Whether this browser can make a WebGL context. Overridden in tests (jsdom has none). */
export const WEBGL_SUPPORT = new InjectionToken<() => boolean>('WEBGL_SUPPORT', {
  providedIn: 'root',
  factory: () => {
    const doc = inject(DOCUMENT);
    return () => isWebGLAvailable(doc);
  }
});

const MODEL_URL = 'assets/models/car.glb';
const DRACO_PATH = 'assets/draco/';
/** A click that moved further than this since pointerdown was an orbit drag, not a pick. */
const CLICK_SLOP_PX = 5;

const VIEW_PRESETS: { id: ViewPreset; label: string }[] = [
  { id: 'side', label: 'Side' },
  { id: 'top', label: 'Top' },
  { id: 'iso', label: 'Iso' }
];
const MATERIAL_MODES: { id: MaterialMode; label: string }[] = [
  { id: 'cad', label: 'CAD' },
  { id: 'theme', label: 'Theme' },
  { id: 'ghost', label: 'Ghost' }
];
const SOURCE_LABEL: Record<PositionSource, string> = {
  model: 'from the model',
  table: 'from the position table'
};

type Phase = 'loading' | 'ready' | 'fallback';

/**
 * 3D car view: loads the car model (glTF/GLB), draws the shutdown loop through it as tubes coloured by node
 * state, and lets the viewer orbit, pick a view and select a node. Falls back to the 2D side view when
 * WebGL, three or the model can't be loaded. three.js runs outside Angular and renders only on change.
 */
@Component({
  selector: 'car-view-3d',
  templateUrl: './car-view-3d.component.html',
  styleUrls: ['../../shutdown-states.css', './car-view-3d.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CarViewComponent, StatusGlyphComponent]
})
export class CarView3dComponent {
  nodes = input.required<NodeStatus[]>();

  private loadScene = inject(CAR_SCENE_LOADER);
  private webglSupported = inject(WEBGL_SUPPORT);
  private zone = inject(NgZone);
  private doc = inject(DOCUMENT);
  private stage = viewChild<ElementRef<HTMLElement>>('stage');
  private canvas = viewChild<ElementRef<HTMLCanvasElement>>('canvas');
  private probes = viewChild.required<ElementRef<HTMLElement>>('probes');

  private scene = signal<CarScene | null>(null);
  private destroyed = false;
  private pointerDown?: { x: number; y: number };

  readonly phase = signal<Phase>('loading');
  readonly fallbackReason = signal<FallbackReason | null>(null);
  readonly notice = computed(() => {
    const reason = this.fallbackReason();
    return reason ? FALLBACK_NOTICES[reason] : '';
  });
  readonly view = signal<ViewPreset>('iso');
  readonly materialMode = signal<MaterialMode>('ghost');
  readonly selectedId = signal<string | null>(null);
  readonly positionSources = signal<ReadonlyMap<string, PositionSource>>(new Map());

  readonly viewPresets = VIEW_PRESETS;
  readonly materialModes = MATERIAL_MODES;
  readonly placeholderTag = PLACEHOLDER_TAG;
  readonly states = Object.values(NODE_STATE_DISPLAY).map((d) => d.cssClass);

  readonly badges = computed(() =>
    this.nodes().map((s, i) => ({
      id: s.node.id,
      order: i + 1,
      cssClass: NODE_STATE_DISPLAY[s.state].cssClass,
      unmeasured: !s.node.topic,
      ariaLabel:
        `${i + 1}. ${s.node.label}: ${NODE_STATE_DISPLAY[s.state].label}` +
        (s.node.topic ? '' : ' (no sensor)') +
        (s.mismatch ? ', mismatch' : '')
    }))
  );

  readonly selected = computed(() => {
    const id = this.selectedId();
    const index = this.nodes().findIndex((s) => s.node.id === id);
    if (index < 0) return null;
    const status = this.nodes()[index];
    const source = this.positionSources().get(status.node.id);
    return {
      order: index + 1,
      status,
      cssClass: NODE_STATE_DISPLAY[status.state].cssClass,
      detail: nodeDetail(status),
      source: source ? SOURCE_LABEL[source] : 'not placed'
    };
  });

  /** State colours as shutdown-states.css defines them, read once from hidden probe elements. */
  private colours?: StateColours;

  constructor() {
    afterNextRender(() => void this.start());

    effect(() => {
      const scene = this.scene();
      const nodes = this.nodes();
      if (scene) this.zone.runOutsideAngular(() => scene.setStatuses(nodes, this.stateColours()));
    });
    effect(() => {
      const scene = this.scene();
      const mode = this.materialMode();
      if (scene) this.zone.runOutsideAngular(() => scene.setMaterialMode(mode));
    });
    effect(() => {
      const scene = this.scene();
      const id = this.selectedId();
      if (scene) this.zone.runOutsideAngular(() => scene.setSelected(id));
    });

    inject(DestroyRef).onDestroy(() => {
      this.destroyed = true;
      this.scene()?.dispose();
    });
  }

  setView(preset: ViewPreset): void {
    this.view.set(preset);
    this.scene()?.setView(preset);
  }

  select(id: string | null): void {
    this.selectedId.set(this.selectedId() === id ? null : id);
  }

  onPointerDown(event: PointerEvent): void {
    this.pointerDown = { x: event.clientX, y: event.clientY };
  }

  onCanvasClick(event: MouseEvent): void {
    const start = this.pointerDown;
    this.pointerDown = undefined;
    if (start && Math.hypot(event.clientX - start.x, event.clientY - start.y) > CLICK_SLOP_PX) return;
    const scene = this.scene();
    if (scene) this.selectedId.set(scene.pick(event.clientX, event.clientY));
  }

  private async start(): Promise<void> {
    if (!this.webglSupported()) return this.fallBack('webgl');
    const stage = this.stage()?.nativeElement;
    const canvas = this.canvas()?.nativeElement;
    if (!stage || !canvas) return this.fallBack('init');
    try {
      const module = await this.loadScene();
      if (this.destroyed) return;
      const scene = await this.zone.runOutsideAngular(() =>
        module.createCarScene({
          container: stage,
          canvas,
          nodes: this.nodes().map((s) => s.node),
          modelUrl: MODEL_URL,
          dracoDecoderPath: DRACO_PATH,
          view: this.view(),
          materialMode: this.materialMode(),
          theme: this.themeColours(),
          onFrame: (points) => this.placeBadges(points)
        })
      );
      if (this.destroyed) {
        scene.dispose();
        return;
      }
      this.positionSources.set(scene.positionSources);
      this.scene.set(scene);
      this.phase.set('ready');
    } catch (error) {
      console.error('Shutdown 3D view failed, showing 2D:', error);
      this.fallBack(fallbackReasonFor(error));
    }
  }

  private fallBack(reason: FallbackReason): void {
    if (this.destroyed) return;
    this.fallbackReason.set(reason);
    this.phase.set('fallback');
  }

  /** Moves each node's button to its marker. Runs outside Angular on every rendered frame. */
  private placeBadges(points: ScreenPoint[]): void {
    const stage = this.stage()?.nativeElement;
    if (!stage) return;
    for (const p of points) {
      const button = stage.querySelector<HTMLElement>(`button[data-node-id="${p.id}"]`);
      if (!button) continue;
      button.style.transform = `translate(${Math.round(p.x)}px, ${Math.round(p.y)}px)`;
      button.style.visibility = p.visible ? 'visible' : 'hidden';
    }
  }

  private stateColours(): StateColours {
    if (!this.colours) {
      const probes = this.probes().nativeElement;
      const view = this.doc.defaultView;
      this.colours = resolveStateColours((cssClass) => {
        const probe = probes.querySelector(`.${cssClass}`);
        return probe && view ? view.getComputedStyle(probe).getPropertyValue('--sd-color') : undefined;
      });
    }
    return this.colours;
  }

  private themeColours(): { body: string; ghost: string; grid: string; selection: string } {
    const style = this.doc.defaultView?.getComputedStyle(this.doc.documentElement);
    const token = (name: string, fallback: string) => style?.getPropertyValue(name).trim() || fallback;
    return {
      body: token('--color-border-strong', '#5a5a5a'),
      ghost: token('--color-fg-muted', '#a3a3a3'),
      grid: token('--color-border', '#414141'),
      selection: token('--color-fg', '#efefef')
    };
  }
}
