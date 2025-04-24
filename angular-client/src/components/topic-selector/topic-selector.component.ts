import { Component, EventEmitter, Input, OnDestroy, OnInit, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { TopicService } from 'src/services/topic.service';
import { DataType } from 'src/utils/types.utils';
import { ButtonModule } from 'primeng/button';
import { ChipModule } from 'primeng/chip';
import { TagModule } from 'primeng/tag';

@Component({
  selector: 'app-topic-selector',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonModule, ChipModule, TagModule],
  template: `
    <div class="topic-selector">
      <h3>Available Topics</h3>
      <div class="topic-chips">
        <div class="topic-chip-container">
          <div
            *ngFor="let topic of availableTopics"
            class="topic-chip"
            [class.selected]="isSelected(topic)"
            (click)="onTopicClick(topic)"
          >
            <p-tag [value]="topic.name" [severity]="isSelected(topic) ? 'success' : 'info'" [rounded]="true">
              <ng-template pTemplate>
                {{ topic.name }}
                <span class="unit" *ngIf="topic.unit">({{ topic.unit }})</span>
              </ng-template>
            </p-tag>
          </div>
        </div>
      </div>

      <div class="selected-topics" *ngIf="allowMultiple">
        <h4>Selected Topics</h4>
        <div class="selected-list">
          <div *ngFor="let topic of selectedTopics" class="selected-topic-item">
            <span>{{ topic.name }}</span>
            <p-button
              icon="pi pi-times"
              styleClass="p-button-rounded p-button-danger p-button-text"
              (click)="removeTopic(topic)"
            ></p-button>
          </div>
        </div>
        <p-button
          *ngIf="selectedTopics.length > 0"
          label="Clear All"
          icon="pi pi-trash"
          styleClass="p-button-danger"
          (click)="clearTopics()"
        ></p-button>
      </div>
    </div>
  `,
  styles: `
    .topic-selector {
      padding: 1rem;
    }
    .topic-chips {
      margin-bottom: 1rem;
    }
    .topic-chip-container {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }
    .topic-chip {
      cursor: pointer;
      transition: transform 0.1s ease;
    }
    .topic-chip:hover {
      transform: scale(1.05);
    }
    .topic-chip.selected {
      transform: scale(1.05);
    }
    .selected-topics {
      margin-top: 1rem;
    }
    .selected-topic-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.5rem;
      margin-bottom: 0.25rem;
      background-color: rgba(0, 0, 0, 0.05);
      border-radius: 4px;
    }
    .unit {
      opacity: 0.7;
      font-size: 0.8em;
      margin-left: 4px;
    }
    .selected-list {
      margin-bottom: 1rem;
    }
  `
})
export class TopicSelectorComponent implements OnInit, OnDestroy {
  @Input() availableTopics: DataType[] = [];
  @Input() allowMultiple = true;

  @Output() topicSelected = new EventEmitter<DataType>();
  @Output() topicsChanged = new EventEmitter<DataType[]>();

  private topicService = inject(TopicService);
  private subscriptions: Subscription[] = [];

  selectedTopics: DataType[] = [];

  ngOnInit(): void {
    // Subscribe to topic changes
    this.subscriptions.push(
      this.topicService.getSelectedTopics().subscribe((topics) => {
        this.selectedTopics = topics;
        this.topicsChanged.emit(topics);
      })
    );

    if (!this.allowMultiple) {
      this.subscriptions.push(
        this.topicService.getCurrentTopic().subscribe((topic) => {
          if (topic) {
            this.topicSelected.emit(topic);
          }
        })
      );
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }

  isSelected(topic: DataType): boolean {
    if (!this.allowMultiple) {
      const current = this.topicService.getCurrentTopicValue();
      return current ? current.name === topic.name : false;
    }
    return this.selectedTopics.some((t) => t.name === topic.name);
  }

  onTopicClick(topic: DataType): void {
    if (!this.allowMultiple) {
      // Single selection mode
      this.topicService.setCurrentTopic(topic);
      this.topicSelected.emit(topic);
    } else {
      // Multi-selection mode
      const isSelected = this.isSelected(topic);
      if (isSelected) {
        this.topicService.removeTopic(topic);
      } else {
        this.topicService.addTopic(topic);
      }
    }
  }

  removeTopic(topic: DataType): void {
    this.topicService.removeTopic(topic);
  }

  clearTopics(): void {
    this.topicService.clearTopics();
  }
}
