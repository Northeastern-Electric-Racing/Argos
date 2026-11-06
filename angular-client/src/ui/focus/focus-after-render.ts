import { InputModalityDetector } from '@angular/cdk/a11y';
import { afterNextRender, inject, Injector } from '@angular/core';

/** Finds the element to focus once the view has re-rendered; nothing to focus is allowed. */
export type FocusTarget = () => HTMLElement | null | undefined;

/**
 * Returns a function that focuses an element once the view has re-rendered. Every programmatic focus move after
 * an action goes through it: an action that swaps or removes the button that was pressed (Start, Stop, Reset,
 * a deleted row, Authenticate, a dismissed notification) moves focus on purpose instead of dropping it to
 * <body>. After a mouse or touch press (the CDK's most recent input modality, which also sees the click on a
 * confirm dialog's button) the moved focus shows no ring, as the click itself would not; after a key press it
 * does. `then` runs on the element after it has focus: select a field's text there, never before focusing.
 * `preventScroll` keeps the page where it is (a passive surface such as the status bar must never move it).
 * Call it in an injection context.
 */
export function injectFocusAfterRender({ preventScroll = false }: { preventScroll?: boolean } = {}): (
  find: FocusTarget,
  then?: (element: HTMLElement) => void
) => void {
  const injector = inject(Injector);
  const modality = inject(InputModalityDetector);
  return (find, then) => {
    const recent = modality.mostRecentModality;
    const pointer = recent === 'mouse' || recent === 'touch';
    afterNextRender(
      () => {
        const element = find();
        if (!element) return;
        element.focus({ preventScroll, focusVisible: !pointer } as FocusOptions);
        then?.(element);
      },
      { injector }
    );
  };
}
