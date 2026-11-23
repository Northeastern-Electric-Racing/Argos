import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  NgZone,
  signal,
  viewChild,
  viewChildren
} from '@angular/core';
import { NODE_STATE_DISPLAY } from '../../shutdown-loop.display';
import { NodeState, NodeStatus } from '../../shutdown-loop.utils';
import { UiIconComponent } from 'src/ui/icon/icon.component';
import { CarViewComponent } from '../car-view/car-view.component';
import { StatusGlyphComponent } from '../status-glyph/status-glyph.component';
import {
  CarScene,
  DEFAULT_SCENE_COLORS,
  nodeInfo,
  SCENE_COLOR_TOKENS,
  SceneColors,
  VIEW_PRESETS,
  ViewPreset
} from './car-view-3d.model';
import { CAR_SCENE_LOADER, WEBGL_SUPPORT } from './car-view-3d.tokens';

type Mode = 'loading' | 'ready' | 'fallback';

/**
 * The car in 3D (three.js, loaded on demand) with each shutdown node where it sits and the loop wired
 * through them in order. Orbit, zoom and pan with the pointer; presets and a node toolbar for the keyboard.
 * Falls back to the 2D car view without WebGL, if the scene fails to load, or if the context is lost.
 */
@Component({
  selector: 'car-view-3d',
  templateUrl: './car-view-3d.component.html',
  styleUrls: ['../../shutdown-states.css', './car-view-3d.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CarViewComponent, StatusGlyphComponent, UiIconComponent]
})
export class CarView3dComponent {
  nodes = input.required<NodeStatus[]>();

  private zone = inject(NgZone);
  private loadScene = inject(CAR_SCENE_LOADER);
  private canvas = viewChild<ElementRef<HTMLCanvasElement>>('canvas');
  private stage = viewChild<ElementRef<HTMLElement>>('stage');
  private nodeButtons = viewChildren<ElementRef<HTMLButtonElement>>('nodeButton');
  private probes = viewChildren<ElementRef<HTMLElement>>('probe');
  private scene?: CarScene;
  private destroyed = false;

  readonly mode = signal<Mode>(inject(WEBGL_SUPPORT)() ? 'loading' : 'fallback');
  readonly selectedId = signal<string | null>(null);
  readonly presets = VIEW_PRESETS;
  readonly states = Object.keys(NODE_STATE_DISPLAY) as NodeState[];
  readonly display = NODE_STATE_DISPLAY;

  readonly buttons = computed(() =>
    this.nodes().map((s, i) => ({
      id: s.node.id,
      order: i + 1,
      cssClass: NODE_STATE_DISPLAY[s.state].cssClass,
      unmeasured: !s.node.topic,
      ariaLabel: `${i + 1} ${s.node.label}: ${NODE_STATE_DISPLAY[s.state].label}`
    }))
  );
  readonly selected = computed(() => {
    const id = this.selectedId();
    const nodes = this.nodes();
    const i = nodes.findIndex((s) => s.node.id === id);
    if (i < 0) return null;
    const { state } = nodes[i];
    return { ...nodeInfo(nodes[i], i + 1), stateId: state, cssClass: NODE_STATE_DISPLAY[state].cssClass };
  });

  constructor() {
    afterNextRender(() => this.start());
    effect(() => {
      const nodes = this.nodes();
      if (this.mode() === 'ready') this.zone.runOutsideAngular(() => this.scene?.update(nodes));
    });
    effect(() => {
      const id = this.selectedId();
      if (this.mode() === 'ready') this.zone.runOutsideAngular(() => this.scene?.setSelected(id));
    });
    inject(DestroyRef).onDestroy(() => {
      this.destroyed = true;
      this.stop();
    });
  }

  setView(preset: ViewPreset): void {
    this.zone.runOutsideAngular(() => this.scene?.setView(preset));
  }

  toggle(id: string): void {
    this.selectedId.update((current) => (current === id ? null : id));
  }

  /** Roving focus over the node toolbar: arrows and Home/End move and select, Escape clears. */
  onToolbarKey(event: KeyboardEvent, index: number): void {
    const last = this.nodes().length - 1;
    const next =
      event.key === 'ArrowRight' || event.key === 'ArrowDown'
        ? Math.min(index + 1, last)
        : event.key === 'ArrowLeft' || event.key === 'ArrowUp'
          ? Math.max(index - 1, 0)
          : event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? last
              : undefined;
    if (event.key === 'Escape') {
      this.selectedId.set(null);
      event.preventDefault();
      return;
    }
    if (next === undefined) return;
    event.preventDefault();
    this.selectedId.set(this.nodes()[next].node.id);
    this.nodeButtons()[next]?.nativeElement.focus();
  }

  /** The toolbar button that takes Tab focus: the selected node's, else the first. */
  tabStop(index: number): number {
    const selected = this.nodes().findIndex((s) => s.node.id === this.selectedId());
    return index === (selected < 0 ? 0 : selected) ? 0 : -1;
  }

  private async start(): Promise<void> {
    if (this.mode() !== 'loading') return;
    const canvas = this.canvas()?.nativeElement;
    const container = this.stage()?.nativeElement;
    if (!canvas || !container) return;
    try {
      const create = await this.loadScene();
      if (this.destroyed) return;
      const colors = this.readColors();
      const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
      this.scene = this.zone.runOutsideAngular(() =>
        create({
          canvas,
          container,
          colors,
          reducedMotion,
          onPick: (id) => this.selectedId.set(id),
          onContextLost: () => this.fallBack()
        })
      );
      this.mode.set('ready');
    } catch (err) {
      console.warn('3D car view unavailable, showing 2D', err);
      this.fallBack();
    }
  }

  private fallBack(): void {
    this.stop();
    this.mode.set('fallback');
  }

  private stop(): void {
    this.scene?.dispose();
    this.scene = undefined;
  }

  /** Scene colours from the theme tokens, and state colours through the same classes the 2D view uses. */
  private readColors(): SceneColors {
    const root = getComputedStyle(document.documentElement);
    const read = (style: CSSStyleDeclaration, name: string, fallback: string) =>
      style.getPropertyValue(name).trim() || fallback;
    const colors = { ...DEFAULT_SCENE_COLORS, states: { ...DEFAULT_SCENE_COLORS.states } };
    for (const [key, token] of Object.entries(SCENE_COLOR_TOKENS) as [keyof typeof SCENE_COLOR_TOKENS, string][]) {
      colors[key] = read(root, token, colors[key]);
    }
    this.probes().forEach((probe, i) => {
      const state = this.states[i];
      colors.states[state] = read(getComputedStyle(probe.nativeElement), '--sd-color', colors.states[state]);
    });
    return colors;
  }
}
