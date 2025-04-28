import { Component, OnInit } from '@angular/core';
import { DynamicFormField } from '../form-template/form-template.component';
import { inject } from '@angular/core';
import { Run } from 'src/utils/types.utils';
import { getAllRuns, getRunById } from 'src/api/run.api';
import { DynamicDialogRef } from 'primeng/dynamicdialog';
import APIService from 'src/services/api.service';
import { MessageService } from 'primeng/api';
import { FormGroup } from '@angular/forms';
import { updateRun } from 'src/api/run.api';
import { DropdownOption, SelectorConfig } from '../select-dropdown/select-dropdown.component';

@Component({
  selector: 'run-form',
  templateUrl: './run-form.component.html',
  styleUrl: './run-form.component.css'
})
export class RunFormComponent implements OnInit {
  public apiService = inject(APIService);
  private messageService = inject(MessageService);
  private ref = inject(DynamicDialogRef);
  templateReady = false;
  selectedRun: Run | undefined = undefined;
  allRuns: Run[] = [];
  runsLoaded = false;

  // Run selector configuration
  selectorOptions: DropdownOption[] = [];
  selectorConfig: SelectorConfig = {
    options: this.selectorOptions,
    placeholder: 'Select Run'
  };

  locationName: DynamicFormField = {
    name: 'locationName',
    label: 'Location Name',
    type: 'text',
    placeholder: 'Enter Location Name',
    maxLength: 50,
    required: false,
    disabled: false
  };

  driverName: DynamicFormField = {
    name: 'driverName',
    label: 'Driver Name',
    type: 'text',
    placeholder: 'Enter Driver Name',
    required: false,
    maxLength: 50,
    disabled: false
  };

  notes: DynamicFormField = {
    name: 'notes',
    label: 'Notes',
    type: 'text',
    placeholder: 'Enter Notes',
    required: false,
    disabled: false
  };

  inputFields: DynamicFormField[] = [this.locationName, this.driverName, this.notes];

  constructor() {
    this.ref.onClose.subscribe((form: FormGroup) => {
      if (this.selectedRun === undefined) {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No run selected' });
        return;
      }
      updateRun(
        this.selectedRun.id,
        form.controls['driverName'].value,
        form.controls['locationName'].value,
        form.controls['notes'].value
      );
    });
  }

  ngOnInit() {
    // Load runs only once when component initializes
    this.loadAllRuns();
  }

  loadAllRuns = () => {
    if (this.runsLoaded) return;

    this.templateReady = false;
    const runsQueryResponse = this.apiService.query<Run[]>(() => getAllRuns());

    runsQueryResponse.isLoading.subscribe((isLoading: boolean) => {
      this.templateReady = !isLoading;
    });

    runsQueryResponse.error.subscribe((error) => {
      error && this.messageService.add({ severity: 'error', summary: 'Error', detail: error.message });
      if (error) {
        console.log('loading error: ', error);
      }
    });

    runsQueryResponse.data.subscribe((data) => {
      if (data) {
        this.allRuns = data;
        this.runsLoaded = true;
        this.updateRunSelectorOptions();

        // After loading all runs, load the latest run (last item in the array)
        if (data.length > 0) {
          const latestRun = data[data.length - 1]; // Get the last element as latest run
          this.updateFormFields(latestRun);
          this.selectedRun = latestRun;

          // Update selector config with default value
          this.selectorConfig = {
            ...this.selectorConfig,
            defaultValue: this.formatRunInfo(latestRun)
          };
        }
      }
    });
  };

  updateRunSelectorOptions = () => {
    // Clear existing options
    this.selectorOptions = [];

    // Add options for each run
    this.allRuns.forEach((run) => {
      this.selectorOptions.push({
        name: this.formatRunInfo(run),
        function: () => {
          this.loadRunById(run.id);
        }
      });
    });

    // Update the selector config with options and default value if selected run exists
    this.selectorConfig = {
      options: this.selectorOptions,
      placeholder: 'Select Run',
      defaultValue: this.selectedRun ? this.formatRunInfo(this.selectedRun) : undefined
    };
  };

  loadRunById = (runId: number) => {
    // First check if we already have the run data in allRuns
    const existingRun = this.allRuns.find((run) => run.id === runId);
    if (existingRun) {
      this.updateFormFields(existingRun);
      this.selectedRun = existingRun;

      // Update selector config with new default value
      this.selectorConfig = {
        ...this.selectorConfig,
        defaultValue: this.formatRunInfo(existingRun)
      };
      return;
    }

    // If not found locally, fetch from API
    this.templateReady = false;
    const runQueryResponse = this.apiService.query<Run>(() => getRunById(runId));

    runQueryResponse.isLoading.subscribe((isLoading: boolean) => {
      this.templateReady = !isLoading;
    });

    runQueryResponse.error.subscribe((error) => {
      error && this.messageService.add({ severity: 'error', summary: 'Error', detail: error.message });
      if (error) {
        console.log('loading error: ', error);
      }
    });

    runQueryResponse.data.subscribe((run) => {
      if (run) {
        this.updateFormFields(run);
        this.selectedRun = run;

        // Update selector config with new default value
        this.selectorConfig = {
          ...this.selectorConfig,
          defaultValue: this.formatRunInfo(run)
        };
      }
    });
  };

  updateFormFields = (run: Run) => {
    this.locationName.optionValue = run.locationName;
    this.driverName.optionValue = run.driverName;
    this.notes.optionValue = run.notes;
    this.inputFields = [this.locationName, this.driverName, this.notes];
  };

  formatRunInfo = (run: Run) => {
    const date = new Date(run.time);
    return `Run #${run.id} - ${date.toLocaleTimeString()}, ${date.toLocaleDateString()}`;
  };
}
