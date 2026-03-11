import { Component, input, ChangeDetectionStrategy } from '@angular/core';
import { SelectorConfig, SelectDropdownComponent } from '../select-dropdown/select-dropdown.component';

@Component({
  selector: 'section-header',
  templateUrl: './section-header.component.html',
  styleUrl: './section-header.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SelectDropdownComponent]
})
export class SectionHeaderComponent {
  leftTitle = input.required<string>();
  rightTitle = input<string>();
  selectorConfigs = input<SelectorConfig[]>([]);
}
