import { Component, effect, input, OnDestroy, OnInit, ChangeDetectionStrategy } from '@angular/core';
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
  ApexYAxis
} from 'ng-apexcharts';
import { BehaviorSubject, Subscription } from 'rxjs';
import { GraphInfo } from 'src/utils/types.utils';

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
};

@Component({
  selector: 'graph',
  templateUrl: './graph.component.html',
  styleUrls: ['./graph.component.css'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export default class CustomGraphComponent implements OnInit, OnDestroy {
  showMultipleYAxes = input<boolean>(false);
  valuesSubject = input.required<BehaviorSubject<GraphInfo>[]>();
  limitRange = input(true);
  isPaused = input<boolean>(false);
  realTime = input<boolean>(false);
  clearGraph = input<boolean>(false);
  options!: ChartOptions;
  chart!: ApexCharts;
  previousDataLength: number = 0;
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
      this.previousDataLength = 0;
      this.data = new Map();
    });

    effect(() => {
      if (this.showMultipleYAxes()) {
        const yaxisConfigs: Partial<ApexYAxis>[] = Array.from(this.data.keys()).map((key, index) => ({
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

        // Update y-axis configurations
        if (this.chart) {
          this.options.yaxis = yaxisConfigs;
          this.chart.updateOptions(this.options);
        }
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

      this.valuesSubject().forEach((graphInfo) => {
        if (this.isPaused()) {
          return;
        }
        this.subscriptions.push(graphInfo.subscribe(this.graphInfoCallback));
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

    const series = Array.from(this.data).map(([key, map], index) => ({
      name: key,
      data: Array.from(map),
      yaxis: index // Assign each series to a y-axis index
    }));

    this.chart.updateSeries(series);

    // Use time-based range if in time mode, otherwise use calculated timeRangeMs from point-based logic
    const effectiveRange = this.graphConfig().rangeMode === 'time' 
      ? this.graphConfig().timeRangeMs 
      : this.timeRangeMs;

    this.chart.updateOptions({
      ...this.options,
      xaxis: {
        ...this.options.xaxis,
        range: effectiveRange
      }
    });
  };

  graphInfoCallback = (info: GraphInfo | undefined) => {
    // Skip processing if paused
    if (this.isPaused()) {
      return;
    }

    const values = info?.data ?? [];
    // if (values.length === 0) this.data = new Map();
    values.forEach((value, i) => {
      let line: Array<{ x: number; y: number }>;
      const label = (info?.label ?? '') + ' ' + i;
      if (!this.data.has(label)) {
        line = this.data.set(label, []).get(label)!;
      } else {
        line = this.data.get(label)!;
      }

      value.forEach((val) => {
        if (!line.some((v) => v.x === val.x)) {
          line.push({ x: val.x, y: +val.y.toFixed(3) });
        }

        if (this.realTime()) {
          const config = this.graphConfig();
          
          if (config.rangeMode === 'time') {
            // Time-based trimming: remove points older than timeRangeMs
            const cutoffTime = val.x - config.timeRangeMs;
            while (line.length > 0 && line[0].x < cutoffTime) {
              line.shift();
            }
          } else {
            // Point-based trimming: keep only maxPoints
            if (line.length > config.maxPoints) {
              const shiftedPoint = line.shift()?.x;
              // Calculate the actual time range for point-based mode
              const timeDiff = line.length > 0 && shiftedPoint !== undefined ? val.x - shiftedPoint : 0;
              this.timeRangeMs = timeDiff < (this.timeRangeMs ?? Number.MAX_SAFE_INTEGER) ? timeDiff : this.timeRangeMs;
            }
          }
        }
      });
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
