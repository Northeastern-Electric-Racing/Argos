import {
  Component,
  DestroyRef,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  untracked,
  viewChild
} from '@angular/core';
import { Chart, ChartDataset } from 'chart.js';
import { BaseChartDirective, provideCharts } from 'ng2-charts';
import { DialogService } from 'primeng/dynamicdialog';
import { GraphDialogComponent } from '../graph-dialog/graph-dialog.component';
import { GraphData } from 'src/utils/types.utils';
import {
  DEFAULT_TIME_RANGE_SEC,
  LIVE_LINE_REGISTERABLES,
  LIVE_REFRESH_MS,
  buildLiveLineOptions,
  liveWindow,
  windowPoints
} from '../graph/live-line-chart.utils';

type LineDataset = ChartDataset<'line', GraphData[]>;

/** Two live lines with a legend, following the last `timeRangeSec` of either (callers may push points into them). */
@Component({
  selector: 'double-line-graph',
  templateUrl: './double-line-graph.component.html',
  styleUrls: ['./double-line-graph.component.css'],
  providers: [DialogService, provideCharts({ registerables: LIVE_LINE_REGISTERABLES })],
  standalone: true,
  imports: [BaseChartDirective]
})
export class DoubleLineGraphComponent {
  public dialogService = inject(DialogService);
  private chartDirective = viewChild(BaseChartDirective);
  data1 = input.required<GraphData[]>();
  color1 = input.required<string>(); // Must be hex
  title1 = input<string | undefined>(undefined);
  data2 = input.required<GraphData[]>();
  color2 = input.required<string>(); // Must be hex
  title2 = input<string | undefined>(undefined);
  header = input<string | undefined>(undefined);
  graphContainerId = input.required<string>();
  timeRangeSec = input<number | undefined>(undefined);
  timeRangeMs = computed(() => (this.timeRangeSec() ?? DEFAULT_TIME_RANGE_SEC) * 1000);

  readonly chartData: { datasets: LineDataset[] } = { datasets: [{ data: [] }, { data: [] }] };
  readonly chartOptions = buildLiveLineOptions({ legend: true });

  openDialog = () => {
    this.dialogService.open(GraphDialogComponent, {
      header: this.header(),
      data: {
        data: this.data1(),
        color: this.color1(),
        title: this.title1(),
        graphContainerId: this.graphContainerId() + 'big'
      }
    });
  };

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      this.syncChart();
      const refresh = setInterval(() => this.syncChart(), LIVE_REFRESH_MS);
      destroyRef.onDestroy(() => clearInterval(refresh));
    });
    // Input changes (new colours, titles or data arrays) apply to the live chart straight away
    effect(() => {
      this.data1();
      this.data2();
      this.color1();
      this.color2();
      this.title1();
      this.title2();
      this.timeRangeMs();
      untracked(() => this.syncChart());
    });
  }

  private get chart(): Chart<'line', GraphData[]> | undefined {
    return this.chartDirective()?.chart as Chart<'line', GraphData[]> | undefined;
  }

  /** Pushes both lines' current window, colours and titles into Chart.js and redraws without animation. */
  private syncChart(): void {
    const { chart } = this;
    if (!chart) return;
    const lines = [
      { data: this.data1(), color: this.color1(), title: this.title1() },
      { data: this.data2(), color: this.color2(), title: this.title2() }
    ];
    const window = liveWindow(
      lines.map((line) => line.data),
      this.timeRangeMs()
    );

    // Update the datasets in place: Chart.js keys legend toggles on dataset identity
    lines.forEach((line, index) => {
      const dataset = chart.data.datasets[index];
      dataset.label = line.title;
      dataset.borderColor = line.color;
      dataset.backgroundColor = line.color;
      dataset.data = window ? windowPoints(line.data, window.min) : [];
    });

    const x = chart.config.options!.scales!['x']!;
    x.min = window?.min;
    x.max = window?.max;

    chart.update('none');
  }
}
