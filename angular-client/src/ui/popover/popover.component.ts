import { CdkTrapFocus } from '@angular/cdk/a11y';
import { CdkConnectedOverlay, ConnectedPosition, FlexibleConnectedPositionStrategyOrigin } from '@angular/cdk/overlay';
import { ChangeDetectionStrategy, Component, ElementRef, input, output, signal, viewChild } from '@angular/core';

const POSITIONS: ConnectedPosition[] = [
  { originX: 'end', originY: 'bottom', overlayX: 'end', overlayY: 'top' },
  { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top' },
  { originX: 'end', originY: 'top', overlayX: 'end', overlayY: 'bottom', offsetY: -16 }
];

/**
 * Click-anchored floating panel on a CDK connected overlay. Closes on outside click and
 * Escape. Same imperative API as PrimeNG's Popover: `toggle(event)`, `show(event)`, `hide()`.
 * On open, the panel's cdkTrapFocus moves focus to its first tabbable element and keeps Tab
 * inside; on close, focus goes back to the trigger unless the user clicked into something else.
 * Bind `isOpen()` to the trigger's aria-expanded.
 */
@Component({
  selector: 'ui-popover',
  templateUrl: './popover.component.html',
  styleUrls: ['./popover.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CdkConnectedOverlay, CdkTrapFocus]
})
export class UiPopoverComponent {
  ariaLabel = input<string | undefined>(undefined);
  panelClass = input<string>('');
  /** Emits once the panel is open. */
  shown = output<void>();

  protected open = signal(false);
  readonly isOpen = this.open.asReadonly();
  protected origin = signal<FlexibleConnectedPositionStrategyOrigin | null>(null);
  protected positions = POSITIONS;
  private trap = viewChild(CdkTrapFocus);
  private panel = viewChild<ElementRef<HTMLElement>>('panel');

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
    if (!this.open()) return;
    // Restore focus when it was in the panel (or was dropped to <body> as the panel left the DOM),
    // but not when an outside click put it somewhere else.
    const active = document.activeElement;
    const restore = !active || active === document.body || !!this.panel()?.nativeElement.contains(active);
    this.open.set(false);
    if (restore) this.originElement()?.focus();
  }

  protected onAttach(): void {
    this.trap()?.focusTrap.focusInitialElementWhenReady();
    this.shown.emit();
  }

  private originElement(): HTMLElement | null {
    const origin = this.origin();
    return origin instanceof ElementRef ? (origin.nativeElement as HTMLElement) : null;
  }

  protected onOutsideClick(event: MouseEvent): void {
    // A click on the origin toggles it via its own handler; don't close and reopen.
    const el = this.originElement();
    if (el && el.contains(event.target as Node)) return;
    this.hide();
  }
}
