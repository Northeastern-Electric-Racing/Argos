import { InputModalityDetector } from '@angular/cdk/a11y';
import { afterNextRender, inject, Injector } from '@angular/core';

/**
 * Returns a function that focuses an element once the view has re-rendered: the lap timer's actions swap or
 * remove the button that was pressed (Start, Stop, Reset, a deleted row), so focus is moved on purpose instead
 * of dropping to <body>. After a mouse or touch press (the CDK's most recent input modality, which also sees
 * the click on a confirm dialog's button) the moved focus shows no ring, as the click itself would not.
 * Call it in an injection context.
 */
export function injectFocusAfterRender(): (find: () => HTMLElement | null | undefined) => void {
  const injector = inject(Injector);
  const modality = inject(InputModalityDetector);
  return (find) => {
    const recent = modality.mostRecentModality;
    const pointer = recent === 'mouse' || recent === 'touch';
    afterNextRender(() => find()?.focus({ focusVisible: !pointer } as FocusOptions), { injector });
  };
}
