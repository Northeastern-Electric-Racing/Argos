import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { MessageService } from 'primeng/api';
import { Subscription } from 'rxjs';
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
import Storage from 'src/services/storage.service';
import { DataType, ScyllaSettings } from 'src/utils/types.utils';

import { Password } from 'primeng/password';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { ButtonComponent } from '../../components/argos-button/argos-button.component';
import { InputNumber } from 'primeng/inputnumber';
import LoadingPageComponent from 'src/components/loading-page/loading-page.component';
import ErrorPageComponent from 'src/components/error-page/error-page.component';
import TypographyComponent from 'src/components/typography/typography.component';
import SettingToggleComponent from './setting-toggle/setting-toggle.component';
import SettingInputComponent from './setting-input/setting-input.component';
import { CommonModule } from '@angular/common';
import { MatGridList, MatGridTile } from '@angular/material/grid-list';

interface CarCommand {
  dataTypes: DataType[];
  name: string;
  values: number[];
  currentValues: string[];
}

@Component({
  selector: 'car-command',
  templateUrl: './car-command.component.html',
  styleUrls: ['./car-command.component.css'],
  standalone: true,
  imports: [
    Password,
    ReactiveFormsModule,
    FormsModule,
    ButtonComponent,
    InputNumber,
    LoadingPageComponent,
    ErrorPageComponent,
    TypographyComponent,
    SettingToggleComponent,
    SettingInputComponent,
    CommonModule,
    MatGridList,
    MatGridTile
  ]
})
export default class CarCommandComponent implements OnInit, OnDestroy {
  private serverService = inject(APIService);
  private toastService = inject(MessageService);
  private storage = inject(Storage);
  private subscriptions: Subscription[] = [];

  carCommands: CarCommand[] = [];
  dataTypesIsLoading = true;
  dataTypesIsError = false;
  dataTypesError?: Error;

  isAuthenticated = false;
  enteredPw = '';

  uploadEnabled?: boolean = undefined;
  batchTime?: number = undefined;
  rateLimitMode?: number = undefined;
  rateLimitTime?: number = undefined;
  discardPercentage?: number = undefined;

  settingsIsLoading = true;
  settingsIsError = false;
  settingsError?: Error;

  ngOnInit(): void {
    this.queryScyllaSettings();
    this.queryDataTypes();
  }

  private queryScyllaSettings() {
    const settingsResponse = this.serverService.query<ScyllaSettings>(getSettings, { queryKey: ['settings'] });
    settingsResponse.data.subscribe((data) => {
      if (data) {
        this.uploadEnabled = !data.data_upload_disabled;
        this.batchTime = data.batch_upsert_time;
        this.rateLimitMode = data.ratelimit_mode;
        this.rateLimitTime = data.static_ratelimit_time;
        this.discardPercentage = data.socket_discard_percent;
      }
    });

    settingsResponse.error.subscribe((error) => {
      if (error) {
        this.settingsError = error;
        this.settingsIsError = true;
      }
    });

    settingsResponse.isLoading.subscribe((isLoading) => {
      this.settingsIsLoading = isLoading;
    });
  }

  /**
   * Queries the datatypes from the server.
   */
  private queryDataTypes() {
    const dataTypesQueryResponse = this.serverService.query<DataType[]>(getAllDatatypes);
    dataTypesQueryResponse.isLoading.subscribe((isLoading: boolean) => {
      this.dataTypesIsLoading = isLoading;
    });
    dataTypesQueryResponse.error.subscribe((error) => {
      if (error) {
        this.dataTypesIsError = true;
        this.dataTypesError = error;
      }
    });
    dataTypesQueryResponse.data.subscribe((data) => {
      if (data) {
        const commandMap = new Map<string, CarCommand>();
        data
          .filter((data) => data.name.includes('Calypso/Bidir'))
          .forEach((dataType) => {
            const commandName = dataType.name.split('/')[dataType.name.split('/').length - 2];
            const existingCommand = commandMap.get(commandName);
            if (!existingCommand) {
              commandMap.set(commandName, {
                dataTypes: [dataType],
                values: [0],
                name: commandName,
                currentValues: ['--']
              });
            } else {
              commandMap.set(commandName, {
                ...existingCommand,
                dataTypes: [...existingCommand.dataTypes, dataType],
                values: [...existingCommand.values, 0],
                currentValues: [...existingCommand.currentValues, '--']
              });
            }
          });
        this.carCommands = Array.from(commandMap.values());
        this.subscribeToCurrentValues();
      }
    });
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }

