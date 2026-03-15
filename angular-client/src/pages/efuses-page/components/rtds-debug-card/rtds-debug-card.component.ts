import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { Subscription } from 'rxjs';
import Storage from 'src/services/storage.service';
import { DataTypeEnum } from 'src/data-type.enum';
import { sendConfig } from 'src/api/car-command.api';
import { InfoBackgroundComponent } from 'src/components/info-background/info-background.component';
import VStackComponent from 'src/components/vstack/vstack.component';
import SevenSegmentDisplayComponent from '../seven-segment-display/seven-segment-display.component';
import { LockButtonComponent } from '../lock-button/lock-button.component';

@Component({
  selector: 'rtds-debug-card',
  templateUrl: './rtds-debug-card.component.html',
  styleUrls: ['./rtds-debug-card.component.css'],
  standalone: true,
  imports: [InfoBackgroundComponent, VStackComponent, SevenSegmentDisplayComponent, LockButtonComponent]
})
export default class RtdsDebugCardComponent implements OnInit, OnDestroy {
  private storage = inject(Storage);
  private subscriptions: Subscription[] = [];

  DataTypeEnum = DataTypeEnum;

  isLocked = signal<boolean>(true);

  pinState = 0;
  soundingState = 0;
  reverseState = 0;
  errorState = 0;

  ngOnInit(): void {
    this.subscribeState(DataTypeEnum.VCU_RTDS_PIN_STATE, (value) => (this.pinState = value));
    this.subscribeState(DataTypeEnum.VCU_RTDS_SOUNDING_STATE, (value) => (this.soundingState = value));
    this.subscribeState(DataTypeEnum.VCU_RTDS_REVERSE_STATE, (value) => (this.reverseState = value));
    this.subscribeState(DataTypeEnum.VCU_RTDS_ERROR_STATE, (value) => (this.errorState = value));
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
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
  }

  formatState(value: number): string {
    if (!Number.isFinite(value)) return '0';
    return Math.round(value).toString().padStart(1, '0');
  }

  private lockControls(): void {
    this.isLocked.set(true);
  }

  private subscribeState(dataType: DataTypeEnum, setter: (value: number) => void): void {
    this.subscriptions.push(
      this.storage.get(dataType).subscribe((value) => {
        const raw = Number(value.values[0]);
        if (Number.isNaN(raw)) return;
        setter(raw);
      })
    );
  }
}
