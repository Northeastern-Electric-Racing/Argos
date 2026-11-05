import { tw } from './tw';

/**
 * The accordion recipe, for Angular Aria's accordion: `ngAccordionGroup` (group), then per panel an `<h3>`
 * (heading) holding the `ngAccordionTrigger` (trigger, with the chevron as icon inside it) and the
 * `ngAccordionPanel`, whose `ngAccordionContent` template holds the body. Behaviour (roving focus, arrows,
 * Home/End, Enter/Space, aria-expanded) is Aria's; state reads from aria-expanded:
 *   group    bordered box on surface-1, hidden while it has no panels (814 drew nothing without faults)
 *   heading  a divider above every panel but the first
 *   trigger  full-width row: accent text while expanded, hover tint, a pressed tint (p-ripple's stand-in, Q8),
 *            the solid focus ring inset
 *   icon     the chevron, turned while its trigger is expanded
 *   body     the panel's padding
 * The fault page's CAN-node panels use it.
 */
export const accordionClasses = {
  group: tw('overflow-hidden rounded-md border border-solid border-border bg-surface-1 empty:hidden'),
  heading: tw('m-0 border-t border-solid border-border text-base font-semibold first-of-type:border-t-0'),
  trigger: tw(
    'group/trigger flex cursor-pointer items-center justify-between px-5 py-4 text-fg select-none hover:bg-fg/4 focus-visible:focus-ring focus-visible:-outline-offset-2 active:bg-fg/8 aria-expanded:text-accent-fg'
  ),
  icon: tw('transition-transform duration-150 group-aria-expanded/trigger:rotate-180'),
  body: tw('px-5 pb-4')
} as const;
