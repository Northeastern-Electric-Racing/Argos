import { BreakpointObserver, BreakpointState } from '@angular/cdk/layout';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BehaviorSubject } from 'rxjs';
import Storage from 'src/services/storage.service';
import { SHUTDOWN_LOOP } from './shutdown-loop.model';
import { focusLoopNode } from './loop-view/loop-view.contract';
import { CarScene, CarSceneFactory } from './components/car-view-3d/car-scene.types';
import { CAR_SCENE_LOADER, WEBGL_SUPPORT } from './components/car-view-3d/car-view-3d.tokens';
import { CAR_VIEW_STORAGE_KEY } from './components/car-view-mode/car-view-mode.component';
import ShutdownPageComponent from './shutdown-page.component';
import { ShutdownSelectionStore } from './shutdown-selection.store';
import { SHUTDOWN_TOPICS, VCU_CRITICAL_FAULT_TOPICS } from './shutdown-page.topics';

describe('ShutdownPageComponent', () => {
  let fixture: ComponentFixture<ShutdownPageComponent>;
  let el: HTMLElement;
  let wide: BehaviorSubject<BreakpointState>;
  const stripItem = (id: string) => el.querySelector<HTMLElement>(`loop-strip [data-node-id="${id}"]`)!;
  const carMarker = (id: string) => el.querySelector<HTMLElement>(`car-view [role="option"][data-node-id="${id}"]`)!;
  const detailTitle = () => el.querySelector('loop-node-detail h2')?.textContent?.replace(/\s+/g, ' ').trim();
  const render = () => {
    fixture.detectChanges();
  };

  /** Every measured loop node reads 1 except from `openFrom` on, which read 0. */
  const publish = (openFrom?: string) => {
    const storage = TestBed.inject(Storage);
    const measured = SHUTDOWN_LOOP.filter((n) => n.topic);
    const start = openFrom ? measured.findIndex((n) => n.id === openFrom) : measured.length;
    const time = String(Date.now());
    measured.forEach((n, i) => {
      const v = i >= start ? '0' : '1';
      if (n.topic === SHUTDOWN_TOPICS.VCU.CAN_LATCH) {
        for (const t of VCU_CRITICAL_FAULT_TOPICS) storage.addValue(t, { values: [v === '1' ? '0' : '1'], time, unit: '' });
      } else storage.addValue(n.topic!, { values: [v], time, unit: '' });
    });
    render();
  };

  beforeEach(async () => {
    wide = new BehaviorSubject<BreakpointState>({ matches: true, breakpoints: {} });
    const breakpoints: Partial<BreakpointObserver> = { observe: () => wide.asObservable() };
    await TestBed.configureTestingModule({
      imports: [ShutdownPageComponent],
      providers: [{ provide: BreakpointObserver, useValue: breakpoints }]
    }).compileComponents();
    fixture = TestBed.createComponent(ShutdownPageComponent);
    render();
    el = fixture.nativeElement;
  });

  afterEach(() => fixture.destroy());

  it('has one h1, the page title', () => {
    const h1s = el.querySelectorAll('h1');
    expect(h1s.length).toBe(1);
    expect(h1s[0].textContent!.trim()).toBe('Shutdown Loop');
  });

  it('renders the header, banner, strip, details and car, in reading order', () => {
    const order = ['loop-meta', 'loop-banner', 'loop-strip', 'loop-node-detail', 'car-view'];
    const found = order.map((sel) => el.querySelector(sel));
    expect(found.every(Boolean)).toBe(true);
    for (let i = 1; i < found.length; i++) {
      expect(found[i - 1]!.compareDocumentPosition(found[i]!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    }
    expect(el.textContent).toContain('UNKNOWN — no data from VCU and BMS');
  });

  it('loads with nothing selected and the details on the break', () => {
    publish('tsms');
    const store = fixture.debugElement.injector.get(ShutdownSelectionStore);
    expect(store.selectedId()).toBeNull();
    expect(detailTitle()).toBe('12 TSMS');
    expect(el.querySelector('loop-strip [aria-selected="true"]')).toBeNull();
  });

  it('selects nothing when Tab goes into the strip and out again', () => {
    publish('tsms');
    const store = fixture.debugElement.injector.get(ShutdownSelectionStore);
    stripItem('glvms').focus();
    render();
    stripItem('glvms').blur();
    render();
    expect(store.selectedId()).toBeNull();
    expect(detailTitle()).toBe('12 TSMS');
  });

  it('highlights a loop node hovered in the strip on the car, and the reverse', () => {
    stripItem('tsms').dispatchEvent(new MouseEvent('mouseenter'));
    render();
    expect(carMarker('tsms').dataset['highlighted']).toBe('true');
    expect(detailTitle()).toBe('12 TSMS');
    stripItem('tsms').dispatchEvent(new MouseEvent('mouseleave'));
    carMarker('hvd').dispatchEvent(new MouseEvent('mouseenter'));
    render();
    expect(stripItem('hvd').dataset['highlighted']).toBe('true');
    expect(carMarker('tsms').dataset['highlighted']).toBe('false');
  });

  it('lets the keyboard win over a resting pointer: the details follow focus', () => {
    publish('tsms');
    stripItem('tsms').dispatchEvent(new MouseEvent('mouseenter'));
    render();
    expect(detailTitle()).toBe('12 TSMS');
    focusLoopNode(fixture, 'em-interlock', el.querySelector('loop-strip')!);
    render();
    expect(detailTitle()).toBe('14 Energy meter interlock');
    stripItem('em-interlock').dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    render();
    expect(detailTitle()).toBe('15 Accumulator sense');
    expect(carMarker('acc-sense').dataset['highlighted']).toBe('true');
    expect(carMarker('acc-sense').getAttribute('aria-selected')).toBe('false');
  });

  it('selects in every view on one click, with exactly one select call', () => {
    const store = fixture.debugElement.injector.get(ShutdownSelectionStore);
    const select = vi.spyOn(store, 'select');
    carMarker('bots').click();
    render();
    expect(select).toHaveBeenCalledTimes(1);
    expect(stripItem('bots').getAttribute('aria-selected')).toBe('true');
    expect(carMarker('bots').getAttribute('aria-selected')).toBe('true');
    expect(detailTitle()).toBe('9 BOTS');
  });

  it('unpins on a second click, on Escape, or with the details’ button, and goes back to the break', () => {
    publish('tsms');
    carMarker('bots').click();
    render();
    stripItem('bots').click();
    render();
    expect(stripItem('bots').getAttribute('aria-selected')).toBe('false');
    expect(carMarker('bots').getAttribute('aria-selected')).toBe('false');
    expect(detailTitle()).toBe('12 TSMS');

    stripItem('hvd').click();
    render();
    expect(detailTitle()).toBe('13 HVD');
    stripItem('hvd').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    render();
    expect(detailTitle()).toBe('12 TSMS');

    carMarker('hvd').click();
    render();
    el.querySelector<HTMLButtonElement>('loop-node-detail button[data-unpin]')!.click();
    render();
    expect(detailTitle()).toBe('12 TSMS');
    expect(el.querySelector('[aria-selected="true"]')).toBeNull();
  });

  it('pins the culprit from the banner in the strip, the car and the details', () => {
    publish('bms-latch');
    el.querySelector<HTMLButtonElement>('loop-banner button[data-node-id="side-brb-l"]')!.click();
    render();
    expect(stripItem('side-brb-l').getAttribute('aria-selected')).toBe('true');
    expect(carMarker('side-brb-l').getAttribute('aria-selected')).toBe('true');
    expect(detailTitle()).toBe('3 Side BRB L');
  });

  it('makes the car an overview below sm, leaving the strip as the control', () => {
    wide.next({ matches: false, breakpoints: {} });
    render();
    expect(el.querySelector('car-view [role="option"]')).toBeNull();
    expect(el.querySelector('car-view [role="img"]')).toBeTruthy();
    expect(stripItem('tsms').getAttribute('role')).toBe('option');
  });
});

describe('ShutdownPageComponent car view mode', () => {
  let fixture: ComponentFixture<ShutdownPageComponent>;
  let el: HTMLElement;
  const scene: CarScene = {
    setStatuses: vi.fn(),
    setHighlight: vi.fn(),
    focus: vi.fn(),
    setView: vi.fn(),
    setInteractive: vi.fn(),
    dispose: vi.fn()
  };
  const button = (label: string) =>
    [...el.querySelectorAll<HTMLButtonElement>('car-view-mode button')].find((b) => b.textContent!.trim() === label)!;
  const stripItem = (id: string) => el.querySelector<HTMLElement>(`loop-strip [data-node-id="${id}"]`)!;

  const create = async (webgl: boolean) => {
    localStorage.setItem(CAR_VIEW_STORAGE_KEY, '3d');
    const factory: CarSceneFactory = () => scene;
    await TestBed.configureTestingModule({
      imports: [ShutdownPageComponent],
      providers: [
        {
          provide: BreakpointObserver,
          useValue: { observe: () => new BehaviorSubject({ matches: true, breakpoints: {} }) }
        },
        { provide: WEBGL_SUPPORT, useValue: () => webgl },
        { provide: CAR_SCENE_LOADER, useValue: () => Promise.resolve(factory) }
      ]
    }).compileComponents();
    fixture = TestBed.createComponent(ShutdownPageComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    el = fixture.nativeElement;
  };

  afterEach(() => {
    fixture.destroy();
    localStorage.removeItem(CAR_VIEW_STORAGE_KEY);
  });

  it('starts in the stored 3D view and keeps the selection across a 2D / 3D round trip', async () => {
    await create(true);
    expect(el.querySelector('car-view-3d')).toBeTruthy();
    stripItem('bots').click();
    fixture.detectChanges();
    button('2D').click();
    fixture.detectChanges();
    expect(el.querySelector('car-view [data-node-id="bots"]')!.getAttribute('aria-selected')).toBe('true');
    button('3D').click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(scene.focus).toHaveBeenLastCalledWith('bots');
  });

  it('falls back to the 2D car with a notice when 3D is unavailable, without remembering 2D', async () => {
    await create(false);
    expect(el.querySelector('car-view-3d')).toBeNull();
    expect(el.querySelector('car-view')).toBeTruthy();
    expect(el.querySelector('car-view-mode [role="status"]')!.textContent).toContain('no WebGL');
    expect(button('3D').getAttribute('aria-pressed')).toBe('false');
    expect(localStorage.getItem(CAR_VIEW_STORAGE_KEY)).toBe('3d');
  });
});
