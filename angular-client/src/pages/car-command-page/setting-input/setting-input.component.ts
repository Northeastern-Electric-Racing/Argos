import { ChangeDetectionStrategy, Component, computed, input, model } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { UiInputDirective, UiLabelDirective } from 'src/ui/field/field.directive';
import { numberInputClass } from 'src/ui/recipes/number-input';

@Component({
  selector: 'setting-input',
  templateUrl: './setting-input.component.html',
  host: { class: 'block w-full' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, UiInputDirective, UiLabelDirective]
})
export default class SettingInputComponent {
  label = input.required<string>();
  value = model<number | undefined>();
  min = input<number>();
  max = input<number>();
  protected readonly numberInput = numberInputClass('fill');
  /** A valid id from the label: "Batch Time (s)" is `setting-batch-time-s-input`. */
  protected readonly inputId = computed(
    () =>
      'setting-' +
      this.label()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') +
      '-input'
  );

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
