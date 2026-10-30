import { Component, ElementRef, inject, input, ChangeDetectionStrategy } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import TypographyComponent from '../typography/typography.component';

@Component({
  selector: 'sidebar-chip',
  templateUrl: './sidebar-chip.component.html',
  styleUrls: ['./sidebar-chip.component.css'],
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [MatIcon, TypographyComponent],
  // Nav chips act as links: reachable by Tab and activated by Enter or Space like a native button
  host: {
    role: 'link',
    tabindex: '0',
    '[attr.aria-current]': "active() ? 'page' : null",
    '(keydown.enter)': 'activate($event)',
    '(keydown.space)': 'activate($event)'
  }
})
export default class SidebarChipComponent {
  private host = inject<ElementRef<HTMLElement>>(ElementRef);

  icon = input<string>('');
  value = input<string>('');
  active = input<boolean>(false); // New input to control active state
  small = input<boolean>(false);

  activate(event: Event): void {
    event.preventDefault();
    this.host.nativeElement.click();
  }
}
