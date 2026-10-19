import { computed, DestroyRef, inject, Injectable, Signal, signal } from '@angular/core';

/** The status dot beside a readout: a color plus the words for it, so state is never color-only. */
export type QuickViewStatus = {
  color: string;
  label: string;
};

/**
 * One readout in the quick view, described as data. The app shell renders every registered
 * readout with the same chip, so pages say what to show, never how.
 */
export type QuickViewReadout = {
  /** Subtitle under the value, e.g. "State of Charge". */
  label: string;
  /** Live value: numbers are formatted with `decimals`, strings shown as-is, undefined/NaN as a dash. */
  value: Signal<number | string | undefined>;
  unit?: string;
  /** Decimal places for a numeric value (default 0). */
  decimals?: number;
  /** Registered svgIcon name shown to the left of the value. */
  icon?: string;
  /** Optional second line under the label, e.g. where the worst cell is. */
  detail?: Signal<string | undefined>;
  /** Optional status dot. */
  status?: Signal<QuickViewStatus | undefined>;
};

/** One owner's claim on the quick view. */
type Claim = { readonly readouts: readonly QuickViewReadout[] };

/**
 * The one app-wide quick view's registry. The app shell hosts a single quick view that renders
 * `readouts()`; pages and components claim it by registering the readouts they want shown, and
 * their readouts leave with them when they are destroyed, so nothing stale survives navigation.
 */
@Injectable({ providedIn: 'root' })
export class QuickViewService {
  private readonly claims = signal<readonly Claim[]>([]);

  /** Every registered readout, in registration order. */
  readonly readouts = computed(() => this.claims().flatMap((claim) => claim.readouts));

  /**
   * Show `readouts` in the quick view until the owner is destroyed. Call from the owner's
   * injection context (constructor or field initializer), or pass its DestroyRef.
   *
   * @returns a function that withdraws these readouts early.
   */
  register(readouts: readonly QuickViewReadout[], destroyRef: DestroyRef = inject(DestroyRef)): () => void {
    const claim: Claim = { readouts };
    this.claims.update((claims) => [...claims, claim]);

    const release = () => this.claims.update((claims) => claims.filter((c) => c !== claim));
    const stopListening = destroyRef.onDestroy(release);
    return () => {
      stopListening();
      release();
    };
  }
}
