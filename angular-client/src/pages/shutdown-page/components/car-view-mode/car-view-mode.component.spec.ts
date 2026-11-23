import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  CAR_VIEW_MODE_KEY,
  CarViewModeComponent,
  readCarViewMode,
  WIDE_FINE_POINTER,
  writeCarViewMode
} from './car-view-mode.component';

const store = (value: string | null) => () => ({ getItem: () => value });
const throwing = () => {
  throw new Error('SecurityError');
};
const wide = (query: string) => query === WIDE_FINE_POINTER;
const narrow = () => false;

describe('readCarViewMode', () => {
  it('defaults to 2D on a phone and 3D on a wide screen with a fine pointer', () => {
    expect(readCarViewMode(store(null), narrow)).toBe('2d');
    expect(readCarViewMode(store(null), wide)).toBe('3d');
  });

  it('prefers the stored choice to the default', () => {
    expect(readCarViewMode(store('3d'), narrow)).toBe('3d');
    expect(readCarViewMode(store('2d'), wide)).toBe('2d');
  });

  it('ignores a stored value that is not a mode', () => {
    expect(readCarViewMode(store('4d'), wide)).toBe('3d');
  });

  it('falls back to the default when storage throws', () => {
    expect(readCarViewMode(throwing, wide)).toBe('3d');
    expect(readCarViewMode(throwing, narrow)).toBe('2d');
  });
});

describe('writeCarViewMode', () => {
  it('stores the choice under the shared key', () => {
    const setItem = vi.fn();
    writeCarViewMode(() => ({ setItem }), '2d');
    expect(setItem).toHaveBeenCalledWith(CAR_VIEW_MODE_KEY, '2d');
  });

  it('does not throw when storage does', () => {
    expect(() => writeCarViewMode(throwing, '3d')).not.toThrow();
  });
});

describe('CarViewModeComponent', () => {
  let fixture: ComponentFixture<CarViewModeComponent>;
  let el: HTMLElement;
  const button = (label: string) =>
    [...el.querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent!.trim() === label)!;

  beforeEach(() => {
    localStorage.removeItem(CAR_VIEW_MODE_KEY);
    fixture = TestBed.createComponent(CarViewModeComponent);
    fixture.componentRef.setInput('mode', '3d');
    fixture.detectChanges();
    el = fixture.nativeElement;
  });
  afterEach(() => localStorage.removeItem(CAR_VIEW_MODE_KEY));

  it('shows the current mode as pressed', () => {
    expect(button('3D').getAttribute('aria-pressed')).toBe('true');
    expect(button('2D').getAttribute('aria-pressed')).toBe('false');
  });

  it('emits and remembers a choice', () => {
    const changes: string[] = [];
    fixture.componentInstance.mode.subscribe((m) => changes.push(m));
    button('2D').click();
    fixture.detectChanges();
    expect(changes).toEqual(['2d']);
    expect(button('2D').getAttribute('aria-pressed')).toBe('true');
    expect(localStorage.getItem(CAR_VIEW_MODE_KEY)).toBe('2d');
  });

  it('describes the 3D button with the reason it is unavailable', () => {
    fixture.componentRef.setInput('mode', '2d');
    fixture.componentRef.setInput('unavailable', '3D view unavailable (no WebGL). Showing 2D.');
    fixture.detectChanges();
    expect(button('3D').getAttribute('aria-description')).toContain('no WebGL');
    expect(button('2D').getAttribute('aria-description')).toBeNull();
  });
});
