import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SHUTDOWN_LOOP } from '../../shutdown-loop.model';
import { NodeStatus } from '../../shutdown-loop.utils';
import { CarScene, CarSceneModule, CarSceneOptions } from './car-scene.types';
import { CAR_SCENE_LOADER, CarView3dComponent, WEBGL_SUPPORT } from './car-view-3d.component';
import { CarSceneError, FALLBACK_NOTICES } from './car-view-3d.utils';

const TSMS = SHUTDOWN_LOOP.findIndex((n) => n.id === 'tsms');
const NODES: NodeStatus[] = SHUTDOWN_LOOP.map((node, i) => ({
  node,
  state: i < TSMS ? 'closed' : i === TSMS ? 'suspect' : 'downstream-open',
  value: node.topic ? (i < TSMS ? 1 : 0) : undefined,
  ageMs: node.topic ? 3000 : undefined,
  mismatch: false
}));

function fakeScene() {
  return {
    positionSources: new Map(SHUTDOWN_LOOP.map((n) => [n.id, n.id === 'tsms' ? 'model' : 'table'] as const)),
    setStatuses: vi.fn(),
    setMaterialMode: vi.fn(),
    setView: vi.fn(),
    setSelected: vi.fn(),
    pick: vi.fn(() => 'hvd'),
    dispose: vi.fn()
  } satisfies CarScene;
}

