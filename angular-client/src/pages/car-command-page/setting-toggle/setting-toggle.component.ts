import { Component, effect, EventEmitter, input, Output, signal } from '@angular/core';
import TypographyComponent from '../../../components/typography/typography.component';
import { ToggleSwitch } from 'primeng/toggleswitch';
import { FormsModule } from '@angular/forms';
import HStackComponent from 'src/components/hstack/hstack.component';

@Component({
  selector: 'setting-toggle',
  templateUrl: './setting-toggle.component.html',
  styleUrls: ['./setting-toggle.component.css'],
  standalone: true,
  imports: [TypographyComponent, FormsModule, ToggleSwitch, HStackComponent]
})
export default class SettingToggleComponent {
  label = input.required<string>();
  value = input<boolean | undefined>();

  @Output() valueChange = new EventEmitter<boolean>();

  localValue = signal(this.value());

  constructor() {
    effect(() => {
      this.localValue.set(this.value());
    });
  }

  onValueChange(newVal: boolean) {
    this.localValue.set(newVal);
    this.valueChange.emit(newVal);
  }
}
