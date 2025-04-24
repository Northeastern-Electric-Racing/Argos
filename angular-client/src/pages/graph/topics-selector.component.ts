import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MultiSelectModule } from 'primeng/multiselect';
import { ButtonModule } from 'primeng/button';
import { Router } from '@angular/router';
import Storage from '../../services/storage.service';
import { DataValue } from 'src/utils/socket.utils';

@Component({
  selector: 'app-topics-selector',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, MultiSelectModule, ButtonModule],
  template: `
    <div class="card p-4 m-3">
      <h3>Select Topics for Telemetry Graph</h3>

      <div class="field mb-4">
        <p-multiSelect
          [options]="allTopics()"
          optionLabel="name"
          optionValue="key"
          [ngModel]="selected()"
          (ngModelChange)="updateSelected($event)"
          styleClass="w-full"
          [filter]="true"
          selectedItemsLabel="{0} topics selected"
          placeholder="Search and select topics"
        >
        </p-multiSelect>
      </div>

      <div class="flex justify-content-end gap-2">
        <button pButton label="Cancel" (click)="cancel()" class="p-button-secondary"></button>
        <button pButton label="Save" (click)="save()" class="p-button-primary"></button>
      </div>
    </div>
  `
})
export class TopicsSelectorComponent implements OnInit {
  private store = inject(Storage);
  private router = inject(Router);

  // Using Angular 18 signals for local state
  allTopics = signal<{ key: string; name: string; unit: string }[]>([]);
  selected = signal<string[]>([]);

  ngOnInit() {
    // Load available topics - in a real implementation, this would come from your data service
    // For now, we'll create some sample topics
    this.allTopics.set([
      { key: 'battery_voltage', name: 'Battery Voltage', unit: 'V' },
      { key: 'motor_temp', name: 'Motor Temperature', unit: '°C' },
      { key: 'throttle_position', name: 'Throttle Position', unit: '%' },
      { key: 'vehicle_speed', name: 'Vehicle Speed', unit: 'km/h' },
      { key: 'acceleration', name: 'Acceleration', unit: 'm/s²' },
      { key: 'brake_pressure', name: 'Brake Pressure', unit: 'kPa' },
      { key: 'power_consumption', name: 'Power Consumption', unit: 'kW' }
    ]);

    // Load previously selected topics
    this.store.get('selectedTopics').subscribe((topics: DataValue) => {
      if (topics && topics.values && topics.values.length > 0) {
        try {
          const parsedTopics = JSON.parse(topics.values[0]);
          if (Array.isArray(parsedTopics)) {
            this.selected.set(parsedTopics.map((t) => t.key));
          }
        } catch (e) {
          console.error('Error parsing selected topics:', e);
          this.selected.set([]);
        }
      }
    });
  }

  updateSelected(keys: string[]) {
    this.selected.set(keys);
  }

  save() {
    const selectedTopics = this.allTopics().filter((topic) => this.selected().includes(topic.key));

    this.store.addValue('selectedTopics', {
      values: [JSON.stringify(selectedTopics)],
      time: Date.now().toString(),
      unit: ''
    });

    this.router.navigate(['/telemetry']);
  }

  cancel() {
    this.router.navigate(['/telemetry']);
  }
}
