/**
 * @deprecated Interim only: the strip and the 2D car still roll their own roving focus until they move to Angular
 * Aria's listbox with the loop-node-listbox directive (judge M3), which deletes this file. Not part of the contract.
 *
 * Roving focus through `count` loop nodes: arrows on either axis step to the next or previous one, Home and End jump
 * to the ends. Undefined for any other key.
 */
export function rovingIndex(key: string, from: number, count: number): number | undefined {
  switch (key) {
    case 'ArrowRight':
    case 'ArrowDown':
      return Math.min(from + 1, count - 1);
    case 'ArrowLeft':
    case 'ArrowUp':
      return Math.max(from - 1, 0);
    case 'Home':
      return 0;
    case 'End':
      return count - 1;
    default:
      return undefined;
  }
}
