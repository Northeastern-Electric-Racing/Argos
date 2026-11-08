import { ChangeDetectionStrategy, Component, computed, input, linkedSignal, output } from '@angular/core';
import TypographyComponent from '../typography/typography.component';
import { tw } from 'src/ui/recipes/tw';

/** A pill track (grey off, white on) whose dark knob sits at the start when off and the end when on. */
const trackClasses = {
  off: tw('flex h-1/2 w-full items-center justify-start rounded-[10vw] bg-control-border transition-colors duration-300'),
  on: tw('flex h-1/2 w-full items-center justify-end rounded-[10vw] bg-on-accent transition-colors duration-300')
} as const;
const knobClasses = {
  off: tw('ml-[5%] h-7/10 w-3/10 rounded-full bg-page'),
  on: tw('mr-[5%] ml-[5%] h-7/10 w-3/10 rounded-full bg-page')
} as const;

@Component({
  selector: 'switch',
  templateUrl: './switch.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [TypographyComponent]
})
export class SwitchComponent {
  isOn = input<boolean>(false);
  offString = input<string>('PAUSED');
  onString = input<string>('ALLOWED');
  // Follows the isOn input but can be toggled locally.
  currentState = linkedSignal(() => this.isOn());
  chargingString = computed(() => (this.currentState() ? this.onString() : this.offString()));
  toggleEmitter = output<boolean>();
  protected trackClass = computed(() => (this.currentState() ? trackClasses.on : trackClasses.off));
  protected knobClass = computed(() => (this.currentState() ? knobClasses.on : knobClasses.off));

  onToggle() {
    this.currentState.update((v) => !v);
    this.toggleEmitter.emit(this.currentState());
  }
}
