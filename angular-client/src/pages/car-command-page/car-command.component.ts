import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { NzModalService } from 'ng-zorro-antd/modal';
import { NotificationAnnouncerService } from 'src/services/notification-announcer.service';
import {
  authenticatePw,
  getSettings,
  sendConfig,
  setBatchTime,
  setDiscardPercentage,
  setRateLimitMode,
  setRateLimitTime,
  toggleUpload
} from 'src/api/car-command.api';
import { getAllDatatypes } from 'src/api/datatype.api';
import { updateVideos } from 'src/api/video.api';
import APIService from 'src/services/api.service';
import { DataType, ScyllaSettings } from 'src/utils/types.utils';
import { groupCarCommands } from 'src/utils/topic.utils';

import { NzInputModule } from 'ng-zorro-antd/input';
import { FormsModule } from '@angular/forms';
import { ButtonComponent } from '../../components/argos-button/argos-button.component';
import LoadingPageComponent from 'src/components/loading-page/loading-page.component';
import ErrorPageComponent from 'src/components/error-page/error-page.component';
import TypographyComponent from 'src/components/typography/typography.component';
import { InfoBackgroundComponent } from 'src/components/info-background/info-background.component';
import SettingToggleComponent from './setting-toggle/setting-toggle.component';
import SettingInputComponent from './setting-input/setting-input.component';
import CommandCardComponent from './command-card/command-card.component';

@Component({
  selector: 'car-command',
  templateUrl: './car-command.component.html',
  styleUrls: ['./car-command.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    NzInputModule,
    FormsModule,
    ButtonComponent,
    LoadingPageComponent,
    ErrorPageComponent,
    TypographyComponent,
    InfoBackgroundComponent,
    SettingToggleComponent,
    SettingInputComponent,
    CommandCardComponent
  ]
})
export default class CarCommandComponent implements OnInit {
  private serverService = inject(APIService);
  private notification = inject(NotificationAnnouncerService);
  private modal = inject(NzModalService);
  private destroyRef = inject(DestroyRef);

  private dataTypesResponse = this.serverService.query<DataType[]>(getAllDatatypes);
  private allDataTypes = toSignal(this.dataTypesResponse.data, { initialValue: [] as DataType[] });
  protected dataTypesIsLoading = toSignal(this.dataTypesResponse.isLoading, { initialValue: true });
  protected dataTypesError = toSignal<Error | null>(this.dataTypesResponse.error, { initialValue: null });

  protected carCommandTopics = computed(() => groupCarCommands(this.allDataTypes() ?? []));

  isAuthenticated = signal(false);
  enteredPw = '';
  authError = signal<string | undefined>(undefined);

  uploadEnabled = signal<boolean | undefined>(undefined);
  batchTime = signal<number | undefined>(undefined);
  rateLimitMode = signal<number | undefined>(undefined);
  rateLimitTime = signal<number | undefined>(undefined);
  discardPercentage = signal<number | undefined>(undefined);

  settingsIsLoading = signal(true);
  settingsError = signal<Error | undefined>(undefined);

  ngOnInit(): void {
    this.queryScyllaSettings();
  }

  private queryScyllaSettings() {
    const settingsResponse = this.serverService.query<ScyllaSettings>(getSettings, { queryKey: ['settings'] });
    settingsResponse.data.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((data) => {
      if (data) {
        this.uploadEnabled.set(!data.data_upload_disabled);
        this.batchTime.set(data.batch_upsert_time);
        this.rateLimitMode.set(data.ratelimit_mode);
        this.rateLimitTime.set(data.static_ratelimit_time);
        this.discardPercentage.set(data.socket_discard_percent);
      }
    });
    settingsResponse.error.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((error) => {
      if (error) this.settingsError.set(error);
    });
    settingsResponse.isLoading.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((isLoading) => {
      this.settingsIsLoading.set(isLoading);
    });
  }

  confirmSendCommand(title: string, value: number) {
    this.modal.confirm({
      nzContent: `Send command "${title}" with value ${value} to the car?`,
      nzTitle: 'Confirm Command',
      nzOkText: 'Send',
      nzCancelText: 'Cancel',
      nzOnOk: () => this.sendCarCommand(title, [value])
    });
  }

  private sendCarCommand(title: string, values: number[]) {
    const commandQueryResponse = this.serverService.query<string>(() => sendConfig(title, values));
    commandQueryResponse.error.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((error) => {
      if (error) this.notification.create('error', 'Command Failed', error.message);
    });
    commandQueryResponse.data.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((message) => {
      if (message) this.notification.create('success', 'Success', message);
    });
  }

  authenticatePw = () => {
    this.authError.set(undefined);
    const authenticationQueryResponse = this.serverService.query<string>(() => authenticatePw(this.enteredPw));
    authenticationQueryResponse.error.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((error) => {
      if (error) {
        this.authError.set('Incorrect password. Please try again.');
        this.isAuthenticated.set(false);
      }
    });
    authenticationQueryResponse.data.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((data) => {
      if (data) this.isAuthenticated.set(true);
    });
  };

  onUpdateVideosPressed = () => {
    const updateVideoQueryResponse = this.serverService.query(() => updateVideos(), { invalidates: ['videos'] });
    this.notification.create(
      'success',
      'Update Videos',
      'A request was made for scylla to update its videos, this may take a minute, please refresh in a moment'
    );
    updateVideoQueryResponse.error.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((error) => {
      if (error) this.notification.create('error', 'Error', error.message);
    });
  };

  confirmSaveSettings = () => {
    this.modal.confirm({
      nzContent: 'Save all settings changes? This will update the live server configuration.',
      nzTitle: 'Confirm Settings Update',
      nzOkText: 'Save',
      nzCancelText: 'Cancel',
      nzOnOk: () => this.onUpdateSettingsPressed()
    });
  };

  private onUpdateSettingsPressed() {
    this.applySetting(this.uploadEnabled(), toggleUpload, 'Successfully Updated Upload Enabled');
    this.applySetting(this.batchTime(), setBatchTime, 'Successfully Updated Batch Time');
    this.applySetting(this.rateLimitMode(), setRateLimitMode, 'Successfully Updated Rate Limit Mode');
    this.applySetting(this.rateLimitTime(), setRateLimitTime, 'Successfully Updated Rate Limit Time');
    this.applySetting(this.discardPercentage(), setDiscardPercentage, 'Successfully Updated Discard Percentage');
  }

  private applySetting<T>(value: T | undefined, apiCall: (v: T) => Promise<Response>, summary: string) {
    if (value === undefined) return;
    const response = this.serverService.query(() => apiCall(value), { invalidates: ['settings'] });
    response.data.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.notification.create('success', summary, '');
    });
    response.error.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((error) => {
      if (error) this.notification.create('error', 'Error', error.message);
    });
  }
}
