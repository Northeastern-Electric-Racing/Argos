/**
 * Binary search for the insertion index to keep the sorted `xs` sorted.
 * Returns the index at which `x` should be inserted.
 */
export function binarySearchInsertIndex(xs: readonly number[], x: number): number {
  let lo = 0;
  let hi = xs.length;
  while (lo < hi) {
    // shift right, same as mid = Math.floor((lo + hi) / 2) but avoids potential overflow
    // interesting article: https://research.google/blog/extra-extra-read-all-about-it-nearly-all-binary-searches-and-mergesorts-are-broken/
    const mid = (lo + hi) >>> 1;
    if (xs[mid] < x) {
      lo = mid + 1;
    } else {
      hi = mid;
    }
  }
  return lo;
}
