import { Directive } from '@angular/core';
import { accordionClasses } from '../recipes/accordion';

/**
 * The keys Angular Aria's accordion group acts on. The group listens for them on its own element and applies
 * them to the active trigger, whatever element they were pressed on, and it prevents their default action.
 */
const GROUP_KEYS = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End', ' ', 'Enter']);

/**
 * An accordion panel's body: `<div uiAccordionBody>` as the first element of the `ngAccordionContent` template.
 * It takes the recipe's body padding and keeps the group's keys inside the panel, so Enter and Space on a
 * button in the panel press that button, and the arrow keys, Home and End stay with the focused control,
 * instead of toggling or moving to a trigger. Every other key (Tab, Escape) still reaches the page.
 */
@Directive({
  selector: '[uiAccordionBody]',
  host: { '[class]': 'classes', '(keydown)': 'keepGroupKeys($event)' }
})
export class UiAccordionBodyDirective {
  protected readonly classes = accordionClasses.body;

  protected keepGroupKeys(event: KeyboardEvent) {
    if (GROUP_KEYS.has(event.key)) event.stopPropagation();
  }
}
