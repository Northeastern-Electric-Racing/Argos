import { Component, input, OnChanges, OnInit } from '@angular/core';
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
  valuesSubject = input.required<BehaviorSubject<GraphInfo>[]>();
  limitRange = input(true);
  options!: ChartOptions;
  chart!: ApexCharts;
  previousDataLength: number = 0;
  // label -> x,y
  data!: Map<string, Map<number, number>>;
  timeDiffMs: number = 0;
  isSliding: boolean = false;
  timeRangeMs = 120000;

  updateChart = () => {
    // TODO: FUCK UPDATING SERIES
    // we create a fucking new series every fucking time, the logic here however, will create
    // multiple data points, from our data map.... this is the fucking meat of the shit.
    this.chart.updateSeries(
      // so instead of looping through "data", which is not fucking data
      // we will loop through each and create new data points, y-axis shit is seperate... but stil based
      // on the fucking label / name
      Array.from(this.data).map(([string, map]) => ({
        name: string,
        data: Array.from(map)
      }))
    );

    //
    if (this.limitRange() && !this.isSliding && this.timeDiffMs > this.timeRangeMs) {
      this.isSliding = true;

      // again whyyyy would we ever decoupled the options from the udpating.. whagerver
      this.chart.updateOptions({
        ...this.options,
        xaxis: {
          ...this.options.xaxis,
          range: this.timeRangeMs
        }
      });
    }

    // weird but OK
    if (this.limitRange()) {
      setTimeout(() => {
        this.updateChart();
      }, 800);
    }
  };

  graphInfoCallback = (info: GraphInfo | undefined) => {
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
    } else if (!this.limitRange()) {
      this.updateChart();
    }
  };

  ngOnInit(): void {
    this.data = new Map();
    // pipes the valuesSubject into graphInfoCallBack, WHICH IS A FUCKING GRAPH INFO WITH A LABEL
    this.valuesSubject().forEach((graphInfo) => {
      graphInfo.subscribe(this.graphInfoCallback);
    });

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
      // fix to work like this for different graphs: `https://apexcharts.com/docs/chart-types/multiple-yaxis-scales/`
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

    //set range to undefined... why?
    this.chart.updateOptions({
      ...this.options,
      xaxis: {
        ...this.options.xaxis,
        range: undefined
      }
    });

    this.valuesSubject().forEach((graphInfo) => {
      graphInfo.subscribe(this.graphInfoCallback);
    });
  }
}
