import { Injectable } from '@angular/core';

/**
 * One IntersectionObserver shared by every sidebar row, so ~900 rows cost one observer, not ~900. It watches
 * against the viewport, which still clips each row by every scrolling ancestor (the tree, the mobile drawer);
 * a row hidden with display: none (a collapsed branch) has no box and never intersects.
 */
@Injectable({ providedIn: 'root' })
export class OnScreenObserver {
  private callbacks = new Map<Element, (onScreen: boolean) => void>();
  private observer?: IntersectionObserver;

  /** Calls `callback` whenever `target` enters or leaves the screen; returns a function that stops watching. */
  observe(target: Element, callback: (onScreen: boolean) => void): () => void {
    // No IntersectionObserver (old browser, server render): treat every row as on screen, as develop did.
    if (typeof IntersectionObserver === 'undefined') {
      callback(true);
      return () => undefined;
    }
    this.observer ??= new IntersectionObserver((entries) => {
      for (const entry of entries) this.callbacks.get(entry.target)?.(entry.isIntersecting);
    });
    this.callbacks.set(target, callback);
    this.observer.observe(target);
    return () => {
      this.callbacks.delete(target);
      this.observer?.unobserve(target);
    };
  }
}
