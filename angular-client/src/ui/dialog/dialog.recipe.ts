import { tw } from '../recipes/tw';

/**
 * Dialog and panel chrome, PrimeNG's look: the surface-2 grey, a 20px radius, a 20px semibold title, the
 * close button in the top-right corner of the header, the scrim behind a modal. Sizes:
 *   md       dialogs and panels
 *   compact  a tighter header and padding, for small modeless panels (BMS cell comparison)
 * The header leaves room on the right for the 32px close button, which sits after the content in DOM order
 * (so the CDK's first-tabbable focus lands on the content) and is placed over the header.
 */
export const DIALOG_DENSITIES = ['md', 'compact'] as const;
export type DialogDensity = (typeof DIALOG_DENSITIES)[number];

/** On the modal backdrop. */
export const dialogBackdropClass = tw('bg-scrim');

export const dialogClasses: Record<
  DialogDensity,
  { surface: string; header: string; title: string; content: string; close: string }
> = {
  md: {
    surface: tw(
      'relative flex max-h-[90vh] animate-pop-in flex-col overflow-hidden rounded-dialog border border-solid border-border bg-surface-2 font-sans text-fg shadow-overlay'
    ),
    header: tw('flex min-h-14 items-center pt-4 pr-16 pb-2 pl-5'),
    title: tw('m-0 text-lg leading-tight font-semibold'),
    content: tw('overflow-auto px-5 pb-5'),
    close: tw('absolute top-4 right-4')
  },
  compact: {
    surface: tw(
      'relative flex max-h-[90vh] animate-pop-in flex-col overflow-hidden rounded-lg border border-solid border-border bg-surface-2 font-sans text-fg shadow-overlay'
    ),
    header: tw('flex min-h-10.5 items-center pt-1.5 pr-14 pb-1 pl-3.5'),
    title: tw('m-0 text-base leading-tight font-semibold'),
    content: tw('overflow-auto px-3.5 pb-2.5'),
    close: tw('absolute top-1.5 right-2')
  }
};

/** Content of a dialog opened without a header: the component lays itself out. */
export const headerlessContentClass = tw('overflow-auto p-0');
