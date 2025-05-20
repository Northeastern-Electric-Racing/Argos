import { Component, inject, OnInit } from '@angular/core';
import { MessageService } from 'primeng/api';
import { authenticatePw, sendConfig } from 'src/api/car-command.api';
import { getAllDatatypes } from 'src/api/datatype.api';
import { updateVideos } from 'src/api/video.api';
import APIService from 'src/services/api.service';
import { DataType } from 'src/utils/types.utils';


import { Password } from 'primeng/password';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { ButtonComponent } from '../../components/argos-button/argos-button.component';
import { InputNumber } from 'primeng/inputnumber';
import LoadingPageComponent from 'src/components/loading-page/loading-page.component';
import ErrorPageComponent from 'src/components/error-page/error-page.component';
import TypographyComponent from 'src/components/typography/typography.component';

interface CarCommand {
  dataType: DataType;
  name: string;
  values: number[];
}

@Component({
    selector: 'car-command',
    templateUrl: './car-command.component.html',
    styleUrls: ['./car-command.component.css'],
    standalone: true,
    imports: [ Password, ReactiveFormsModule, FormsModule, ButtonComponent, InputNumber, LoadingPageComponent, ErrorPageComponent, TypographyComponent]
})
export default class CarCommandComponent implements OnInit {
  private serverService = inject(APIService);
  private toastService = inject(MessageService);

  carCommands: CarCommand[] = [];
  isLoading = true;
  isError = false;
  error?: Error;

  isAuthenticated = false;
  enteredPw = '';

  ngOnInit(): void {
    this.queryDataTypes();
  }

  /**
   * Queries the datatypes from the server.
   */
  private queryDataTypes() {
    const dataTypesQueryResponse = this.serverService.query<DataType[]>(getAllDatatypes);
    dataTypesQueryResponse.isLoading.subscribe((isLoading: boolean) => {
      this.isLoading = isLoading;
    });
    dataTypesQueryResponse.error.subscribe((error) => {
      if (error) {
        this.isError = true;
        this.error = error;
      }
    });
    dataTypesQueryResponse.data.subscribe((data) => {
      if (data) {
        const commandMap = new Map<string, CarCommand>();
        data
          .filter((data) => data.name.includes('Calypso/Bidir'))
          .forEach((dataType) => {
            console.log(dataType);
            const commandName = dataType.name.split('/')[dataType.name.split('/').length - 2];
            console.log(commandName);
            const existingCommand = commandMap.get(commandName);
            if (!existingCommand) {
              commandMap.set(commandName, { dataType, values: [0], name: commandName });
            } else {
              commandMap.set(commandName, { ...existingCommand, values: [...existingCommand.values, 0] });
            }
          });
        this.carCommands = Array.from(commandMap.values());
      }
    });
  }

  sendCarCommand(key: string, values: number[]) {
    const commandQueryResponse = this.serverService.query<string>(() => sendConfig(key, values));
    commandQueryResponse.isLoading.subscribe((isLoading) => {
      this.isLoading = isLoading;
    });
    commandQueryResponse.error.subscribe((error) => {
      if (error) {
        this.isError = true;
        this.error = error;
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
      this.isLoading = isLoading;
    });
    authenticationQueryResponse.error.subscribe((error) => {
      if (error) {
        this.isError = true;
        this.error = error;
        this.isAuthenticated = false;
      }
    });
    authenticationQueryResponse.data.subscribe(() => {
      this.isAuthenticated = true;
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
}
