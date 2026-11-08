import { _getFocusedElementPierceShadowDom } from '@angular/cdk/platform';
import { DOCUMENT, inject } from '@angular/core';
import { injectFocusAfterRender } from './focus-after-render';

const focusable =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), ' +
  'textarea:not([disabled]), [tabindex]:not([tabindex="-1"]):not([disabled])';

const canFocus = (el: Element): el is HTMLElement =>
  el instanceof HTMLElement && el.isConnected && !el.matches(':disabled') && !el.closest('[inert], [hidden]');

const firstFocusable = (scope: Element): HTMLElement | undefined =>
  [...scope.querySelectorAll(focusable)].find(
    (el): el is HTMLElement => canFocus(el) && !el.closest('[aria-hidden="true"]')
  );

/** Closes a non-modal surface: call it while the surface is still in the DOM, then remove the surface. */
export type RestoreFocus = (surface: Element) => void;

/**
 * Focus restore for non-modal surfaces (a panel, a non-modal drawer), which the CDK Dialog's own restore doesn't
 * cover. Returns a function to call as the surface opens: it remembers the focused element, and gives back a
 * {@link RestoreFocus} to call as it closes. That returns focus to the opener when focus was inside the surface
 * (Close button, Escape) or already lost, so it never drops to <body>; when the page closed the surface while focus
 * was elsewhere on it, focus stays put. If the opener has left the DOM, the first focusable element in its nearest
 * surviving ancestor takes focus, then the first on the page. Call it in an injection context.
 */
export function injectFocusRestore(): () => RestoreFocus {
  const document = inject(DOCUMENT);
  const focusAfterRender = injectFocusAfterRender();
  return () => {
    const opener = _getFocusedElementPierceShadowDom();
    // The opener's ancestors as they are now: once the opener is removed, its parentElement is gone.
    const ancestors: Element[] = [];
    for (let el = opener?.parentElement; el; el = el.parentElement) ancestors.push(el);

    return (surface) => {
      const active = _getFocusedElementPierceShadowDom();
      if (active && active !== document.body && !surface.contains(active)) return;
      focusAfterRender(() => {
        if (opener && opener !== document.body && canFocus(opener)) return opener;
        const scope = ancestors.find((el) => el.isConnected) ?? document.body;
        return firstFocusable(scope) ?? firstFocusable(document.body);
      });
    };
  };
}
