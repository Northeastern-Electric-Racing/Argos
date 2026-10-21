import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';
import TypographyComponent from '../../../components/typography/typography.component';
import { MatSlideToggle } from '@angular/material/slide-toggle';
import { FormsModule } from '@angular/forms';
import HStackComponent from 'src/components/hstack/hstack.component';

@Component({
  selector: 'setting-toggle',
  templateUrl: './setting-toggle.component.html',
  styleUrls: ['./setting-toggle.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TypographyComponent, FormsModule, MatSlideToggle, HStackComponent]
})
export default class SettingToggleComponent {
  label = input.required<string>();
  value = model<boolean | undefined>();
}
