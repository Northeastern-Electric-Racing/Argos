import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { FloatLabel } from 'primeng/floatlabel';

@Component({
  selector: 'setting-input',
  templateUrl: './setting-input.component.html',
  styleUrls: ['./setting-input.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, InputTextModule, FloatLabel]
})
export default class SettingInputComponent {
  label = input.required<string>();
  value = model<number | undefined>();
  min = input<number>();
  max = input<number>();

  onValueChange(raw: string) {
    let num = Number(raw);
    if (isNaN(num)) return;
    const minVal = this.min();
    const maxVal = this.max();
    if (minVal !== undefined && num < minVal) num = minVal;
    if (maxVal !== undefined && num > maxVal) num = maxVal;
    this.value.set(num);
  }
}
