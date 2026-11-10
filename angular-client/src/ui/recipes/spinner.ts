import { cx, tw } from './tw';

/**
 * The loading spinner: a ring with an accent arc, 4px thick. Keeps turning under reduced motion (base.css).
 *   lg  100px, the page loader (loading-page), PrimeNG's progressspinner size
 *   sm  32px, inside a table's loading mask, PrimeNG's table loader size
 */
export const SPINNER_SIZES = ['lg', 'sm'] as const;
export type SpinnerSize = (typeof SPINNER_SIZES)[number];

const spinnerBase = tw('animate-spin rounded-full border-4 border-solid border-fg/15 border-t-accent');
const spinnerSizeClasses: Record<SpinnerSize, string> = {
  lg: tw('size-25'),
  sm: tw('size-8')
};

export function spinnerClass(size: SpinnerSize = 'lg'): string {
  return cx(spinnerBase, spinnerSizeClasses[size]);
}
