import { Component, input, ChangeDetectionStrategy } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { iconClasses } from 'src/ui/recipes/icon';
import { cx, tw } from 'src/ui/recipes/tw';
import TypographyComponent from '../typography/typography.component';

const chipClasses = {
  /** The label inherits the button's colour, so hover and the current page turn icon and text red together. */
  chip: tw(
    'm-[5px] flex w-full cursor-pointer items-center rounded-sm border-0 bg-transparent p-[5px] text-left font-sans text-base text-fg transition-colors duration-180 hover:text-accent-fg focus-visible:focus-ring focus-visible:-outline-offset-2 aria-[current=page]:text-accent-fg'
  ),
  icon: cx(tw('mr-2.5 shrink-0'), iconClasses.xl),
  iconSmall: cx(tw('mr-2.5 shrink-0'), iconClasses.lg)
};

/** One nav item (icon and label) in the desktop bar and the mobile drawer. */
@Component({
  selector: 'sidebar-chip',
  templateUrl: './sidebar-chip.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [MatIcon, TypographyComponent],
  host: { class: 'flex' }
})
export default class SidebarChipComponent {
  icon = input<string>('');
  value = input<string>('');
  active = input<boolean>(false); // New input to control active state
  small = input<boolean>(false);
  protected readonly classes = chipClasses;
}
