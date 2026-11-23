import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { Mock } from 'vitest';
import { SHUTDOWN_LOOP } from '../../shutdown-loop.model';
import { NodeStatus } from '../../shutdown-loop.utils';
import { CarView3dComponent } from './car-view-3d.component';
import { CarScene, CarSceneFactory, CarSceneOptions } from './car-view-3d.model';
import { CAR_SCENE_LOADER, WEBGL_SUPPORT } from './car-view-3d.tokens';

const TSMS = SHUTDOWN_LOOP.findIndex((n) => n.id === 'tsms');
const NODES: NodeStatus[] = SHUTDOWN_LOOP.map((node, i) => ({
  node,
  state: i < TSMS ? 'closed' : i === TSMS ? 'suspect' : 'downstream-open',
  value: node.topic ? (i < TSMS ? 1 : 0) : undefined,
  ageMs: node.topic ? 3000 : undefined,
  mismatch: false
}));

type FakeScene = { [K in keyof CarScene]: Mock<CarScene[K]> };

describe('CarView3dComponent', () => {
  let fixture: ComponentFixture<CarView3dComponent>;
  let el: HTMLElement;
  let scene: FakeScene;
  let options: CarSceneOptions | undefined;
  let loader: Mock<() => Promise<CarSceneFactory>>;

  const setup = async (webgl: boolean, load?: () => Promise<CarSceneFactory>) => {
    scene = {
      update: vi.fn<CarScene['update']>(),
      setSelected: vi.fn<CarScene['setSelected']>(),
      setView: vi.fn<CarScene['setView']>(),
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
    fixture = TestBed.createComponent(CarView3dComponent);
    fixture.componentRef.setInput('nodes', NODES);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    el = fixture.nativeElement;
  };
  const nodeButton = (order: number) => el.querySelectorAll<HTMLButtonElement>('[data-node-button]')[order - 1];
  const info = () => el.querySelector('[data-node-info]');

  describe('without WebGL', () => {
    beforeEach(() => setup(false));

    it('falls back to the 2D car view and never loads three.js', () => {
      expect(el.querySelector('car-view')).toBeTruthy();
      expect(el.querySelector('canvas')).toBeNull();
      expect(loader).not.toHaveBeenCalled();
      expect(el.textContent).toContain('3D view unavailable');
    });
  });

  describe('when the scene fails to load', () => {
    beforeEach(() => {
      vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      return setup(true, () => Promise.reject(new Error('chunk failed')));
    });

    it('falls back to the 2D car view', () => {
      expect(el.querySelector('car-view')).toBeTruthy();
      expect(el.querySelector('canvas')).toBeNull();
    });
  });

  describe('with WebGL', () => {
    beforeEach(() => setup(true));
    afterEach(() => fixture.destroy());

    it('builds the scene on its canvas and hands it the nodes', () => {
      expect(el.querySelector('car-view')).toBeNull();
      expect(options!.canvas).toBe(el.querySelector('canvas'));
      expect(scene.update).toHaveBeenLastCalledWith(NODES);
    });

    it('passes new statuses to the scene', () => {
      const next = NODES.map((n) => ({ ...n, state: 'closed' as const }));
      fixture.componentRef.setInput('nodes', next);
      fixture.detectChanges();
      expect(scene.update).toHaveBeenLastCalledWith(next);
    });

    it('moves the camera to a preset', () => {
      el.querySelector<HTMLButtonElement>('[data-view="top"]')!.click();
      expect(scene.setView).toHaveBeenCalledWith('top');
    });

    it('labels each node button with its order, name and state', () => {
      expect(el.querySelectorAll('[data-node-button]').length).toBe(SHUTDOWN_LOOP.length);
      expect(nodeButton(TSMS + 1).getAttribute('aria-label')).toBe(`${TSMS + 1} TSMS: Open — cause`);
    });

    it('shows a node’s label, topic, value and age when its button is pressed', () => {
      expect(info()).toBeNull();
      nodeButton(TSMS + 1).click();
      fixture.detectChanges();
      expect(scene.setSelected).toHaveBeenLastCalledWith('tsms');
      expect(nodeButton(TSMS + 1).getAttribute('aria-pressed')).toBe('true');
      const text = info()!.textContent!;
      expect(text).toContain('TSMS');
      expect(text).toContain('Open — cause');
      expect(text).toContain('VCU/Shutdown/TSMS_GPIO');
      expect(text).toContain('3 s ago');
    });

    it('selects the node the scene reports as clicked, and clears on empty space', () => {
      options!.onPick('glvms');
      fixture.detectChanges();
      expect(info()!.textContent).toContain('GLV master switch');
      expect(info()!.textContent).toContain('no sensor');
      options!.onPick(null);
      fixture.detectChanges();
      expect(info()).toBeNull();
    });

    it('steps through nodes with the arrow keys and clears with Escape', () => {
      const key = (target: HTMLElement, k: string) => {
        target.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true }));
        fixture.detectChanges();
      };
      nodeButton(1).click();
      fixture.detectChanges();
      key(nodeButton(1), 'ArrowRight');
      expect(info()!.textContent).toContain('Side BRB R');
      expect(document.activeElement).toBe(nodeButton(2));
      key(nodeButton(2), 'End');
      expect(info()!.textContent).toContain('AIRs');
      key(nodeButton(SHUTDOWN_LOOP.length), 'Escape');
      expect(info()).toBeNull();
    });

    it('falls back to 2D if the WebGL context is lost', () => {
      options!.onContextLost();
      fixture.detectChanges();
      expect(scene.dispose).toHaveBeenCalled();
      expect(el.querySelector('car-view')).toBeTruthy();
    });

    it('disposes the scene when destroyed', () => {
      fixture.destroy();
      expect(scene.dispose).toHaveBeenCalled();
    });
  });
});
