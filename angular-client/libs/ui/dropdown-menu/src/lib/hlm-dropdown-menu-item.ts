import { type BooleanInput } from '@angular/cdk/coercion';
import { CdkMenuItem } from '@angular/cdk/menu';
import { booleanAttribute, Directive, HOST_TAG_NAME, inject, input } from '@angular/core';
import { classes } from '@spartan-ng/helm/utils';
import { HlmDropdownMenuFocusOnHover } from './hlm-dropdown-menu-focus-on-hover';

@Directive({
  selector: '[hlmDropdownMenuItem],hlm-dropdown-menu-item',
  exportAs: 'hlmDropdownMenuItem',
  hostDirectives: [
    {
      directive: CdkMenuItem,
      inputs: ['cdkMenuItemDisabled: disabled'],
      outputs: ['cdkMenuItemTriggered: triggered']
    },
    HlmDropdownMenuFocusOnHover
  ],
  host: {
    'data-slot': 'dropdown-menu-item',
    '[attr.disabled]': '_isButton && disabled() ? "" : null',
    '[attr.data-disabled]': 'disabled() ? "" : null',
    '[attr.data-variant]': 'variant()',
    '[attr.data-inset]': 'inset() ? "" : null'
  }
})
export class HlmDropdownMenuItem {
  protected readonly _isButton = inject(HOST_TAG_NAME) === 'button';

  public readonly disabled = input<boolean, BooleanInput>(false, { transform: booleanAttribute });

  public readonly variant = input<'default' | 'destructive'>('default');

  public readonly inset = input<boolean, BooleanInput>(false, {
    transform: booleanAttribute
  });

  constructor() {
    // Argos: dark destructive items fill 60% under white text on hover and focus, since helm's
    // red-on-red tint is 3.6:1.
    classes(
      () =>
        "hover:bg-accent focus:bg-accent hover:text-accent-foreground focus:text-accent-foreground data-[variant=destructive]:text-destructive data-[variant=destructive]:hover:bg-destructive/10 data-[variant=destructive]:focus:bg-destructive/10 dark:data-[variant=destructive]:hover:bg-destructive/60 dark:data-[variant=destructive]:focus:bg-destructive/60 dark:data-[variant=destructive]:hover:text-white dark:data-[variant=destructive]:focus:text-white dark:data-[variant=destructive]:hover:*:[ng-icon]:text-white dark:data-[variant=destructive]:focus:*:[ng-icon]:text-white data-[variant=destructive]:hover:text-destructive data-[variant=destructive]:focus:text-destructive data-[variant=destructive]:*:[ng-icon]:text-destructive not-data-[variant=destructive]:hover:**:text-accent-foreground not-data-[variant=destructive]:focus:**:text-accent-foreground gap-2 rounded-sm px-2 py-1.5 text-sm data-inset:ps-8 [&_ng-icon:not([class*='text-'])]:text-[length:--spacing(4)] group/dropdown-menu-item relative flex w-full cursor-default items-center outline-hidden select-none data-disabled:pointer-events-none data-disabled:opacity-50 [&_ng-icon]:pointer-events-none [&_ng-icon]:shrink-0"
    );
  }
}
