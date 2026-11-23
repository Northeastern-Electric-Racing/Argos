import { ComponentFixture, TestBed } from '@angular/core/testing';
import { expectLoopViewContract, LOOP_VIEW_CONTRACT_NODES } from '../../loop-view/loop-view.contract';
import { loopOf, loopSummary } from '../../shutdown-loop.display';
import { SHUTDOWN_LOOP } from '../../shutdown-loop.model';
import { CarModelResult, CarScene, CarSceneModule, CarSceneOptions } from './car-scene.types';
import { CarView3dComponent } from './car-view-3d.component';
import { CAR_MODEL_URL, CAR_SCENE_LOADER, WEBGL_SUPPORT } from './car-view-3d.tokens';
import { ABSENT_MODEL_NOTICE, CarSceneError, FallbackReason, MATERIAL_MODE_KEY } from './car-view-3d.utils';

const NODES = LOOP_VIEW_CONTRACT_NODES;
const TSMS = SHUTDOWN_LOOP.findIndex((n) => n.id === 'tsms');

function fakeScene(load: () => Promise<CarModelResult> = () => new Promise(() => undefined)) {
  return {
    loadModel: vi.fn<(url: string | null, progress?: (f: number | null) => void) => Promise<CarModelResult>>(() => load()),
    setStatuses: vi.fn(() => 1),
    setMaterialMode: vi.fn(),
    setView: vi.fn(),
    setHighlight: vi.fn(),
    pick: vi.fn((): string | null => 'hvd'),
    dispose: vi.fn()
  } satisfies CarScene;
}

async function settle(fixture: ComponentFixture<unknown>) {
  fixture.detectChanges();
  await fixture.whenStable();
  for (let i = 0; i < 10; i++) await Promise.resolve();
  fixture.detectChanges();
  await fixture.whenStable();
}

