import { CdkConnectedOverlay, ConnectedPosition, FlexibleConnectedPositionStrategyOrigin } from '@angular/cdk/overlay';
import { ChangeDetectionStrategy, Component, ElementRef, input, output, signal } from '@angular/core';

const POSITIONS: ConnectedPosition[] = [
  { originX: 'end', originY: 'bottom', overlayX: 'end', overlayY: 'top' },
  { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top' },
  { originX: 'end', originY: 'top', overlayX: 'end', overlayY: 'bottom', offsetY: -16 }
];

/**
 * Click-anchored floating panel on a CDK connected overlay. Closes on outside click and
 * Escape. Same imperative API as PrimeNG's Popover: `toggle(event)`, `show(event)`, `hide()`.
 */
@Component({
  selector: 'ui-popover',
  templateUrl: './popover.component.html',
  styleUrls: ['./popover.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CdkConnectedOverlay]
})
export class UiPopoverComponent {
  ariaLabel = input<string | undefined>(undefined);
  panelClass = input<string>('');
  /** Emits once the panel is open. */
  shown = output<void>();

  protected open = signal(false);
  protected origin = signal<FlexibleConnectedPositionStrategyOrigin | null>(null);
  protected positions = POSITIONS;

  toggle(event: Event): void {
    if (this.open()) this.hide();
    else this.show(event);
  }

  show(event: Event): void {
    const target = (event.currentTarget ?? event.target) as HTMLElement | null;
    if (target) this.origin.set(new ElementRef(target));
    this.open.set(true);
  }

  hide(): void {
    this.open.set(false);
  }

  protected onOutsideClick(event: MouseEvent): void {
    // A click on the origin toggles it via its own handler; don't close and reopen.
    const origin = this.origin();
    const el = origin instanceof ElementRef ? (origin.nativeElement as HTMLElement) : null;
    if (el && el.contains(event.target as Node)) return;
    this.hide();
  }
}
