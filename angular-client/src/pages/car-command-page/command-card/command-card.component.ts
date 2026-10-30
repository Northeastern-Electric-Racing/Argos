import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { InfoBackgroundComponent } from 'src/components/info-background/info-background.component';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideSend } from '@ng-icons/lucide';
import { HlmButton } from '@spartan-ng/helm/button';
import { CarCommand } from 'src/utils/types.utils';
import CommandRowComponent from './command-row/command-row.component';

@Component({
  selector: 'command-card',
  templateUrl: './command-card.component.html',
  styleUrls: ['./command-card.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [InfoBackgroundComponent, HlmButton, NgIcon, CommandRowComponent],
  providers: [provideIcons({ lucideSend })]
})
export default class CommandCardComponent {
  command = input.required<CarCommand>();
  sendCommand = output<{ title: string; value: number }>();

  private value = signal<number>(0);

  protected onValueChange(value: number) {
    this.value.set(value);
  }

  handleSend = () => {
    this.sendCommand.emit({ title: this.command().title, value: this.value() });
  };
}
