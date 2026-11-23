import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SHUTDOWN_LOOP } from '../../shutdown-loop.model';
import { NodeStatus } from '../../shutdown-loop.utils';
import { WEBGL_SUPPORT } from '../car-view-3d/car-view-3d.component';
import { VIEW_MODE_KEY } from '../car-view-3d/car-view-3d.utils';
import { CarViewSwitchComponent } from './car-view-switch.component';

const NODES: NodeStatus[] = SHUTDOWN_LOOP.map((node) => ({ node, state: 'no-data', mismatch: false }));

describe('CarViewSwitchComponent', () => {
  let fixture: ComponentFixture<CarViewSwitchComponent>;
  let el: HTMLElement;

  function create(): void {
    TestBed.configureTestingModule({
      imports: [CarViewSwitchComponent],
      providers: [{ provide: WEBGL_SUPPORT, useValue: () => false }]
    });
    fixture = TestBed.createComponent(CarViewSwitchComponent);
    fixture.componentRef.setInput('nodes', NODES);
    fixture.detectChanges();
    el = fixture.nativeElement;
  }
  const button = (label: string) =>
    [...el.querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent!.trim() === label)!;

  beforeEach(() => localStorage.removeItem(VIEW_MODE_KEY));
  afterEach(() => {
    fixture?.destroy();
    localStorage.removeItem(VIEW_MODE_KEY);
  });

  it('shows the 3D view by default', () => {
    create();
    expect(el.querySelector('car-view-3d')).toBeTruthy();
    expect(button('3D').getAttribute('aria-pressed')).toBe('true');
  });

  it('switches to 2D and remembers the choice', async () => {
    create();
    button('2D').click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(el.querySelector('car-view-3d')).toBeNull();
    expect(el.querySelector(':scope > car-view')).toBeTruthy();
    expect(localStorage.getItem(VIEW_MODE_KEY)).toBe('2d');
  });

  it('starts in the stored mode', () => {
    localStorage.setItem(VIEW_MODE_KEY, '2d');
    create();
    expect(el.querySelector('car-view-3d')).toBeNull();
    expect(button('2D').getAttribute('aria-pressed')).toBe('true');
  });
});
