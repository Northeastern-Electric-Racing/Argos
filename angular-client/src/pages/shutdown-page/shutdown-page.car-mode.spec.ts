import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CAR_SCENE_LOADER, WEBGL_SUPPORT } from './components/car-view-3d/car-view-3d.tokens';
import { FALLBACK_NOTICES } from './components/car-view-3d/car-view-3d.utils';
import { CAR_VIEW_MODE_KEY } from './components/car-view-mode/car-view-mode.component';
import ShutdownPageComponent from './shutdown-page.component';

// The page's 2D/3D switch (car-view-mode) and the 2D fallback it owns when the 3D view is unavailable.
describe('ShutdownPageComponent car view mode', () => {
  let fixture: ComponentFixture<ShutdownPageComponent>;
  let el: HTMLElement;
  const modeButton = (label: string) =>
    [...el.querySelectorAll<HTMLButtonElement>('car-view-mode button')].find((b) => b.textContent!.trim() === label)!;
  const stripItem = (id: string) => el.querySelector<HTMLElement>(`loop-strip [data-node-id="${id}"]`)!;
  const carMarker = (id: string) => el.querySelector<HTMLElement>(`car-view [role="option"][data-node-id="${id}"]`)!;

  let webgl = true;
  const notice = () => el.querySelector('section[aria-labelledby="car-view-title"] [role="status"]');

  async function create(supported: boolean) {
    webgl = supported;
    TestBed.configureTestingModule({
      imports: [ShutdownPageComponent],
      providers: [
        { provide: WEBGL_SUPPORT, useValue: () => webgl },
        { provide: CAR_SCENE_LOADER, useValue: () => new Promise(() => undefined) }
      ]
    });
    fixture = TestBed.createComponent(ShutdownPageComponent);
    el = fixture.nativeElement;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  beforeEach(() => localStorage.setItem(CAR_VIEW_MODE_KEY, '3d'));
  afterEach(() => {
    fixture?.destroy();
    localStorage.removeItem(CAR_VIEW_MODE_KEY);
  });

  it('shows the stored 3D view and no 2D view', async () => {
    await create(true);
    expect(el.querySelector('car-view-3d')).toBeTruthy();
    expect(el.querySelector('car-view')).toBeNull();
    expect(modeButton('3D').getAttribute('aria-pressed')).toBe('true');
  });

  it('falls back to one 2D view with a notice when 3D is unavailable, with selection still linked', async () => {
    await create(false);
    expect(el.querySelector('car-view-3d')).toBeNull();
    expect(el.querySelectorAll('car-view').length).toBe(1);
    expect(notice()?.textContent).toContain(FALLBACK_NOTICES.webgl);
    expect(modeButton('2D').getAttribute('aria-pressed')).toBe('true');
    expect(modeButton('3D').getAttribute('aria-description')).toBe(FALLBACK_NOTICES.webgl);
    // A fallback is not a choice: the stored 3D stays, so the next visit tries 3D again.
    expect(localStorage.getItem(CAR_VIEW_MODE_KEY)).toBe('3d');

    carMarker('bots').click();
    fixture.detectChanges();
    expect(stripItem('bots').getAttribute('aria-selected')).toBe('true');
  });

  it('clears the notice when 3D is chosen again and now starts', async () => {
    await create(false);
    webgl = true;
    modeButton('3D').click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(notice()).toBeNull();
    expect(el.querySelector('car-view-3d')).toBeTruthy();
  });
});
