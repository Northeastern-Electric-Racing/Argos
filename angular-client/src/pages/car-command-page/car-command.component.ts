import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { ConfirmationService, MessageService } from 'primeng/api';
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

import { Password } from 'primeng/password';
import { FormsModule } from '@angular/forms';
import { ButtonComponent } from '../../components/argos-button/argos-button.component';
import { InputNumber } from 'primeng/inputnumber';
import LoadingPageComponent from 'src/components/loading-page/loading-page.component';
import ErrorPageComponent from 'src/components/error-page/error-page.component';
import TypographyComponent from 'src/components/typography/typography.component';
import SettingToggleComponent from './setting-toggle/setting-toggle.component';
import SettingInputComponent from './setting-input/setting-input.component';
import { MatGridList, MatGridTile } from '@angular/material/grid-list';
import { ConfirmDialog } from 'primeng/confirmdialog';

interface CarCommand {
  dataType: DataType;
  name: string;
  values: number[];
}

@Component({
  selector: 'car-command',
  templateUrl: './car-command.component.html',
  styleUrls: ['./car-command.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [ConfirmationService],
  imports: [
    Password,
    FormsModule,
    ButtonComponent,
    InputNumber,
    LoadingPageComponent,
    ErrorPageComponent,
    TypographyComponent,
    SettingToggleComponent,
    SettingInputComponent,
    MatGridList,
    MatGridTile,
    ConfirmDialog
  ]
})
export default class CarCommandComponent implements OnInit {
  private serverService = inject(APIService);
  private toastService = inject(MessageService);
  private confirmationService = inject(ConfirmationService);

  carCommands = signal<CarCommand[]>([]);
  dataTypesIsLoading = signal(true);
  dataTypesIsError = signal(false);
  dataTypesError = signal<Error | undefined>(undefined);

  isAuthenticated = signal(false);
  enteredPw = '';
  authError = signal<string | undefined>(undefined);

  uploadEnabled = signal<boolean | undefined>(undefined);
  batchTime = signal<number | undefined>(undefined);
  rateLimitMode = signal<number | undefined>(undefined);
  rateLimitTime = signal<number | undefined>(undefined);
  discardPercentage = signal<number | undefined>(undefined);

  settingsIsLoading = signal(true);
  settingsIsError = signal(false);
  settingsError = signal<Error | undefined>(undefined);

  ngOnInit(): void {
    this.queryScyllaSettings();
    this.queryDataTypes();
  }

  private queryScyllaSettings() {
    const settingsResponse = this.serverService.query<ScyllaSettings>(getSettings, { queryKey: ['settings'] });
    settingsResponse.data.subscribe((data) => {
      if (data) {
        this.uploadEnabled.set(!data.data_upload_disabled);
        this.batchTime.set(data.batch_upsert_time);
        this.rateLimitMode.set(data.ratelimit_mode);
        this.rateLimitTime.set(data.static_ratelimit_time);
        this.discardPercentage.set(data.socket_discard_percent);
      }
    });

    settingsResponse.error.subscribe((error) => {
      if (error) {
        this.settingsError.set(error);
        this.settingsIsError.set(true);
      }
    });

    settingsResponse.isLoading.subscribe((isLoading) => {
      this.settingsIsLoading.set(isLoading);
    });
  }

  private queryDataTypes() {
    const dataTypesQueryResponse = this.serverService.query<DataType[]>(getAllDatatypes);
    dataTypesQueryResponse.isLoading.subscribe((isLoading: boolean) => {
      this.dataTypesIsLoading.set(isLoading);
    });
    dataTypesQueryResponse.error.subscribe((error) => {
      if (error) {
        this.dataTypesIsError.set(true);
        this.dataTypesError.set(error);
      }
    });
    dataTypesQueryResponse.data.subscribe((data) => {
      if (data) {
        const commandMap = new Map<string, CarCommand>();
        data
          .filter((item) => item.name.includes('Calypso/Bidir'))
          .forEach((dataType) => {
            const commandName = dataType.name.split('/')[dataType.name.split('/').length - 2];
            const existingCommand = commandMap.get(commandName);
            if (!existingCommand) {
              commandMap.set(commandName, { dataType, values: [0], name: commandName });
            } else {
              commandMap.set(commandName, { ...existingCommand, values: [...existingCommand.values, 0] });
            }
          });
        this.carCommands.set(Array.from(commandMap.values()));
      }
    });
  }

  confirmSendCommand(key: string, values: number[]) {
    this.confirmationService.confirm({
      message: `Send command "${key}" with values [${values.join(', ')}] to the car?`,
      header: 'Confirm Command',
      acceptLabel: 'Send',
      rejectLabel: 'Cancel',
      accept: () => this.sendCarCommand(key, values)
    });
  }

  private sendCarCommand(key: string, values: number[]) {
    const commandQueryResponse = this.serverService.query<string>(() => sendConfig(key, values));
    commandQueryResponse.isLoading.subscribe((isLoading) => {
      this.dataTypesIsLoading.set(isLoading);
    });
    commandQueryResponse.error.subscribe((error) => {
      if (error) {
        this.toastService.add({ severity: 'error', summary: 'Command Failed', detail: error.message });
      }
    });
    commandQueryResponse.data.subscribe((message) => {
      if (message) {
        this.toastService.add({ severity: 'success', summary: 'Success', detail: message });
      }
    });
  }

  authenticatePw = () => {
    this.authError.set(undefined);
    const authenticationQueryResponse = this.serverService.query<string>(() => authenticatePw(this.enteredPw));
    authenticationQueryResponse.isLoading.subscribe((isLoading) => {
      this.dataTypesIsLoading.set(isLoading);
    });
    authenticationQueryResponse.error.subscribe((error) => {
      if (error) {
        this.authError.set('Incorrect password. Please try again.');
        this.isAuthenticated.set(false);
      }
    });
    authenticationQueryResponse.data.subscribe((data) => {
      if (data) {
        this.isAuthenticated.set(true);
      }
    });
  };

  getOptionId = (name: string, index: number) => {
    return `${name}-value-${index}`;
  };

  onUpdateVideosPressed = () => {
    const updateVideoQueryResponse = this.serverService.query(() => updateVideos(), { invalidates: ['videos'] });
    this.toastService.add({
      severity: 'success',
      summary: 'Update Videos',
      detail: 'A request was made for scylla to update its videos, this may take a minute, please refresh in a moment'
    });
    updateVideoQueryResponse.error.subscribe((error) => {
      error && this.toastService.add({ severity: 'error', summary: 'Error', detail: error.message });
    });
  };

  confirmSaveSettings = () => {
    this.confirmationService.confirm({
      message: 'Save all settings changes? This will update the live server configuration.',
      header: 'Confirm Settings Update',
      acceptLabel: 'Save',
      rejectLabel: 'Cancel',
      accept: () => this.onUpdateSettingsPressed()
    });
  };

  private onUpdateSettingsPressed() {
    const uploadEnabled = this.uploadEnabled();
    if (uploadEnabled !== undefined) {
      const response = this.serverService.query(() => toggleUpload(uploadEnabled), { invalidates: ['settings'] });
      response.data.subscribe(() => {
        this.toastService.add({ severity: 'success', summary: 'Successfully Updated Upload Enabled' });
      });
      response.error.subscribe(
        (error) => error && this.toastService.add({ severity: 'error', summary: 'Error', detail: error.message })
      );
    }

    const batchTime = this.batchTime();
    if (batchTime !== undefined) {
      const response = this.serverService.query(() => setBatchTime(batchTime), { invalidates: ['settings'] });
      response.data.subscribe(() => {
        this.toastService.add({ severity: 'success', summary: 'Successfully Updated Batch Time' });
      });
      response.error.subscribe(
        (error) => error && this.toastService.add({ severity: 'error', summary: 'Error', detail: error.message })
      );
    }

    const rateLimitMode = this.rateLimitMode();
    if (rateLimitMode !== undefined) {
      const response = this.serverService.query(() => setRateLimitMode(rateLimitMode), { invalidates: ['settings'] });
      response.data.subscribe(() => {
        this.toastService.add({ severity: 'success', summary: 'Successfully Updated Rate Limit Mode' });
      });
      response.error.subscribe(
        (error) => error && this.toastService.add({ severity: 'error', summary: 'Error', detail: error.message })
      );
    }

    const rateLimitTime = this.rateLimitTime();
    if (rateLimitTime !== undefined) {
      const response = this.serverService.query(() => setRateLimitTime(rateLimitTime), { invalidates: ['settings'] });
      response.data.subscribe(() => {
        this.toastService.add({ severity: 'success', summary: 'Successfully Updated Rate Limit Time' });
      });
      response.error.subscribe(
        (error) => error && this.toastService.add({ severity: 'error', summary: 'Error', detail: error.message })
      );
    }

    const discardPercentage = this.discardPercentage();
    if (discardPercentage !== undefined) {
      const response = this.serverService.query(() => setDiscardPercentage(discardPercentage), {
        invalidates: ['settings']
      });
      response.data.subscribe(() => {
        this.toastService.add({ severity: 'success', summary: 'Successfully Updated Discard Percentage' });
      });
      response.error.subscribe(
        (error) => error && this.toastService.add({ severity: 'error', summary: 'Error', detail: error.message })
      );
    }
  }
}
