import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  CAR_VIEW_3D_QUERY,
  CAR_VIEW_STORAGE_KEY,
  CarViewMode,
  CarViewModeComponent,
  readCarViewMode,
  writeCarViewMode
} from './car-view-mode.component';

const media =
  (wide: boolean) =>
  (query: string): Pick<MediaQueryList, 'matches'> => ({ matches: wide && query === CAR_VIEW_3D_QUERY });
const stored = (value: string | null) => ({ getItem: () => value });
const throwing = {
  getItem: (): string | null => {
    throw new Error('blocked');
  }
};

describe('readCarViewMode', () => {
  it('with nothing stored, is 2D on a phone and 3D on a wide screen with a fine pointer', () => {
    expect(readCarViewMode(stored(null), media(false))).toBe('2d');
    expect(readCarViewMode(stored(null), media(true))).toBe('3d');
    expect(readCarViewMode(stored('vr'), media(true))).toBe('3d');
  });

  it('lets a stored choice win, even 3D on a phone', () => {
    expect(readCarViewMode(stored('3d'), media(false))).toBe('3d');
    expect(readCarViewMode(stored('2d'), media(true))).toBe('2d');
  });

  it('falls back to the screen’s default when storage throws', () => {
    expect(readCarViewMode(throwing, media(true))).toBe('3d');
    expect(readCarViewMode(throwing, media(false))).toBe('2d');
  });

  it('writes the key, and survives storage that throws', () => {
    const setItem = vi.fn();
    writeCarViewMode('2d', { setItem });
    expect(setItem).toHaveBeenCalledWith(CAR_VIEW_STORAGE_KEY, '2d');
    expect(() =>
      writeCarViewMode('3d', {
        setItem: () => {
          throw new Error('quota');
        }
      })
    ).not.toThrow();
  });
});

@Component({
  template: '<car-view-mode [(mode)]="mode" [notice]="notice()" />',
  imports: [CarViewModeComponent]
})
class HostComponent {
  readonly mode = signal<CarViewMode>('3d');
  readonly notice = signal<string | null>(null);
}

describe('CarViewModeComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  let el: HTMLElement;
  const button = (label: string) =>
    [...el.querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent!.trim() === label)!;

  beforeEach(() => {
    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    el = fixture.nativeElement;
  });
  afterEach(() => localStorage.removeItem(CAR_VIEW_STORAGE_KEY));

  it('shows the mode pressed and switches it, remembering the choice', () => {
    expect(button('3D').getAttribute('aria-pressed')).toBe('true');
    button('2D').click();
    fixture.detectChanges();
    expect(fixture.componentInstance.mode()).toBe('2d');
    expect(button('2D').getAttribute('aria-pressed')).toBe('true');
    expect(localStorage.getItem(CAR_VIEW_STORAGE_KEY)).toBe('2d');
  });

  it('still switches when storage throws', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    button('2D').click();
    expect(fixture.componentInstance.mode()).toBe('2d');
  });

  it('shows why 3D is unavailable, with 3D not pressed', () => {
    fixture.componentInstance.mode.set('2d');
    fixture.componentInstance.notice.set('3D view unavailable (no WebGL). Showing 2D.');
    fixture.detectChanges();
    expect(el.querySelector('[role="status"]')!.textContent).toContain('no WebGL');
    expect(button('3D').getAttribute('aria-pressed')).toBe('false');
    expect(button('3D').getAttribute('aria-description')).toContain('retry');
  });
});