describe('CarView3dComponent', () => {
  let fixture: ComponentFixture<CarView3dComponent>;
  let el: HTMLElement;
  let scene: ReturnType<typeof fakeScene>;
  let options: CarSceneOptions;
  let unavailable: FallbackReason[];

  function configure(opts: { webgl?: boolean; module?: () => Promise<CarSceneModule>; modelUrl?: string | null } = {}) {
    TestBed.configureTestingModule({
      imports: [CarView3dComponent],
      providers: [
        { provide: WEBGL_SUPPORT, useValue: () => opts.webgl ?? true },
        {
          provide: CAR_SCENE_LOADER,
          useValue:
            opts.module ??
            (() =>
              Promise.resolve({
                createCarScene: (o: CarSceneOptions) => {
                  options = o;
                  return Promise.resolve(scene);
                }
              }))
        },
        ...(opts.modelUrl !== undefined ? [{ provide: CAR_MODEL_URL, useValue: opts.modelUrl }] : [])
      ]
    });
  }

  async function create(): Promise<void> {
    fixture = TestBed.createComponent(CarView3dComponent);
    fixture.componentRef.setInput('nodes', NODES);
    unavailable = [];
    fixture.componentInstance.unavailable.subscribe((r) => unavailable.push(r));
    el = fixture.nativeElement;
    await settle(fixture);
  }

  const badge = (id: string) => el.querySelector<HTMLElement>(`[data-node-id="${id}"]:not(line)`)!;
  const leader = (id: string) => el.querySelector<SVGLineElement>(`line[data-node-id="${id}"]`)!;
  const button = (label: string) =>
    [...el.querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent!.trim() === label)!;

  beforeEach(() => {
    scene = fakeScene();
    localStorage.removeItem(MATERIAL_MODE_KEY);
  });
  afterEach(() => {
    fixture?.destroy();
    localStorage.removeItem(MATERIAL_MODE_KEY);
  });

  describe('as a LoopView', () => {
    beforeEach(() => configure());
    expectLoopViewContract(() => (fixture = TestBed.createComponent(CarView3dComponent)), {
      options: false,
      click: (f, id) => (f.nativeElement as HTMLElement).querySelector<HTMLElement>(`div[data-node-id="${id}"]`)!.click(),
      hover: (f, id) =>
        (f.nativeElement as HTMLElement)
          .querySelector<HTMLElement>(`div[data-node-id="${id}"]`)!
          .dispatchEvent(new MouseEvent('mouseenter')),
      leave: (f, id) =>
        (f.nativeElement as HTMLElement)
          .querySelector<HTMLElement>(`div[data-node-id="${id}"]`)!
          .dispatchEvent(new MouseEvent('mouseleave')),
      highlighted: (f, id) =>
        (f.nativeElement as HTMLElement).querySelector<HTMLElement>(`div[data-node-id="${id}"]`)!.dataset['highlighted'] ===
        'true'
    });
  });

  describe('falling back', () => {
    it('reports no WebGL without loading three', async () => {
      const module = vi.fn();
      configure({ webgl: false, module });
      await create();
      expect(unavailable).toEqual(['webgl']);
      expect(module).not.toHaveBeenCalled();
    });

    it('reports init when three fails to load', async () => {
      configure({ module: () => Promise.reject(new Error('chunk load failed')) });
      await create();
      expect(unavailable).toEqual(['init']);
    });

    it('reports the scene’s own reason when it can’t be built', async () => {
      configure({ module: () => Promise.resolve({ createCarScene: () => Promise.reject(new CarSceneError('init')) }) });
      await create();
      expect(unavailable).toEqual(['init']);
    });

    it('reports a broken model and disposes the scene', async () => {
      scene = fakeScene(() => Promise.reject(new CarSceneError('model')));
      configure();
      await create();
      expect(unavailable).toEqual(['model']);
      expect(scene.dispose).toHaveBeenCalled();
    });

    it('reports a lost graphics context once and disposes the scene', async () => {
      configure();
      await create();
      options.onContextLost();
      options.onContextLost();
      expect(unavailable).toEqual(['context']);
      expect(scene.dispose).toHaveBeenCalledTimes(1);
    });

    it('disposes a scene that finishes building after the view is gone', async () => {
      let resolve!: (s: CarScene) => void;
      configure({ module: () => Promise.resolve({ createCarScene: () => new Promise<CarScene>((r) => (resolve = r)) }) });
      await create();
      fixture.destroy();
      resolve(scene);
      await Promise.resolve();
      await Promise.resolve();
      expect(scene.dispose).toHaveBeenCalled();
      expect(unavailable).toEqual([]);
    });
  });

  describe('loading the model', () => {
    it('loads the configured model and shows progress while it loads', async () => {
      configure({ modelUrl: 'assets/models/test.glb' });
      await create();
      expect(scene.loadModel).toHaveBeenCalledWith('assets/models/test.glb', expect.any(Function));
      expect(el.textContent).toContain('Loading car model…');
      scene.loadModel.mock.calls[0][1]!(0.42);
      fixture.detectChanges();
      expect(el.textContent).toContain('Loading car model… 42 %');
      expect(button('Solid').disabled).toBe(true);
    });

    it('draws the wiring alone, with a notice and no model colours, when there is no model', async () => {
      scene = fakeScene(() => Promise.resolve({ kind: 'absent', reason: 'HTTP 404' }));
      configure();
      await create();
      expect(el.textContent).toContain(ABSENT_MODEL_NOTICE);
      expect(button('Solid')).toBeUndefined();
      expect(unavailable).toEqual([]);
    });

    it('logs the load summary once the model is in', async () => {
      const info = vi.spyOn(console, 'info').mockImplementation(() => undefined);
      scene = fakeScene(() => Promise.resolve({ kind: 'loaded', summary: 'car.glb: 3/19 loop nodes', warnings: [] }));
      configure();
      await create();
      expect(info).toHaveBeenCalledWith(expect.stringContaining('car.glb: 3/19 loop nodes'));
      expect(el.textContent).not.toContain('Loading car model');
      expect(button('Solid').disabled).toBe(false);
      info.mockRestore();
    });
  });

  describe('once the scene is ready', () => {
    beforeEach(async () => {
      scene = fakeScene(() => Promise.resolve({ kind: 'loaded', summary: '', warnings: [] }));
      vi.spyOn(console, 'info').mockImplementation(() => undefined);
      document.documentElement.style.setProperty('--color-danger', '#fb923d');
      document.documentElement.style.setProperty('--color-fg', '#eeeeef');
      configure();
      await create();
    });
    afterEach(() => {
      vi.restoreAllMocks();
      document.documentElement.style.removeProperty('--color-danger');
      document.documentElement.style.removeProperty('--color-fg');
    });

    it('passes theme colours, read from the tokens, to the scene', () => {
      expect(Object.keys(options.colours.states).sort()).toEqual(['closed', 'downstream-open', 'no-data', 'suspect']);
      expect(options.colours.states.suspect).toBe('#fb923d');
      expect(options.colours.scene.highlight).toBe('#eeeeef');
    });

    it('sends the scene a status only when something it draws changes', async () => {
      expect(scene.setStatuses).toHaveBeenCalledTimes(1);
      const first = scene.setStatuses.mock.calls[0] as unknown as [{ segments: string[] }];
      expect(first[0].segments[TSMS]).toBe('downstream-open');
      fixture.componentRef.setInput(
        'nodes',
        NODES.map((s) => ({ ...s, ageMs: (s.ageMs ?? 0) + 1000 }))
      );
      await settle(fixture);
      expect(scene.setStatuses).toHaveBeenCalledTimes(1);
      fixture.componentRef.setInput(
        'nodes',
        NODES.map((s, i) => (i === TSMS + 2 ? { ...s, mismatch: true } : s))
      );
      await settle(fixture);
      expect(scene.setStatuses).toHaveBeenCalledTimes(2);
    });

    it('highlights previewId ?? selectedId in the scene', async () => {
      fixture.componentRef.setInput('selectedId', 'bots');
      await settle(fixture);
      expect(scene.setHighlight).toHaveBeenLastCalledWith('bots');
      fixture.componentRef.setInput('previewId', 'hvd');
      await settle(fixture);
      expect(scene.setHighlight).toHaveBeenLastCalledWith('hvd');
    });

    it('labels the canvas as an image with the loop summary and keeps badges out of the tab order', () => {
      const img = el.querySelector('[role="img"]')!;
      expect(img.getAttribute('aria-label')).toContain(loopSummary(loopOf(NODES)));
      expect(img.getAttribute('aria-label')).toContain('loop nodes');
      expect(badge('tsms').closest('[aria-hidden="true"]')).toBeTruthy();
      expect(el.querySelectorAll('[data-node-id][tabindex], [aria-live]').length).toBe(0);
    });

    it('toggles the loop node nearest a canvas click, and clears on an empty canvas', () => {
      const selected: (string | null)[] = [];
      fixture.componentInstance.nodeSelect.subscribe((id) => selected.push(id));
      const canvas = el.querySelector('canvas')!;
      const click = (x: number, y: number) => {
        canvas.dispatchEvent(new PointerEvent('pointerdown', { clientX: x, clientY: y, button: 0, isPrimary: true }));
        canvas.dispatchEvent(new MouseEvent('click', { clientX: x, clientY: y }));
      };
      click(10, 10);
      scene.pick.mockReturnValue(null);
      click(10, 10);
      expect(scene.pick).toHaveBeenCalledWith(10, 10);
      expect(selected).toEqual(['hvd', null]);
    });

    it('ignores a click that ends an orbit drag, and right clicks', () => {
      const canvas = el.querySelector('canvas')!;
      canvas.dispatchEvent(new PointerEvent('pointerdown', { clientX: 10, clientY: 10, button: 0, isPrimary: true }));
      canvas.dispatchEvent(new MouseEvent('click', { clientX: 60, clientY: 40 }));
      canvas.dispatchEvent(new PointerEvent('pointerdown', { clientX: 10, clientY: 10, button: 2, isPrimary: true }));
      canvas.dispatchEvent(new MouseEvent('click', { clientX: 10, clientY: 10 }));
      expect(scene.pick).not.toHaveBeenCalled();
    });

    it('previews the loop node under the mouse, and clears when it leaves the canvas', () => {
      const previewed: (string | null)[] = [];
      fixture.componentInstance.nodePreview.subscribe((id) => previewed.push(id));
      const canvas = el.querySelector('canvas')!;
      canvas.dispatchEvent(new PointerEvent('pointermove', { clientX: 5, clientY: 5, pointerType: 'mouse' }));
      canvas.dispatchEvent(new PointerEvent('pointermove', { clientX: 6, clientY: 5, pointerType: 'mouse' }));
      canvas.dispatchEvent(new PointerEvent('pointerleave'));
      expect(previewed).toEqual(['hvd', null]);
    });

    it('clears the pin with Escape', () => {
      const selected: (string | null)[] = [];
      fixture.componentInstance.nodeSelect.subscribe((id) => selected.push(id));
      el.querySelector('button')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      expect(selected).toEqual([null]);
    });

    it('places badges from the projected points, with a leader once one is pushed away', () => {
      const cluster = ['bms-latch', 'imd-latch', 'bspd-latch', 'can-latch', 'mc-hvil'];
      options.onFrame([
        { id: 'tsms', x: 120, y: 80, z: 0, visible: true },
        { id: 'hvd', x: 0, y: 0, z: 0, visible: false },
        ...cluster.map((id, i) => ({ id, x: 300 + i * 2, y: 200, z: 0, visible: true }))
      ]);
      expect(badge('tsms').style.transform).toMatch(/^translate\(\d+px, -?\d+px\)$/);
      expect(badge('tsms').style.visibility).toBe('visible');
      expect(badge('hvd').style.visibility).toBe('hidden');
      expect(leader('tsms').style.visibility).toBe('hidden');
      expect(cluster.filter((id) => leader(id).style.visibility === 'visible').length).toBeGreaterThan(0);
    });

    it('names the suspect on its badge and marks a mismatch with a pip', async () => {
      expect(badge('tsms').textContent).toContain('TSMS');
      expect(badge('hvd').textContent).not.toContain('HVD');
      fixture.componentRef.setInput(
        'nodes',
        NODES.map((s, i) => (i === TSMS + 2 ? { ...s, mismatch: true } : s))
      );
      await settle(fixture);
      expect(badge(SHUTDOWN_LOOP[TSMS + 2].id).textContent).toContain('!');
    });

    it('shows only the active badge and ignores picks when not interactive', async () => {
      const selected: (string | null)[] = [];
      fixture.componentInstance.nodeSelect.subscribe((id) => selected.push(id));
      fixture.componentRef.setInput('interactive', false);
      fixture.componentRef.setInput('selectedId', 'tsms');
      await settle(fixture);
      expect(badge('tsms').classList).not.toContain('hidden');
      expect(badge('hvd').classList).toContain('hidden');
      badge('hvd').click();
      const canvas = el.querySelector('canvas')!;
      canvas.dispatchEvent(new PointerEvent('pointerdown', { clientX: 1, clientY: 1, button: 0, isPrimary: true }));
      canvas.dispatchEvent(new MouseEvent('click', { clientX: 1, clientY: 1 }));
      expect(selected).toEqual([]);
    });

    it('moves the camera to a preset and remembers the model colours', async () => {
      button('Top').click();
      expect(scene.setView).toHaveBeenCalledWith('top');
      button('Solid').click();
      await settle(fixture);
      expect(scene.setMaterialMode).toHaveBeenLastCalledWith('solid');
      expect(button('Solid').getAttribute('aria-pressed')).toBe('true');
      expect(localStorage.getItem(MATERIAL_MODE_KEY)).toBe('solid');
    });

    it('disposes the scene on destroy', () => {
      fixture.destroy();
      expect(scene.dispose).toHaveBeenCalled();
    });
  });
});
