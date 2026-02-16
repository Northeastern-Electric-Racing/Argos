/**
 * Binary search for the insertion index to keep `arr` sorted by `x`.
 * Returns the index at which `x` should be inserted.
 */
export function binarySearchInsertIndex(arr: { x: number }[], x: number): number {
  let lo = 0;
  let hi = arr.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (arr[mid].x < x) {
      lo = mid + 1;
    } else {
      hi = mid;
    }
  }
  return lo;
}
