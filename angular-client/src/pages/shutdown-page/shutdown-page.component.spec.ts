import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CarScene, CarSceneFactory } from './components/car-view-3d/car-scene.types';
import { CAR_SCENE_LOADER, WEBGL_SUPPORT } from './components/car-view-3d/car-view-3d.tokens';
import { CAR_VIEW_STORAGE_KEY } from './components/car-view-mode/car-view-mode.component';
import ShutdownPageComponent from './shutdown-page.component';

describe('ShutdownPageComponent', () => {
  let fixture: ComponentFixture<ShutdownPageComponent>;
  let el: HTMLElement;
  const stripItem = (id: string) => el.querySelector<HTMLElement>(`loop-strip [data-node-id="${id}"]`)!;
  const carMarker = (id: string) => el.querySelector<HTMLElement>(`car-view [role="option"][data-node-id="${id}"]`)!;
  const detailTitle = () => el.querySelector('loop-node-detail h2')?.textContent?.replace(/\s+/g, ' ').trim();

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [ShutdownPageComponent] }).compileComponents();
    fixture = TestBed.createComponent(ShutdownPageComponent);
    fixture.detectChanges();
    el = fixture.nativeElement;
  });

  afterEach(() => fixture.destroy());

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('renders the header, banner, car view, strip and details', () => {
    for (const sel of ['loop-meta', 'loop-banner', 'car-view', 'loop-strip', 'loop-node-detail']) {
      expect(el.querySelector(sel)).toBeTruthy();
    }
    expect(el.textContent).toContain('UNKNOWN — no data from VCU and BMS');
  });

  it('highlights a node hovered in the strip on the car, and the reverse', () => {
    stripItem('tsms').dispatchEvent(new MouseEvent('mouseenter'));
    fixture.detectChanges();
    expect(carMarker('tsms').dataset['highlighted']).toBe('true');
    expect(detailTitle()).toBe('12 TSMS');
    stripItem('tsms').dispatchEvent(new MouseEvent('mouseleave'));
    carMarker('hvd').dispatchEvent(new MouseEvent('mouseenter'));
    fixture.detectChanges();
    expect(stripItem('hvd').dataset['highlighted']).toBe('true');
    expect(carMarker('tsms').dataset['highlighted']).toBe('false');
  });

  it('selects in both views when a car marker is clicked', () => {
    carMarker('bots').click();
    fixture.detectChanges();
    expect(stripItem('bots').getAttribute('aria-selected')).toBe('true');
    expect(carMarker('bots').getAttribute('aria-selected')).toBe('true');
    expect(detailTitle()).toBe('9 BOTS');
  });

  it('previews the loop node the keyboard moves to in the strip, on the car and in the details, without pinning it', () => {
    stripItem('glvms').focus();
    stripItem('glvms').dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    fixture.detectChanges();
    expect(document.activeElement).toBe(stripItem('side-brb-r'));
    expect(carMarker('side-brb-r').dataset['highlighted']).toBe('true');
    expect(carMarker('side-brb-r').getAttribute('aria-selected')).toBe('false');
    expect(detailTitle()).toBe('2 Side BRB R');
  });

  it('unpins a loop node clicked a second time', () => {
    carMarker('bots').click();
    fixture.detectChanges();
    stripItem('bots').click();
    fixture.detectChanges();
    expect(stripItem('bots').getAttribute('aria-selected')).toBe('false');
    expect(carMarker('bots').getAttribute('aria-selected')).toBe('false');
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
