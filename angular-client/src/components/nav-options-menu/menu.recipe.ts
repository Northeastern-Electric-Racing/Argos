import { tw } from 'src/ui/recipes/tw';

/**
 * The menu recipe: the floating surface of an Angular Aria `ngMenu` and its `ngMenuItem`s. Aria sets
 * data-visible on the menu and aria-disabled on items; focus lands on the items themselves (roving), so the
 * keyboard ring and the focus tint use focus-visible only and a mouse leaves neither.
 * `menuPanelClass` and `menuItemClass` are the plain list; the apps menu has its own grid layout below.
 */
export const menuPanelClass = tw(
  'flex min-w-40 animate-pop-in flex-col rounded-md border border-solid border-border bg-surface-2 p-1 text-fg shadow-overlay data-[visible=false]:hidden'
);

export const menuItemClass = tw(
  'flex cursor-pointer items-center gap-2 rounded-sm px-3 py-2 font-sans text-ctrl text-fg outline-none hover:bg-fg/8 focus-visible:bg-fg/8 focus-visible:focus-ring focus-visible:-outline-offset-2 aria-disabled:cursor-default aria-disabled:opacity-50'
);

/** The navbar's apps menu: a 3-column grid of large icon tiles that turn red on hover. */
export const appsMenuClasses = {
  trigger: tw(
    'flex cursor-pointer items-center justify-center rounded-sm border-0 bg-transparent p-2 text-inherit transition-colors duration-200 hover:text-accent-fg focus-visible:focus-ring aria-expanded:text-accent-fg'
  ),
  panel: tw(
    'grid min-w-[300px] animate-pop-in grid-cols-3 gap-3 rounded-dialog border border-solid border-border bg-surface-2 p-4 text-fg shadow-overlay data-[visible=false]:hidden'
  ),
  item: tw(
    'mx-2.5 my-1 flex min-h-20 cursor-pointer flex-col items-center justify-center rounded-sm px-2 py-4 font-sans text-fg transition-colors duration-200 outline-none select-none hover:text-accent-fg focus-visible:bg-fg/8 focus-visible:focus-ring focus-visible:-outline-offset-2 aria-disabled:cursor-default aria-disabled:opacity-50'
  ),
  label: tw('text-center text-base leading-[1.2] font-medium')
};
