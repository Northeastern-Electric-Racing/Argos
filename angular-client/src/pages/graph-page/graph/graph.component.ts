import { Component, Input, OnChanges, OnInit } from '@angular/core';
import ApexCharts from 'apexcharts';
import { ApexXAxis, ApexDataLabels, ApexChart, ApexMarkers, ApexGrid, ApexTooltip, ApexFill } from 'ng-apexcharts';
import { BehaviorSubject } from 'rxjs';
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
};

@Component({
  selector: 'graph',
  templateUrl: './graph.component.html',
  styleUrls: ['./graph.component.css']
})
export default class CustomGraphComponent implements OnChanges, OnInit {
  @Input() valuesSubject!: BehaviorSubject<GraphInfo | undefined>;
  options!: ChartOptions;
  chart!: ApexCharts;
  previousDataLength: number = 0;
  data!: Map<number, Map<number, number>>;
  timeDiffMs: number = 0;
  isSliding: boolean = false;
  timeRangeMs = 60000;

  updateChart = () => {
    const label = this.valuesSubject.value?.label ?? 'No Label';
    this.chart.updateSeries(
      Array.from(this.data).map(([index, map]) => ({
        name: label + ' ' + index,
        data: Array.from(map)
      }))
    );

    if (!this.isSliding && this.timeDiffMs > this.timeRangeMs) {
      this.isSliding = true;
      this.chart.updateOptions({
        ...this.options,
        xaxis: {
          ...this.options.xaxis,
          range: this.timeRangeMs
        }
      });
    }

    setTimeout(() => {
      this.updateChart();
    }, 800);
  };

  graphInfoCallback = (info: GraphInfo | undefined) => {
    const values = info?.data ?? [];
    values.forEach((value, i) => {
      let line: Map<number, number>;
      if (!this.data.has(i)) {
        line = this.data.set(i, new Map<number, number>()).get(i)!;
      } else {
        line = this.data.get(i)!;
      }
      value.forEach((val) => {
        if (!line.has(val.x)) {
          line.set(val.x, +val.y.toFixed(3));
        }
      });
    });

    if (!this.isSliding) {
      const times = Array.from(Array.from(this.data.values())[0].keys());
      this.timeDiffMs = times[times.length - 1] - times[0];
    }
  };

  ngOnInit(): void {
    this.data = new Map();
    this.valuesSubject.subscribe(this.graphInfoCallback);

    const chartContainer = document.getElementById('chart-container');
    if (!chartContainer) {
      console.log('Something went very wrong');
      return;
    }

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
          easing: 'linear',
          dynamicAnimation: {
            speed: 1000
          }
        }
      },
      dataLabels: {
        enabled: false
      },
      stroke: {
        curve: 'straight'
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
          formatter: (value) => {
            return (
              '' +
              new Date(value).getHours() +
              ':' +
              ((new Date(value).getMinutes() < 10 ? '0' : '') + new Date(value).getMinutes()) +
              ':' +
              ((new Date(value).getSeconds() < 10 ? '0' : '') + new Date(value).getSeconds())
            );
          }
        }
      },
      yaxis: {
        labels: {
          style: {
            colors: '#fff'
          }
        }
      },
      tooltip: {
        x: {
          //format by hours and minutes and seconds
          format: 'M/d/yy, h:mm:ss'
        }
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
        show: false
      }
    };

    // Weird rendering stuff with apex charts, view link to see why https://github.com/apexcharts/react-apexcharts/issues/187
    setTimeout(() => {
      this.chart = new ApexCharts(chartContainer, {
        series: [{ data: [] }],
        ...this.options
      });

      this.chart.render();
      this.updateChart();
    }, 0);
  }

  ngOnChanges() {
    this.data = new Map();
    this.isSliding = false;

    //set range to undefined
    this.chart.updateOptions({
      ...this.options,
      xaxis: {
        ...this.options.xaxis,
        range: undefined
      }
    });

    this.valuesSubject.subscribe(this.graphInfoCallback);
  }
}