describe('CarView3dComponent', () => {
  let fixture: ComponentFixture<CarView3dComponent>;
  let el: HTMLElement;

  async function setup(opts: { webgl?: boolean; module?: () => Promise<CarSceneModule> }): Promise<void> {
    TestBed.configureTestingModule({
      imports: [CarView3dComponent],
      providers: [
        { provide: WEBGL_SUPPORT, useValue: () => opts.webgl ?? true },
        { provide: CAR_SCENE_LOADER, useValue: opts.module ?? (() => new Promise(() => undefined)) }
      ]
    });
    fixture = TestBed.createComponent(CarView3dComponent);
    fixture.componentRef.setInput('nodes', NODES);
    el = fixture.nativeElement;
    fixture.detectChanges();
    await fixture.whenStable();
    // Let the async start (loader + createCarScene promises) settle, then render.
    for (let i = 0; i < 5; i++) await Promise.resolve();
    fixture.detectChanges();
    await fixture.whenStable();
  }

  afterEach(() => fixture?.destroy());

  it('shows a loading state while the model loads', async () => {
    await setup({});
    expect(el.textContent).toContain('Loading car model');
    expect(el.querySelector('canvas')).toBeTruthy();
    expect(el.querySelector('car-view')).toBeNull();
  });

  it('falls back to the 2D view with a notice when WebGL is unavailable', async () => {
    const module = vi.fn();
    await setup({ webgl: false, module });
    expect(el.querySelector('car-view')).toBeTruthy();
    expect(el.querySelector('canvas')).toBeNull();
    expect(el.textContent).toContain(FALLBACK_NOTICES.webgl);
    expect(module).not.toHaveBeenCalled();
  });

  it('falls back to 2D when three fails to load', async () => {
    await setup({ module: () => Promise.reject(new Error('chunk load failed')) });
    expect(el.querySelector('car-view')).toBeTruthy();
    expect(el.textContent).toContain(FALLBACK_NOTICES.init);
  });

  it('falls back to 2D when the model is missing or corrupt', async () => {
    const createCarScene = vi.fn(() => Promise.reject(new CarSceneError('model')));
    await setup({ module: () => Promise.resolve({ createCarScene }) });
    expect(el.querySelector('car-view')).toBeTruthy();
    expect(el.textContent).toContain(FALLBACK_NOTICES.model);
  });

  describe('once the scene is ready', () => {
    let scene: ReturnType<typeof fakeScene>;
    let options: CarSceneOptions;

    beforeEach(async () => {
      scene = fakeScene();
      const createCarScene = vi.fn((o: CarSceneOptions) => {
        options = o;
        return Promise.resolve(scene);
      });
      await setup({ module: () => Promise.resolve({ createCarScene }) });
    });

    const badge = (id: string) => el.querySelector<HTMLButtonElement>(`button[data-node-id="${id}"]`)!;

    it('loads the model from assets with the Draco decoder served locally', () => {
      expect(options.modelUrl).toBe('assets/models/car.glb');
      expect(options.dracoDecoderPath).toBe('assets/draco/');
      expect(options.materialMode).toBe('ghost');
      expect(options.view).toBe('iso');
    });

    it('pushes node statuses into the scene', () => {
      expect(scene.setStatuses).toHaveBeenCalledWith(NODES, expect.objectContaining({ suspect: expect.any(String) }));
      expect(el.textContent).not.toContain('Loading car model');
    });

    it('renders a numbered, labelled button per node', () => {
      expect(el.querySelectorAll('button[data-node-id]').length).toBe(SHUTDOWN_LOOP.length);
      expect(badge('tsms').textContent!.trim()).toBe(String(TSMS + 1));
      expect(badge('tsms').getAttribute('aria-label')).toBe(`${TSMS + 1}. TSMS: Open — cause`);
      expect(badge('glvms').getAttribute('aria-label')).toContain('(no sensor)');
    });

    it('positions buttons from the scene’s projected points', () => {
      options.onFrame([
        { id: 'tsms', x: 120, y: 80, visible: true },
        { id: 'hvd', x: 0, y: 0, visible: false }
      ]);
      expect(badge('tsms').style.transform).toBe('translate(120px, 80px)');
      expect(badge('tsms').style.visibility).toBe('visible');
      expect(badge('hvd').style.visibility).toBe('hidden');
    });

    it('shows label, topic, value and age for the selected node', async () => {
      badge('tsms').click();
      fixture.detectChanges();
      await fixture.whenStable();
      const detail = el.querySelector('.detail')!.textContent!;
      expect(detail).toContain('TSMS');
      expect(detail).toContain('VCU/Shutdown/TSMS_GPIO');
      expect(detail).toContain('0 (open)');
      expect(detail).toContain('3 s ago');
      expect(detail).toContain('from the model');
      expect(badge('tsms').getAttribute('aria-pressed')).toBe('true');
      expect(scene.setSelected).toHaveBeenLastCalledWith('tsms');
    });

    it('selects the node nearest a click on the canvas, and clears with Escape', async () => {
      const canvas = el.querySelector('canvas')!;
      canvas.dispatchEvent(new PointerEvent('pointerdown', { clientX: 10, clientY: 10 }));
      canvas.dispatchEvent(new MouseEvent('click', { clientX: 11, clientY: 10 }));
      fixture.detectChanges();
      await fixture.whenStable();
      expect(scene.pick).toHaveBeenCalledWith(11, 10);
      expect(el.querySelector('.detail')!.textContent).toContain('HVD');

      el.querySelector('.stage')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      fixture.detectChanges();
      await fixture.whenStable();
      expect(scene.setSelected).toHaveBeenLastCalledWith(null);
    });

    it('ignores a click that ends a drag (orbit)', () => {
      const canvas = el.querySelector('canvas')!;
      canvas.dispatchEvent(new PointerEvent('pointerdown', { clientX: 10, clientY: 10 }));
      canvas.dispatchEvent(new MouseEvent('click', { clientX: 60, clientY: 40 }));
      expect(scene.pick).not.toHaveBeenCalled();
    });

    it('switches view presets and model colours', async () => {
      const button = (label: string) =>
        [...el.querySelectorAll<HTMLButtonElement>('.toolbar button')].find((b) => b.textContent!.trim() === label)!;
      button('Top').click();
      expect(scene.setView).toHaveBeenCalledWith('top');
      button('Theme').click();
      fixture.detectChanges();
      await fixture.whenStable();
      expect(scene.setMaterialMode).toHaveBeenLastCalledWith('theme');
      expect(button('Theme').getAttribute('aria-pressed')).toBe('true');
    });

    it('disposes the scene on destroy', () => {
      fixture.destroy();
      expect(scene.dispose).toHaveBeenCalled();
    });
  });
});
