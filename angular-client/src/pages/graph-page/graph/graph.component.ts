import { Component, effect, input, OnDestroy, OnInit, ChangeDetectionStrategy, untracked } from '@angular/core';
import ApexCharts from 'apexcharts';
import {
  ApexXAxis,
  ApexDataLabels,
  ApexChart,
  ApexMarkers,
  ApexGrid,
  ApexTooltip,
  ApexFill,
  ApexLegend,
  ApexYAxis,
  ApexAnnotations
} from 'ng-apexcharts';
import { Subscription } from 'rxjs';
import { binarySearchInsertIndex } from 'src/utils/array.utils';
import { GraphInfo, ObservableGraphInfo } from 'src/utils/types.utils';

type ChartOptions = {
  chart: ApexChart;
  xaxis: ApexXAxis;
  yaxis: ApexYAxis[];
  dataLabels: ApexDataLabels;
  markers: ApexMarkers;
  grid: ApexGrid;
  tooltip: ApexTooltip;
  fill: ApexFill;
  stroke: ApexStroke;
  legend?: ApexLegend; // Add legend property to match the options object
  annotations?: ApexAnnotations;
};

const DAY_MS = 24 * 60 * 60 * 1000;

@Component({
  selector: 'graph',
  templateUrl: './graph.component.html',
  styleUrls: ['./graph.component.css'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export default class CustomGraphComponent implements OnInit, OnDestroy {
  showMultipleYAxes = input<boolean>(false);
  valuesSubject = input.required<ObservableGraphInfo[]>();
  limitRange = input(true);
  isPaused = input<boolean>(false);
  realTime = input<boolean>(false);
  clearGraph = input<number>(0);
  options!: ChartOptions;
  chart!: ApexCharts;
  // label -> x,y (topic, data point)
  data!: Map<string, Array<{ x: number; y: number }>>;
  isSliding: boolean = false;
  timeRangeMs: number | undefined = undefined;
  private timeOuts: NodeJS.Timeout[] = [];
  graphConfig = input.required<{
    maxPoints: number;
    yMin: number | null;
    yMax: number | null;
    rangeMode: 'time' | 'points';
    timeRangeMs: number;
  }>();
  range = input<number | undefined>(undefined);
  subscriptions: Subscription[] = [];

  constructor() {
    effect(() => {
      if (this.isPaused()) {
        this.resetRange();
      }
    });
    effect(() => {
      const config = this.graphConfig();
      if (this.chart && config) {
        this.options.yaxis = [
          {
            ...this.options.yaxis,
            labels: {
              style: {
                colors: '#fff'
              }
            },
            max: config.yMax === null ? undefined : config.yMax,
            min: config.yMin === null ? undefined : config.yMin
          }
        ];

        this.chart.updateOptions(this.options);
        this.resetRange();
      }
    });

    effect(() => {
      this.realTime();
      this.clearGraph();
      this.valuesSubject();
      if (this.chart) {
        this.chart.updateSeries([]);
      }
      this.data = new Map();
      this.timeRangeMs = undefined;
    });

    effect(() => {
      // Re-run whenever the toggle flips. Per-topic axes are also rebuilt in updateChart
      // (see applyMultiYAxisConfigs) so they stay in sync as topics are selected/deselected.
      if (this.showMultipleYAxes()) {
        this.applyMultiYAxisConfigs();
      } else {
        this.options.yaxis = [
          {
            labels: {
              style: {
                colors: '#fff'
              }
            }
          }
        ];
      }
      if (this.chart) {
        this.chart.updateOptions(this.options);
      }
    });
    effect(() => {
      // Clean up existing subscriptions
      this.subscriptions.forEach((sub) => sub.unsubscribe());
      this.subscriptions = [];

      // Clean up existing timeouts
      this.timeOuts.forEach((timeout) => clearTimeout(timeout));
      this.timeOuts = [];

      this.valuesSubject().forEach(({ label, updates }) => {
        this.subscriptions.push(updates.subscribe((data) => this.graphInfoCallback({ label, data })));
      });

      this.updateChart();
    });
  }

  ngOnDestroy(): void {
    // Clean up subscriptions
    this.subscriptions.forEach((sub) => sub.unsubscribe());
    this.subscriptions = [];

    // Clean up timeouts
    this.timeOuts.forEach((timeout) => clearTimeout(timeout));
    this.timeOuts = [];

    // Destroy chart and clear data
    if (this.chart) {
      this.chart.destroy();
    }
    this.data.clear();
  }

  updateChart = () => {
    // Skip chart updates if paused
    if (this.isPaused() && this.limitRange()) {
      return;
    }

    const series = Array.from(this.data).map(([key, points], index) => ({
      name: key,
      data: points,
      yaxis: index
    }));

    // Keep the per-topic y-axes matched to the current series set: deselecting a topic
    // drops its series here, so its y-axis must be pruned too (#630). untracked() so calling
    // updateChart from an effect doesn't add showMultipleYAxes as a dependency.
    if (untracked(this.showMultipleYAxes)) {
      this.applyMultiYAxisConfigs();
    }

    // Only constrain the x-axis range in real-time mode; historical mode should auto-fit all data
    let effectiveRange: number | undefined = undefined;
    if (this.realTime()) {
      effectiveRange = this.graphConfig().rangeMode === 'time' ? this.graphConfig().timeRangeMs : this.timeRangeMs;
    }

    // Multi-day historical ranges get date-aware labels and per-day boundary annotations.
    // Skip the O(N) span scan in real-time mode — realtime ranges are bounded and never multi-day.
    const span = this.realTime() ? null : this.computeDataSpan();
    const isMultiDay = !!span && span.spanMs > DAY_MS;

    // Single updateOptions call with series included — avoids two separate re-renders
    // Pass false, false to skip animation bookkeeping (getPreviousPaths) and animate flag
    this.chart.updateOptions(
      {
        ...this.options,
        series,
        xaxis: {
          ...this.options.xaxis,
          range: effectiveRange,
          labels: {
            ...this.options.xaxis.labels,
            formatter: isMultiDay ? this.multiDayLabelFormatter : this.singleDayLabelFormatter
          }
        },
        annotations: { xaxis: isMultiDay ? this.buildDayBoundaryAnnotations(span!) : [] }
      },
      false, // redraw (default is false)
      false // animate (default is true)
    );
  };

  // Build one y-axis per current topic (order matches the series' `yaxis: index`).
  private applyMultiYAxisConfigs(): void {
    this.options.yaxis = Array.from(this.data.keys()).map((key, index) => ({
      title: {
        text: key.replace('0', ''),
        style: {
          color: 'grey',
          fontSize: '20px',
          fontWeight: 'bold'
        }
      },
      labels: {
        style: {
          colors: '#fff'
        }
      },
      opposite: index % 2 !== 0 // Alternate sides for each y-axis
    }));
  }

  private computeDataSpan(): { minX: number; maxX: number; spanMs: number } | null {
    let minX = Infinity;
    let maxX = -Infinity;
    for (const points of this.data.values()) {
      if (points.length === 0) continue;
      // Series data is kept sorted by x (see graphInfoCallback), so endpoints are the extrema.
      if (points[0].x < minX) minX = points[0].x;
      if (points[points.length - 1].x > maxX) maxX = points[points.length - 1].x;
    }
    if (!isFinite(minX) || !isFinite(maxX)) return null;
    return { minX, maxX, spanMs: maxX - minX };
  }

  private singleDayLabelFormatter = (val: string | number): string =>
    new Date(+val).toLocaleTimeString('en-US', { hour12: false });

  private multiDayLabelFormatter = (val: string | number): string => {
    const d = new Date(+val);
    const date = d.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' });
    const time = d.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
    return `${date} ${time}`;
  };

  private buildDayBoundaryAnnotations(span: { minX: number; maxX: number }) {
    const annotations: { x: number; strokeDashArray: number; borderColor: string; label: object }[] = [];
    // First local-midnight strictly after minX.
    const cursor = new Date(span.minX);
    cursor.setHours(24, 0, 0, 0);
    for (let t = cursor.getTime(); t < span.maxX; t += DAY_MS) {
      const date = new Date(t);
      annotations.push({
        x: t,
        strokeDashArray: 4,
        borderColor: '#8fcadd',
        label: {
          borderColor: '#8fcadd',
          style: { color: '#fff', background: '#0c2026', fontSize: '11px' },
          orientation: 'horizontal',
          position: 'top',
          offsetY: -4,
          text: date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
        }
      });
    }
    return annotations;
  }

  graphInfoCallback = (info: GraphInfo) => {
    // Skip processing if paused
    if (this.isPaused()) {
      return;
    }
    info.data.forEach((value, i) => {
      const seriesLabel = info.label + ' ' + i;
      if (!this.data.has(seriesLabel)) {
        this.data.set(seriesLabel, []);
      }
      const line = this.data.get(seriesLabel)!;

      value.forEach((val) => {
        const point = { x: val.x, y: Math.round(val.y * 10000) / 10000 };

        // if the point is in order according to it's timestamp, just push it to the end of the line
        if (line.length === 0 || val.x >= line.at(-1)!.x) {
          line.push(point);
        } else {
          // Out of order: binary search for correct sorted position
          // (very rare but it's nice to be able to assume sorted data for efficient trimming later)
          const idx = binarySearchInsertIndex(line, val.x);
          line.splice(idx, 0, point);
        }
      });

      // Trim after processing all points in this series batch
      if (this.realTime() && line.length > 0) {
        const config = this.graphConfig();
        const latestX = line[line.length - 1].x;

        if (config.rangeMode === 'time') {
          // remove point if outside the time range + 10% buffer (for better UX)
          const buffer = config.timeRangeMs * 0.1;
          const cutoff = latestX - config.timeRangeMs - buffer;
          if (line[0].x < cutoff) {
            line.shift();
          }
        } else if (line.length > config.maxPoints * 1.1) {
          const shiftedPoint = line.shift();
          // point based trim requires is to calculate the max time range we can show that
          // doesn't show points being deleted. So we default to smallest range.
          const timeDiff = shiftedPoint !== undefined ? latestX - shiftedPoint.x : 0;
          this.timeRangeMs = timeDiff < (this.timeRangeMs ?? Number.MAX_SAFE_INTEGER) ? timeDiff : this.timeRangeMs;
        }
      }
    });

    this.updateChart();
  };

  ngOnInit(): void {
    this.data = new Map();

    const chartContainer = document.getElementById('chart-container');
    if (!chartContainer) return;

    this.options = {
      chart: {
        id: 'graph',
        type: 'line',
        height: '100%',
        zoom: {
          autoScaleYaxis: true
        },
        animations: {
          enabled: false,
          dynamicAnimation: {
            speed: 1
          }
        }
      },
      dataLabels: {
        enabled: false
      },
      stroke: {
        curve: 'straight',
        width: 3
      },
      markers: {
        size: 0
      },
      xaxis: {
        type: 'category',
        tickAmount: 6,
        labels: {
          style: {
            colors: '#fff'
          },
          formatter: (val: string | number) => new Date(+val).toLocaleTimeString('en-US', { hour12: false })
        }
      },
      // fix to work like this for different graphs: `https://apexcharts.com/docs/chart-types/multiple-yaxis-scales/`
      yaxis: [
        {
          labels: {
            style: {
              colors: '#fff'
            }
          }
        }
      ],
      tooltip: {
        enabled: true,
        // Make the tooltip “follow” your cursor as you hover
        followCursor: true,
        // If you’d rather show a shared tooltip for multiple series, set shared: true
        shared: false,
        intersect: false,
        x: {
          //format by hours and minutes and seconds
          format: 'M/d/yy, h:mm:ss'
        },
        theme: 'dark'
      },
      fill: {
        type: 'linear',
        gradient: {
          shadeIntensity: 1,
          opacityFrom: 0.7,
          opacityTo: 0.9,
          stops: [0, 100]
        }
      },
      grid: {
        show: true
      },
      legend: {
        labels: {
          colors: '#fff'
        },
        fontSize: '15px'
      }
    };

    this.chart = new ApexCharts(chartContainer, {
      series: [],
      ...this.options
    });
    this.chart.render().then(() => {
      this.updateChart();
    });
  }

  resetRange() {
    this.timeRangeMs = undefined;
    this.chart.updateOptions({
      ...this.options,
      xaxis: {
        ...this.options.xaxis,
        range: undefined
      }
    });
  }
}
