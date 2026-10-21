import { Component, OnInit, DestroyRef, ChangeDetectionStrategy, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DynamicFormField, FormTemplateComponent } from '../form-template/form-template.component';
import { inject } from '@angular/core';
import { Run } from 'src/utils/types.utils';
import { getAllRuns, getRunById } from 'src/api/run.api';
import { NzModalRef } from 'ng-zorro-antd/modal';
import APIService from 'src/services/api.service';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { FormGroup } from '@angular/forms';
import { updateRun } from 'src/api/run.api';
import { DropdownOption, SelectorConfig, SelectDropdownComponent } from '../select-dropdown/select-dropdown.component';
import LoadingPageComponent from '../loading-page/loading-page.component';

@Component({
  selector: 'run-form',
  templateUrl: './run-form.component.html',
  styleUrl: './run-form.component.css',
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [SelectDropdownComponent, FormTemplateComponent, LoadingPageComponent]
})
export class RunFormComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  public apiService = inject(APIService);
  private notification = inject(NzNotificationService);
  private ref = inject(NzModalRef);
  // Signals, since the modal's OnPush container doesn't re-check this content when a subscription sets a plain field.
  templateReady = signal(false);
  selectedRun: Run | undefined = undefined;
  allRuns: Run[] = [];
  runsLoaded = false;

  // Run selector configuration
  selectorOptions: DropdownOption[] = [];
  selectorConfig = signal<SelectorConfig>({
    options: this.selectorOptions,
    placeholder: 'Select Run'
  });

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

  inputFields = signal<DynamicFormField[]>([this.locationName, this.driverName, this.notes]);

  constructor() {
    // afterClose fires once the modal's content is torn down and then completes, so it can't be tied to destroyRef.
    // eslint-disable-next-line rxjs-angular-x/prefer-takeuntil -- one-shot dialog result
    this.ref.afterClose.subscribe((form: FormGroup | undefined) => {
      if (!form) return; // closed without submitting
      if (this.selectedRun === undefined) {
        this.notification.create('error', 'Error', 'No run selected');
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

    this.templateReady.set(false);
    const runsQueryResponse = this.apiService.query<Run[]>(() => getAllRuns());

    runsQueryResponse.isLoading.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((isLoading: boolean) => {
      this.templateReady.set(!isLoading);
    });

    runsQueryResponse.error.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((error) => {
      if (error) this.notification.create('error', 'Error', error.message);
      if (error) {
        console.log('loading error: ', error);
      }
    });

    runsQueryResponse.data.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((data) => {
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
          this.selectorConfig.update((config) => ({ ...config, defaultValue: this.formatRunInfo(latestRun) }));
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
    this.selectorConfig.set({
      options: this.selectorOptions,
      placeholder: 'Select Run',
      defaultValue: this.selectedRun ? this.formatRunInfo(this.selectedRun) : undefined
    });
  };

  loadRunById = (runId: number) => {
    // First check if we already have the run data in allRuns
    const existingRun = this.allRuns.find((run) => run.id === runId);
    if (existingRun) {
      this.updateFormFields(existingRun);
      this.selectedRun = existingRun;

      // Update selector config with new default value
      this.selectorConfig.update((config) => ({ ...config, defaultValue: this.formatRunInfo(existingRun) }));
      return;
    }

    // If not found locally, fetch from API
    this.templateReady.set(false);
    const runQueryResponse = this.apiService.query<Run>(() => getRunById(runId));

    runQueryResponse.isLoading.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((isLoading: boolean) => {
      this.templateReady.set(!isLoading);
    });

    runQueryResponse.error.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((error) => {
      if (error) this.notification.create('error', 'Error', error.message);
      if (error) {
        console.log('loading error: ', error);
      }
    });

    runQueryResponse.data.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((run) => {
      if (run) {
        this.updateFormFields(run);
        this.selectedRun = run;

        // Update selector config with new default value
        this.selectorConfig.update((config) => ({ ...config, defaultValue: this.formatRunInfo(run) }));
      }
    });
  };

  updateFormFields = (run: Run) => {
    this.locationName.optionValue = run.locationName;
    this.driverName.optionValue = run.driverName;
    this.notes.optionValue = run.notes;
    this.inputFields.set([this.locationName, this.driverName, this.notes]);
  };

  formatRunInfo = (run: Run) => {
    const date = new Date(run.time);
    return `Run #${run.id} - ${date.toLocaleTimeString()}, ${date.toLocaleDateString()}`;
  };
}
