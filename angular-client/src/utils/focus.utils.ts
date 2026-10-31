import { afterNextRender, Injector } from '@angular/core';

/** True when nothing has focus, which is where focus lands after its element is removed. */
export const focusLost = (): boolean => !document.activeElement || document.activeElement === document.body;

/**
 * The `index`th match of `selector` in `container`, or the last one when fewer are left (the row
 * after a deleted one, else the one before it), else `container`'s first button.
 */
export const focusTargetNear = (
  container: HTMLElement | null | undefined,
  selector: string,
  index: number
): HTMLElement | null => {
  if (!container) return null;
  const matches = container.querySelectorAll<HTMLElement>(selector);
  return matches[Math.min(index, matches.length - 1)] ?? container.querySelector<HTMLElement>('button');
};

/** After the next render, focuses `target` if focus was lost (its element was removed). */
export const focusIfLost = (target: () => HTMLElement | null | undefined, injector: Injector): void => {
  afterNextRender(
    () => {
      if (focusLost()) target()?.focus();
    },
    { injector }
  );
};
