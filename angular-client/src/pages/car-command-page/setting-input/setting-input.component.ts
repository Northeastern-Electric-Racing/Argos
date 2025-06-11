import { Component, effect, EventEmitter, input, Output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { FloatLabel } from 'primeng/floatlabel';

@Component({
  selector: 'setting-input',
  templateUrl: './setting-input.component.html',
  styleUrls: ['./setting-input.component.css'],
  standalone: true,
  imports: [FormsModule, InputTextModule, FloatLabel]
})
export default class SettingInputComponent {
  label = input.required<string>();
  value = input<number | undefined>();

  @Output() valueChange = new EventEmitter<number>();

  localValue = signal(this.value());

  constructor() {
    effect(() => {
      this.localValue.set(this.value());
    });
  }

  onValueChange(newVal: number) {
    this.localValue.set(newVal);
    this.valueChange.emit(newVal);
  }
}
