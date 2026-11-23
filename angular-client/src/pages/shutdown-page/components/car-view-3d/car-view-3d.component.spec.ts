import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { Mock } from 'vitest';
import { LOOP_VIEW_CONTRACT_NODES, expectLoopViewContract } from '../../loop-view/loop-view.contract';
import { LoopView } from '../../loop-view/loop-view';
import { loopOf, loopSummary } from '../../shutdown-loop.display';
import { NodeStatus } from '../../shutdown-loop.utils';
import { CarView3dComponent } from './car-view-3d.component';
import { CarScene, CarSceneFactory, CarSceneOptions } from './car-scene.types';
import { ScreenPoint } from './car-view-3d.projection';
import { CarSceneError, FallbackReason } from './car-view-3d.utils';
import { CAR_SCENE_LOADER, WEBGL_SUPPORT } from './car-view-3d.tokens';

const NODES = LOOP_VIEW_CONTRACT_NODES;

type FakeScene = { [K in keyof CarScene]: Mock<CarScene[K]> };

/** Every loop node's marker on screen, 40 px apart in a row. */
const POINTS: ScreenPoint[] = NODES.map((s, i) => ({ id: s.node.id, x: 30 + i * 40, y: 120, z: 0.5, visible: true }));

describe('CarView3dComponent', () => {
  let fixture: ComponentFixture<CarView3dComponent>;
  let el: HTMLElement;
  let scene: FakeScene;
  let options: CarSceneOptions | undefined;
  let loader: Mock<() => Promise<CarSceneFactory>>;
  let unavailable: FallbackReason[];

  const configure = async (webgl: boolean, load?: () => Promise<CarSceneFactory>) => {
    scene = {
      setStatuses: vi.fn<CarScene['setStatuses']>(),
      setHighlight: vi.fn<CarScene['setHighlight']>(),
      focus: vi.fn<CarScene['focus']>(),
      setView: vi.fn<CarScene['setView']>(),
      setInteractive: vi.fn<CarScene['setInteractive']>(),
      dispose: vi.fn<CarScene['dispose']>()
    };
    options = undefined;
    const factory: CarSceneFactory = (o) => {
      options = o;
      return scene;
    };
    loader = vi.fn(load ?? (() => Promise.resolve(factory)));
    await TestBed.configureTestingModule({
      imports: [CarView3dComponent],
      providers: [
        { provide: WEBGL_SUPPORT, useValue: () => webgl },
        { provide: CAR_SCENE_LOADER, useValue: loader }
      ]
    }).compileComponents();
  };

  /** A started 3D view with one rendered frame, so its badges are on screen. */
  const create = async (nodes: NodeStatus[] = NODES) => {
    fixture = TestBed.createComponent(CarView3dComponent);
    unavailable = [];
    fixture.componentInstance.unavailable.subscribe((r) => unavailable.push(r));
    fixture.componentRef.setInput('nodes', nodes);
    fixture.detectChanges();
    await fixture.whenStable();
    options?.onFrame(POINTS);
    fixture.detectChanges();
    el = fixture.nativeElement;
    return fixture;
  };
  const badge = (id: string) => el.querySelector<HTMLElement>(`[data-badge][data-node-id="${id}"]`);

  describe('with a scene', () => {
    beforeEach(() => configure(true));

    expectLoopViewContract(() => create() as Promise<ComponentFixture<LoopView>>, {
      options: false,
      click: (f, id) => {
        badge(id)!.click();
        f.detectChanges();
      },
      hover: (_, id) => badge(id)!.dispatchEvent(new MouseEvent('mouseenter')),
      leave: (_, id) => badge(id)!.dispatchEvent(new MouseEvent('mouseleave')),
      highlighted: (_, id) => badge(id)?.dataset['highlighted'] === 'true' && scene.setHighlight.mock.lastCall?.[0] === id
    });

    it('loads the scene once and hands it the loop', async () => {
      await create();
      expect(loader).toHaveBeenCalledOnce();
      expect(scene.setStatuses).toHaveBeenLastCalledWith(NODES);
    });

    it('is an image labelled with the loop summary, its badges hidden from assistive tech', async () => {
      await create();
      const img = el.querySelector('[role="img"]')!;
      expect(img.getAttribute('aria-label')).toContain(loopSummary(loopOf(NODES)));
      expect(badge('tsms')!.closest('[aria-hidden="true"]')).toBeTruthy();
      expect(el.querySelectorAll('[role="option"], [tabindex="0"]').length).toBe(0);
    });

    it('reads its colours from theme tokens', async () => {
      document.documentElement.style.setProperty('--color-danger', 'rgb(1, 2, 3)');
      await create();
      document.documentElement.style.removeProperty('--color-danger');
      expect(options!.colours.states.suspect).toBe('rgb(1, 2, 3)');
    });

    it('names the cause on its badge and rings it with a halo', async () => {
      await create();
      expect(badge('tsms')!.textContent).toContain('TSMS');
      expect(badge('tsms')!.dataset['suspect']).toBe('true');
      expect(el.querySelector('[data-ring="halo"]')).toBeTruthy();
      expect(badge('hvd')!.querySelector('ui-icon + span')!.textContent!.trim()).toBe(
        String(NODES.findIndex((s) => s.node.id === 'hvd') + 1)
      );
    });

    it('toggles the pin on a canvas pick and clears it on an empty-canvas click', async () => {
      await create();
      const selected: (string | null)[] = [];
      fixture.componentInstance.nodeSelect.subscribe((id) => selected.push(id));
      options!.onPick('bots');
      fixture.componentRef.setInput('selectedId', 'bots');
      options!.onPick(null);
      options!.onPick('bots');
      expect(selected).toEqual(['bots', null, null]);
    });

    it('previews on canvas hover', async () => {
      await create();
      const previewed: (string | null)[] = [];
      fixture.componentInstance.nodePreview.subscribe((id) => previewed.push(id));
      options!.onHover('hvd');
      options!.onHover(null);
      expect(previewed).toEqual(['hvd', null]);
    });

    it('moves the camera to the pinned loop node, never to a preview', async () => {
      await create();
      fixture.componentRef.setInput('previewId', 'hvd');
      fixture.detectChanges();
      expect(scene.focus).not.toHaveBeenCalledWith('hvd');
      fixture.componentRef.setInput('selectedId', 'bots');
      fixture.detectChanges();
      expect(scene.focus).toHaveBeenLastCalledWith('bots');
    });

    it('clears the pin on Escape', async () => {
      await create();
      fixture.componentRef.setInput('selectedId', 'bots');
      fixture.detectChanges();
      const selected: (string | null)[] = [];
      fixture.componentInstance.nodeSelect.subscribe((id) => selected.push(id));
      el.querySelector('button')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      expect(selected).toEqual([null]);
    });

    it('as an overview (not interactive) shows only the active badge and ignores picks', async () => {
      await create();
      fixture.componentRef.setInput('interactive', false);
      fixture.detectChanges();
      expect(scene.setInteractive).toHaveBeenLastCalledWith(false);
      expect([...el.querySelectorAll<HTMLElement>('[data-badge]')].map((b) => b.dataset['nodeId'])).toEqual(['tsms']);
      const selected: (string | null)[] = [];
      fixture.componentInstance.nodeSelect.subscribe((id) => selected.push(id));
      options!.onPick('bots');
      expect(selected).toEqual([]);
    });

    it('sets camera presets', async () => {
      await create();
      el.querySelector<HTMLButtonElement>('[data-view="top"]')!.click();
      expect(scene.setView).toHaveBeenCalledWith('top');
    });

    it('falls back when the WebGL context is lost', async () => {
      await create();
      options!.onContextLost();
      expect(scene.dispose).toHaveBeenCalledOnce();
      expect(unavailable).toEqual(['context-lost']);
    });

    it('disposes the scene when destroyed', async () => {
      await create();
      fixture.destroy();
      expect(scene.dispose).toHaveBeenCalledOnce();
      expect(unavailable).toEqual([]);
    });
  });

  it('without WebGL emits unavailable and never loads three.js', async () => {
    await configure(false);
    await create();
    expect(loader).not.toHaveBeenCalled();
    expect(unavailable).toEqual(['webgl']);
  });

  it('emits unavailable when the scene fails to load', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    await configure(true, () => Promise.reject(new Error('chunk failed')));
    await create();
    expect(unavailable).toEqual(['init']);
  });

  it('reports no WebGL when the scene could not get a context', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    await configure(true, () =>
      Promise.resolve(() => {
        throw new CarSceneError();
      })
    );
    await create();
    expect(unavailable).toEqual(['webgl']);
  });
});
