import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';
import TypographyComponent from '../../../components/typography/typography.component';
import { UiSwitchComponent } from 'src/ui/switch/switch.component';
import { FormsModule } from '@angular/forms';
import HStackComponent from 'src/components/hstack/hstack.component';

@Component({
  selector: 'setting-toggle',
  templateUrl: './setting-toggle.component.html',
  styleUrls: ['./setting-toggle.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TypographyComponent, FormsModule, UiSwitchComponent, HStackComponent]
})
export default class SettingToggleComponent {
  label = input.required<string>();
  value = model<boolean | undefined>();
}
