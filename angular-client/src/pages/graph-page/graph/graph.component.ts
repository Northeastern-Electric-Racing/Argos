import { Component, effect, input, OnDestroy, OnInit } from '@angular/core';
import ApexCharts from 'apexcharts';
import {
  ApexXAxis,
  ApexDataLabels,
  ApexChart,
  ApexMarkers,
  ApexGrid,
  ApexTooltip,
  ApexFill,
  ApexLegend
} from 'ng-apexcharts';
import { BehaviorSubject, Subscription } from 'rxjs';
import { GraphInfo } from 'src/utils/types.utils';

type ChartOptions = {
  chart: ApexChart;
  xaxis: ApexXAxis;
  yaxis: ApexYAxis;
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
  standalone: true
})
export default class CustomGraphComponent implements OnInit, OnDestroy {
  showMultipleYAxes = input<boolean>(false);
  valuesSubject = input.required<BehaviorSubject<GraphInfo>[]>();
  limitRange = input(true);
  isPaused = input<boolean>(false);
  options!: ChartOptions;
  chart!: ApexCharts;
  previousDataLength: number = 0;
  // label -> x,y (topic, data point)
  data!: Map<string, Map<number, number>>;
  timeDiffMs: number = 0;
  isSliding: boolean = false;
  timeRangeMs = 60000; // 1 minute in ms
  private timeOuts: NodeJS.Timeout[] = [];

  constructor() {
    effect(() => {
      this.data = new Map();
      this.subscriptions.forEach((sub) => sub.unsubscribe());
      this.timeOuts.forEach((timeout) => clearTimeout(timeout));
      this.valuesSubject().forEach((graphInfo) => {
        this.subscriptions.push(graphInfo.subscribe(this.graphInfoCallback));
      });

      this.chart.updateOptions({
        ...this.options,
        xaxis: {
          ...this.options.xaxis,
          range: undefined
        }
      });

      this.updateChart();
    });
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
    this.chart.destroy();
    this.timeOuts.forEach((timeout) => clearTimeout(timeout));
  }

  updateChart = () => {
    // Skip chart updates if paused
    if (this.isPaused()) {
      return;
    }

    const series = Array.from(this.data).map(([key, map], index) => ({
      name: key,
      data: Array.from(map),
      yaxis: index // Assign each series to a y-axis index
    }));

    this.chart.updateSeries(series);

    if (this.showMultipleYAxes()) {
      const yaxisConfigs = Array.from(this.data.keys()).map((key, index) => ({
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
      this.chart.updateOptions({
        ...this.options,
        yaxis: yaxisConfigs
      });
    }

    if (this.limitRange() && !this.isSliding && this.timeDiffMs > this.timeRangeMs) {
      this.isSliding = true;
      this.chart.updateOptions({
        ...this.options,
        xaxis: {
          ...this.options.xaxis,
          range: this.timeRangeMs
        }
      });
    }

    if (this.limitRange()) {
      this.timeOuts.push(
        setTimeout(() => {
          this.updateChart();
        }, 1)
      );
    }
  };

  graphInfoCallback = (info: GraphInfo | undefined) => {
    // Skip processing if paused
    if (this.isPaused()) {
      return;
    }

    const values = info?.data ?? [];
    if (values.length === 0) this.data = new Map();
    values.forEach((value, i) => {
      let line: Map<number, number>;
      const label = (info?.label ?? '') + ' ' + i;
      if (!this.data.has(label)) {
        line = this.data.set(label, new Map<number, number>()).get(label)!;
      } else {
        line = this.data.get(label)!;
      }
      value.forEach((val) => {
        if (!line.has(val.x)) {
          line.set(val.x, +val.y.toFixed(3));
        }
      });
    });

    if (this.limitRange() && !this.isSliding) {
      const times = Array.from(Array.from(this.data.values())[0]?.keys());
      this.timeDiffMs = times[times.length - 1] - times[0];
    } else if (this.limitRange() !== true) {
      this.updateChart();
    }
  };

  subscriptions: Subscription[] = [];

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
      yaxis: {
        labels: {
          style: {
            colors: '#fff'
          }
        }
      },
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

    // Weird rendering stuff with apex charts, view link to see why https://github.com/apexcharts/react-apexcharts/issues/187

    this.chart = new ApexCharts(chartContainer, {
      series: [],
      ...this.options
    });
    this.chart.render().then(() => {
      this.updateChart();
    });

    this.showMultipleYAxes.apply(this.updateChart());
  }
}
