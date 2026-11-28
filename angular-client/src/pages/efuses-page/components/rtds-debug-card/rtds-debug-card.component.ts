import { Component, OnInit, inject, signal, viewChild, DestroyRef, ChangeDetectionStrategy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import Storage from 'src/services/storage.service';
import { EFUSE_TOPICS } from '../../efuses-page.topics';
import { sendConfig } from 'src/api/car-command.api';
import { InfoBackgroundComponent } from 'src/components/info-background/info-background.component';
import SevenSegmentDisplayComponent from '../seven-segment-display/seven-segment-display.component';
import { LockButtonComponent } from '../lock-button/lock-button.component';
import IndicatorLightComponent from '../indicator-light/indicator-light.component';
import { injectFocusAfterRender } from 'src/ui/focus/focus-after-render';
import { cx, tw } from 'src/ui/recipes/tw';
import { legendClass, panelButtonClass, panelGroupClass } from '../../efuses.classes';

/** A one-shot command: sinks while held (:active), 13px legend (#909's control font), 2 × 2 on phones. */
const commandClass = cx(
  panelButtonClass,
  legendClass,
  tw('min-w-37.5 px-5.5 py-3.5 text-ctrl-sm active:translate-y-[3px] max-md:min-w-0 max-md:px-3')
);

/** The four RTDS commands, each in its own colour on a tint (AA on the tint). */
const COMMANDS = [
  { value: 0, label: 'Sound RTDS', class: cx(commandClass, tw('bg-info/10 text-info')) },
  { value: 1, label: 'Cancel RTDS', class: cx(commandClass, tw('bg-accent/15 text-accent-fg')) },
  { value: 2, label: 'Start Reverse', class: cx(commandClass, tw('bg-success/10 text-success')) },
  { value: 3, label: 'Stop Reverse', class: cx(commandClass, tw('bg-danger/10 text-danger')) }
] as const;

/**
 * RTDS Debug: four one-shot commands behind a lock. A command sends only while unlocked, then the card locks
 * again and focus moves to the lock.
 */
@Component({
  selector: 'rtds-debug-card',
  templateUrl: './rtds-debug-card.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  host: { class: 'block' },
  imports: [InfoBackgroundComponent, SevenSegmentDisplayComponent, LockButtonComponent, IndicatorLightComponent]
})
export default class RtdsDebugCardComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private storage = inject(Storage);
  private focusAfterRender = injectFocusAfterRender();
  private lockButton = viewChild.required(LockButtonComponent);

  protected readonly groupClass = cx(panelGroupClass, tw('max-md:grid max-md:grid-cols-2'));
  protected readonly commands = COMMANDS;
  protected readonly displays = [
    { label: 'Pin State', value: () => this.pinState },
    { label: 'Sounding State', value: () => this.soundingState },
    { label: 'Reverse State', value: () => this.reverseState },
    { label: 'Error State', value: () => this.errorState }
  ];

  readonly rtdsTopics = EFUSE_TOPICS.VCU.RTDS;
  readonly echo = EFUSE_TOPICS.VCU.Echo;
  readonly graphTopics = [
    this.rtdsTopics.Pin_State,
    this.rtdsTopics.Sounding_State,
    this.rtdsTopics.Reverse_State,
    this.rtdsTopics.Error_State,
    this.echo.BMS_Shutdown
  ];

  isLocked = signal<boolean>(true);

  pinState = 0;
  soundingState = 0;
  reverseState = 0;
  errorState = 0;
  shutdown = false;

  ngOnInit(): void {
    this.subscribeState(this.rtdsTopics.Pin_State, (value) => (this.pinState = value));
    this.subscribeState(this.rtdsTopics.Sounding_State, (value) => (this.soundingState = value));
    this.subscribeState(this.rtdsTopics.Reverse_State, (value) => (this.reverseState = value));
    this.subscribeState(this.rtdsTopics.Error_State, (value) => (this.errorState = value));
    this.subscribeState(this.echo.BMS_Shutdown, (value) => (this.shutdown = value !== 0));
  }

  onLockButtonClick(): void {
    if (this.isLocked()) {
      this.isLocked.set(false);
      return;
    }

    this.lockControls();
  }

  sendRtdsCommand(value: number): void {
    if (this.isLocked()) return;
    sendConfig('RTDSCommand', [value]).catch((error) => {
      console.error('Failed to send RTDS command', error);
    });
    this.lockControls();
    // The pressed command is disabled under the lock: focus goes to the lock, never to <body>.
    this.focusAfterRender(() => this.lockButton().button().nativeElement);
  }

  formatState(value: number): string {
    if (!Number.isFinite(value)) return '0';
    return Math.round(value).toString().padStart(1, '0');
  }

  private lockControls(): void {
    this.isLocked.set(true);
  }

  private subscribeState(dataType: string, setter: (value: number) => void): void {
    this.storage
      .get(dataType)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        const raw = Number(value.values[0]);
        if (Number.isNaN(raw)) return;
        setter(raw);
      });
  }
}
