import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import Storage from '../../services/storage.service';
import APIService from 'src/services/api.service';
import { DataType } from 'src/utils/types.utils';
import { getAllDatatypes } from 'src/api/datatype.api';
import { DropdownOption } from 'src/components/select-dropdown/select-dropdown.component';
import { TopicService } from 'src/services/topic.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-graph-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './graph-page.component.html'
})
export class GraphPageComponent implements OnInit {
  private storageService = inject(Storage);
  private serverService = inject(APIService);
  private topicService = inject(TopicService);

  dropDownOptions: DropdownOption[] = [];
  selectedDataType: DataType | undefined;
  private subscriptions: Subscription[] = [];

  // Signals (Angular 18) instead of BehaviorSubject for local UI state
  isLive = signal(true);
  resetKey = signal(0);
  selectedRunId = signal<number | undefined>(undefined);

  // Observables from Storage service
  runs$ = this.storageService.get('runs');
  currentRunId$ = this.storageService.getCurrentRunId();

  // Observable from Topic service
  selectedTopics$ = this.topicService.getSelectedTopics();

  ngOnInit() {
    // Sync the signal with the BehaviorSubject
    this.subscriptions.push(
      this.currentRunId$.subscribe((id) => {
        this.selectedRunId.set(id);
      })
    );

    this.queryDataTypes();

    // Initialize selected topics if there are any stored
    this.subscriptions.push(
      this.selectedTopics$.subscribe((topics) => {
        if (topics.length > 0 && !this.selectedDataType) {
          const [firstTopic] = topics;
          this.selectedDataType = firstTopic;
        }
      })
    );
  }

  ngOnDestroy() {
    this.subscriptions.forEach((sub) => {
      if (!sub.closed) {
        sub.unsubscribe();
      }
    });
  }

  /** Toggles live-view */
  toggleMode() {
    this.isLive.update((v) => !v);
  }

  /** Force refresh */
  reset() {
    this.resetKey.update((k) => k + 1);
  }

  /** Update the current run ID in the storage service */
  updateRunId(id: number | undefined) {
    this.storageService.setCurrentRunId(id);
  }

  /**
   * Queries the datatypes from the server.
   */
  private queryDataTypes() {
    const dataTypesQueryResponse = this.serverService.query<DataType[]>(getAllDatatypes);
    dataTypesQueryResponse.isLoading.subscribe((isLoading: boolean) => {
      console.log('Loading data types:', isLoading);
    });
    dataTypesQueryResponse.error.subscribe((error) => {
      if (error) {
        console.error('Error loading datatypes:', error);
      }
    });
    dataTypesQueryResponse.data.subscribe((data) => {
      if (data) {
        // all data types formatted as dropdown options, with a lambda to set the selected data type
        this.dropDownOptions = data.map((dataType) => ({
          name: dataType.name,
          function: () => {
            this.selectedDataType = dataType;
            this.topicService.setSelectedTopics([dataType]);
            console.log('Selected data type:', dataType);
          }
        }));
      }
    });
  }

  /**
   * Add the selected data type to the selected topics
   */
  addSelectedTopic() {
    if (this.selectedDataType) {
      this.topicService.addTopic(this.selectedDataType);
    }
  }

  /**
   * Remove a topic from selected topics
   */
  removeTopic(topic: DataType) {
    this.topicService.removeTopic(topic);
  }

  /**
   * Clear all selected topics
   */
  clearTopics() {
    this.topicService.clearTopics();
  }
}