  private subscribeToCurrentValues() {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
    this.subscriptions = [];
    this.carCommands.forEach((command) => {
      command.dataTypes.forEach((dataType, i) => {
        this.subscriptions.push(
          this.storage.get(dataType.name).subscribe((value) => {
            const [currentValue] = value.values;
            command.currentValues[i] = currentValue;
          })
        );
      });
    });
  }

  sendCarCommand(key: string, values: number[]) {
    const commandQueryResponse = this.serverService.query<string>(() => sendConfig(key, values));
    commandQueryResponse.isLoading.subscribe((isLoading) => {
      this.dataTypesIsLoading = isLoading;
    });
    commandQueryResponse.error.subscribe((error) => {
      if (error) {
        this.dataTypesIsError = true;
        this.dataTypesError = error;
      }
    });
    commandQueryResponse.data.subscribe((message) => {
      if (message) {
        this.toastService.add({ severity: 'success', summary: 'Success', detail: message });
      }
    });
  }

  authenticatePw = () => {
    const authenticationQueryResponse = this.serverService.query<string>(() => authenticatePw(this.enteredPw));
    authenticationQueryResponse.isLoading.subscribe((isLoading) => {
      this.dataTypesIsLoading = isLoading;
    });
    authenticationQueryResponse.error.subscribe((error) => {
      if (error) {
        this.dataTypesIsError = true;
        this.dataTypesError = error;
        this.isAuthenticated = false;
      }
    });
    authenticationQueryResponse.data.subscribe(() => {
      this.isAuthenticated = true;
    });
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

  onUpdateSettingsPressed = () => {
    if (this.uploadEnabled !== undefined) {
      const response = this.serverService.query(() => toggleUpload(this.uploadEnabled!), { invalidates: ['settings'] });
      response.data.subscribe(() => {
        this.toastService.add({ severity: 'success', summary: 'Successfully Updated Upload Enabled' });
      });
      response.error.subscribe(
        (error) => error && this.toastService.add({ severity: 'error', summary: 'Error', detail: error.message })
      );
    }
    if (this.batchTime !== undefined) {
      const response = this.serverService.query(() => setBatchTime(this.batchTime!), { invalidates: ['settings'] });
      response.data.subscribe(() => {
        this.toastService.add({ severity: 'success', summary: 'Successfully Updated Batch Time' });
      });
      response.error.subscribe(
        (error) => error && this.toastService.add({ severity: 'error', summary: 'Error', detail: error.message })
      );
    }
    if (this.rateLimitMode !== undefined) {
      const response = this.serverService.query(() => setRateLimitMode(this.rateLimitMode!), { invalidates: ['settings'] });
      response.data.subscribe(() => {
        this.toastService.add({ severity: 'success', summary: 'Successfully Updated Rate Limit Mode' });
      });
      response.error.subscribe(
        (error) => error && this.toastService.add({ severity: 'error', summary: 'Error', detail: error.message })
      );
    }
    if (this.rateLimitTime !== undefined) {
      const response = this.serverService.query(() => setRateLimitTime(this.rateLimitTime!), { invalidates: ['settings'] });
      response.data.subscribe(() => {
        this.toastService.add({ severity: 'success', summary: 'Successfully Updated Rate Limit Time' });
      });
      response.error.subscribe(
        (error) => error && this.toastService.add({ severity: 'error', summary: 'Error', detail: error.message })
      );
    }
    if (this.discardPercentage !== undefined) {
      const response = this.serverService.query(() => setDiscardPercentage(this.discardPercentage!), {
        invalidates: ['settings']
      });
      response.data.subscribe(() => {
        this.toastService.add({ severity: 'success', summary: 'Successfully Updated Discard Percentage' });
      });
      response.error.subscribe(
        (error) => error && this.toastService.add({ severity: 'error', summary: 'Error', detail: error.message })
      );
    }
  };
}
