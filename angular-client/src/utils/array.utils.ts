/**
 * Binary search for the insertion index to keep `arr` sorted by the x that `xOf` reads from each item.
 * Returns the index at which `x` should be inserted.
 */
export function binarySearchInsertIndex<T>(arr: readonly T[], x: number, xOf: (item: T) => number): number {
  let lo = 0;
  let hi = arr.length;
  while (lo < hi) {
    // shift right, same as mid = Math.floor((lo + hi) / 2) but avoids potential overflow
    // interesting article: https://research.google/blog/extra-extra-read-all-about-it-nearly-all-binary-searches-and-mergesorts-are-broken/
    const mid = (lo + hi) >>> 1;
    if (xOf(arr[mid]) < x) {
      lo = mid + 1;
    } else {
      hi = mid;
    }
  }
  return lo;
}
