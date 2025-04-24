import { Component, ViewEncapsulation, ViewChild, Input, OnDestroy, AfterViewInit, inject } from '@angular/core';
import { ChartComponent, ILoadedEventArgs } from '@syncfusion/ej2-angular-charts';
import { ChartPoint } from '../../models/chart-data.model';
import Storage from '../../services/storage.service';
import { Subject, Subscription } from 'rxjs';
import { DataValue } from 'src/utils/socket.utils';
import { DataType } from 'src/utils/types.utils';
import { TopicService } from 'src/services/topic.service';

interface SeriesLine {
  name: string;
  axisTitle: string;
  data: ChartPoint[];
  dataSubject: Subject<DataValue>;
  color?: string;
}

@Component({
  selector: 'app-graph-live',
  template: `
    <ejs-chart
      #chart
      id="chart-container"
      [chartArea]="chartArea"
      [primaryXAxis]="primaryXAxis"
      [primaryYAxis]="primaryYAxis"
      [tooltip]="tooltip"
      [legendSettings]="legendSettings"
      (loaded)="loaded($event)"
    >
      <e-series-collection>
        <ng-container *ngFor="let seriesItem of series; let i = index">
          <e-series
            [dataSource]="seriesItem.data"
            type="Line"
            xName="x"
            yName="y"
            [name]="seriesItem.name"
            [width]="2"
            [marker]="marker"
            [animation]="animation"
          >
          </e-series>
        </ng-container>
      </e-series-collection>
    </ejs-chart>
  `,
  encapsulation: ViewEncapsulation.None
})
export class GraphLiveComponent implements AfterViewInit, OnDestroy {
  @Input() liveWindow = 1000 * 60; // 60 s by default
  @ViewChild('chart') chart?: ChartComponent;

  private store = inject(Storage);
  private topicService = inject(TopicService);
  private subs: Subscription[] = [];

  series: SeriesLine[] = [];

  // Chart configuration
  primaryXAxis = {
    valueType: 'DateTime',
    labelFormat: 'hh:mm:ss',
    title: 'Time',
    rangePadding: 'None',
    minimum: new Date(Date.now() - this.liveWindow),
    maximum: new Date(),
    intervalType: 'Seconds',
    edgeLabelPlacement: 'Shift'
  };

  primaryYAxis = {
    title: 'Value',
    labelFormat: '{value}',
    minimum: -1,
    maximum: 1
  };

  tooltip = { enable: true, format: '${series.name}: ${point.y}' };

  legendSettings = {
    visible: true,
    position: 'Bottom'
  };

  chartArea = {
    border: { width: 0 }
  };

  marker = {
    visible: false,
    height: 5,
    width: 5
  };

  animation = {
    enable: false
  };
  intervalId: NodeJS.Timeout | undefined;

  loaded(args: ILoadedEventArgs): void {
    // Update chart window every second
    this.intervalId = setInterval(() => {
      const now = new Date();
      const minimum = new Date(now.getTime() - this.liveWindow);

      if (args.chart) {
        args.chart.primaryXAxis.minimum = minimum;
        args.chart.primaryXAxis.maximum = now;
        args.chart.refresh();
      }
    }, 1000);
  }

  ngAfterViewInit(): void {
    // Subscribe to the topic service
    const topicsSub = this.topicService.getSelectedTopics().subscribe((topics: DataType[]) => {
      if (topics && topics.length > 0) {
        this.bootstrapSeries(topics);
      } else if (topics.length === 0 && this.series.length > 0) {
        // Clear chart when all topics are unselected
        this.clearSeries();
      }
    });
    this.subs.push(topicsSub);
  }

  private clearSeries(): void {
    // Clean subscriptions
    this.subs.forEach((s) => {
      if (s.closed === false) {
        s.unsubscribe();
      }
    });
    this.series = [];
    this.subs = [];
  }

  private bootstrapSeries(topicArray: DataType[]) {
    // Clean old subscriptions
    this.clearSeries();

    // Assign different colors to each series
    const colors = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40', '#8AC926'];

    // Dynamically set y-axis range based on topics
    this.primaryYAxis = {
      ...this.primaryYAxis,
      minimum: -1,
      maximum: 1 // Default that will be adjusted based on data
    };

    for (let i = 0; i < topicArray.length; i++) {
      const topic = topicArray[i];
      const subj = this.store.get(topic.name);

      const line: SeriesLine = {
        name: topic.name,
        axisTitle: topic.name,
        data: [] as ChartPoint[],
        dataSubject: subj,
        color: colors[i % colors.length] // Cycle through colors
      };

      // Subscribe to live stream
      const s = subj.subscribe((dataValue: DataValue) => {
        if (dataValue?.values?.length > 0) {
          const time = dataValue.time ? parseInt(dataValue.time) : Date.now();
          const value = parseFloat(dataValue.values[0]);

          if (!isNaN(value)) {
            const point: ChartPoint = {
              x: new Date(time),
              y: value
            };

            // Add the new data point
            line.data.push(point);
            console.log('New data point:', point);

            // Keep within time window
            const now = Date.now();
            const windowStart = now - this.liveWindow;
            line.data = line.data.filter((p) => p.x.getTime() >= windowStart);

            // Update x-axis range only when new data arrives
            this.updateAxisRange();

            // Refresh chart with new data
            if (this.chart) {
              this.chart.refresh();
            }
          }
        }
      });

      this.series.push(line);
      this.subs.push(s);
    }
  }

  private updateAxisRange(): void {
    const now = new Date();
    const minimum = new Date(now.getTime() - this.liveWindow);

    this.primaryXAxis = {
      ...this.primaryXAxis,
      minimum,
      maximum: now
    };
  }

  ngOnDestroy(): void {
    this.subs.forEach((s) => {
      if (s.closed === false) {
        s.unsubscribe();
      }
    });
  }
}
