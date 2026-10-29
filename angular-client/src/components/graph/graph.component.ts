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
import { GraphData } from 'src/utils/types.utils';
import {
  DEFAULT_TIME_RANGE_SEC,
  LIVE_LINE_REGISTERABLES,
  LIVE_REFRESH_MS,
  applyLiveWindow,
  buildLiveLineOptions,
  liveWindow,
  windowPoints
} from './live-line-chart.utils';

type LineDataset = ChartDataset<'line', GraphData[]>;

/** One live line, following the last `timeRangeSec` of `data` (which its caller may push points into). */
@Component({
  selector: 'graph-component',
  templateUrl: './graph.component.html',
  styleUrls: ['./graph.component.css'],
  providers: [provideCharts({ registerables: LIVE_LINE_REGISTERABLES })],
  standalone: true,
  imports: [BaseChartDirective]
})
export class GraphComponent {
  private chartDirective = viewChild(BaseChartDirective);
  data = input.required<GraphData[]>();
  color = input.required<string>(); // Must be hex
  title = input<string | undefined>(undefined);
  graphContainerId = input.required<string>();
  timeRangeSec = input<number | undefined>(undefined);
  timeRangeMs = computed(() => (this.timeRangeSec() ?? DEFAULT_TIME_RANGE_SEC) * 1000);

  readonly chartData: { datasets: LineDataset[] } = { datasets: [{ data: [] }] };
  readonly chartOptions = buildLiveLineOptions({ legend: false });

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      this.syncChart();
      const refresh = setInterval(() => this.syncChart(), LIVE_REFRESH_MS);
      destroyRef.onDestroy(() => clearInterval(refresh));
    });
    // Input changes (a new colour, title or data array) apply to the live chart straight away
    effect(() => {
      this.data();
      this.color();
      this.title();
      this.timeRangeMs();
      untracked(() => this.syncChart());
    });
  }

  private get chart(): Chart<'line', GraphData[]> | undefined {
    return this.chartDirective()?.chart as Chart<'line', GraphData[]> | undefined;
  }

  /** Pushes the line's current window, colour and title into Chart.js and redraws without animation. */
  private syncChart(): void {
    const { chart } = this;
    if (!chart) return;
    const data = this.data();
    const window = liveWindow([data], this.timeRangeMs());

    const [dataset] = chart.data.datasets;
    dataset.label = this.title();
    dataset.borderColor = this.color();
    dataset.backgroundColor = this.color();
    dataset.data = window ? windowPoints(data, window.min) : [];

    applyLiveWindow(chart, window);
    chart.update('none');
  }
}
