import { Component, Input } from '@angular/core';

@Component({
  selector: 'half-gauge',
  templateUrl: 'half-gauge.component.html',
  styleUrls: ['half-gauge.component.css']
})
export default class HalfGauge {
  @Input() current: number = 50;
  @Input() min: number = 0;
  @Input() max: number = 100;
  @Input() unit: string = 'm/s';
  @Input() color: string = 'red';

  size = 200;
  widthpx = this.size * 1.2 + 'px';
  heightpx = this.size * 0.8 + 'px';
  paddingTop = this.size * 0.2 + 'px';
  paddingLeft = this.size * 0.1 + 'px';

  gaugeType = 'semi';
  gaugeValue = this.current;
  gaugeAppendText = this.unit;
}
