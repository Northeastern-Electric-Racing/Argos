import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SHUTDOWN_LOOP } from '../../shutdown-loop.model';
import { NodeStatus } from '../../shutdown-loop.utils';
import { WEBGL_SUPPORT } from '../car-view-3d/car-view-3d.tokens';
import { CAR_VIEW_STORAGE_KEY, CarViewSwitcherComponent, readCarViewMode } from './car-view-switcher.component';

const NODES: NodeStatus[] = SHUTDOWN_LOOP.map((node) => ({ node, state: 'no-data', mismatch: false }));

describe('readCarViewMode', () => {
  it('defaults to 3D when nothing is stored or the value is unknown', () => {
    expect(readCarViewMode({ getItem: () => null })).toBe('3d');
    expect(readCarViewMode({ getItem: () => 'vr' })).toBe('3d');
  });

  it('returns the stored mode', () => {
    expect(readCarViewMode({ getItem: () => '2d' })).toBe('2d');
  });

  it('defaults to 3D when storage throws', () => {
    expect(
      readCarViewMode({
        getItem: () => {
          throw new Error('blocked');
        }
      })
    ).toBe('3d');
  });
});

describe('CarViewSwitcherComponent', () => {
  let fixture: ComponentFixture<CarViewSwitcherComponent>;
  let el: HTMLElement;
  const button = (label: string) =>
    [...el.querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent!.trim() === label)!;

  const create = async () => {
    await TestBed.configureTestingModule({
      imports: [CarViewSwitcherComponent],
      // No WebGL: the 3D view shows its 2D fallback, so no scene is loaded.
      providers: [{ provide: WEBGL_SUPPORT, useValue: () => false }]
    }).compileComponents();
    fixture = TestBed.createComponent(CarViewSwitcherComponent);
    fixture.componentRef.setInput('nodes', NODES);
    fixture.detectChanges();
    el = fixture.nativeElement;
  };

  afterEach(() => localStorage.removeItem(CAR_VIEW_STORAGE_KEY));

  it('shows the 3D view by default', async () => {
    await create();
    expect(el.querySelector('car-view-3d')).toBeTruthy();
    expect(button('3D').getAttribute('aria-pressed')).toBe('true');
    expect(button('2D').getAttribute('aria-pressed')).toBe('false');
  });

  it('switches to 2D and remembers it', async () => {
    await create();
    button('2D').click();
    fixture.detectChanges();
    expect(el.querySelector('car-view-3d')).toBeNull();
    expect(el.querySelector('car-view')).toBeTruthy();
    expect(localStorage.getItem(CAR_VIEW_STORAGE_KEY)).toBe('2d');
  });

  it('starts in the stored mode', async () => {
    localStorage.setItem(CAR_VIEW_STORAGE_KEY, '2d');
    await create();
    expect(el.querySelector('car-view-3d')).toBeNull();
    expect(button('2D').getAttribute('aria-pressed')).toBe('true');
  });

  it('still switches when storage throws', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    await create();
    button('2D').click();
    fixture.detectChanges();
    expect(el.querySelector('car-view')).toBeTruthy();
  });
});
