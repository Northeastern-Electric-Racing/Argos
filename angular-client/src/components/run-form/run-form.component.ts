import { Component } from '@angular/core';
import { DynamicFormField } from '../form-template/form-template.component';
import { inject } from '@angular/core';
import { Run } from 'src/utils/types.utils';
import { getLatestRun } from 'src/api/run.api';
import { DialogService, DynamicDialogRef } from 'primeng/dynamicdialog';
import APIService from 'src/services/api.service';
import { MessageService } from 'primeng/api';
import { FormGroup } from '@angular/forms';
import { updateRun } from 'src/api/run.api';

@Component({
  selector: 'run-form',
  templateUrl: './run-form.component.html',
  styleUrl: './run-form.component.css'
})
export class RunFormComponent {
  private dialogService = inject(DialogService);
  public serverService = inject(APIService);
  private messageService = inject(MessageService);
  private ref = inject(DynamicDialogRef);

  runId: DynamicFormField = {
    name: 'runId',
    label: 'Run ID',
    type: 'number',
    placeholder: 'Run ID',
    optionValue: 'Boston',
    required: true,
    disabled: false
  };

  locationName: DynamicFormField = {
    name: 'locationName',
    label: 'Location Name',
    type: 'text',
    placeholder: 'Enter Location Name',
    optionValue: 'Boston',
    required: true,
    minLength: 3,
    maxLength: 50,
    disabled: false
  };

  driverName: DynamicFormField = {
    name: 'driverName',
    label: 'Driver Name',
    type: 'text',
    placeholder: 'Enter Driver Name',
    required: true,
    maxLength: 50,
    disabled: false
  };

  time: DynamicFormField = {
    name: 'time',
    label: 'Time',
    type: 'date',
    placeholder: 'Enter Time',
    required: true,
    disabled: false
  };

  notes: DynamicFormField = {
    name: 'notes',
    label: 'Notes',
    type: 'text',
    placeholder: 'Enter Notes',
    required: true,
    disabled: false
  };

  inputFields: DynamicFormField[] = [
    this.runId,
    this.locationName,
    this.driverName,
    this.notes

    // example field
    // {
    //   name: 'full name',
    //   label: 'Full Name',
    //   type: 'text',
    //   placeholder: 'Enter Full Name',
    //   required: true,
    //   minLength: 3,
    //   maxLength: 40,
    //   disabled: false
    // },
  ];

  constructor() {
    this.renderTemplate();

    this.ref.onClose.subscribe((form: FormGroup) => {
      console.log('form template closed');

      updateRun(
        form.controls['runId'].value,
        form.controls['driverName'].value,
        form.controls['locationName'].value,
        form.controls['notes'].value,
      );

      console.log("driver:", form.controls['driverName'].value)
    });
  }

  renderTemplate = () => {
    // query for the most recent run to get the location name
    const runsQueryResponse = this.serverService.query<Run>(() => getLatestRun());

    this.locationName.optionValue = 'data';

    runsQueryResponse.isLoading.subscribe((isLoading: boolean) => {
      console.log('Is loading: ', isLoading);
    });
    runsQueryResponse.error.subscribe((error) => {
      error && this.messageService.add({ severity: 'error', summary: 'Error', detail: error.message });
      if (error) {
        console.log('loading error: ', error);
      }
    });

    runsQueryResponse.data.subscribe((data) => {
      const run = data;
      this.locationName.optionValue = run?.locationName;
      this.driverName.optionValue = run?.driverName;
      this.notes.optionValue = run?.notes;

      console.log('run id: ', data?.id);
      console.log('location: ', data?.locationName);
    });
  };
}
