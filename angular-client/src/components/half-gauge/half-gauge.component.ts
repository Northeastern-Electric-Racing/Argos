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
  @Input() size: number = 200;

  // default
  widthpx: string = '200px';
  heightpx: string = '200px';
  paddingTop: string = '20px';
  paddingLeft: string = '10px';
  thickness: number = 15;

  //scaling off inputted size
  ngOnInit() {
    this.widthpx = this.size * 1.2 + 'px';
    this.heightpx = this.size * 0.8 + 'px';
    this.paddingTop = this.size * 0.2 + 'px';
    this.paddingLeft = this.size * 0.1 + 'px';
    this.thickness = this.size * 0.1;
  }

  // scaling based off size

  // gauge props
  gaugeType = 'semi';
  gaugeValue = this.current;
  gaugeAppendText = this.unit;
}
