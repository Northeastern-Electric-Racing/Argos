import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';

@Component({
    selector: 'thermometer',
    templateUrl: './thermometer.component.html',
    styleUrls: ['./thermometer.component.css']
})
export class Thermometer implements OnChanges {
    @Input() max!: number;
    @Input() min!: number;
    @Input() currentValue!: number;
    topvalue = '90%';

    color!: string;

    ngOnChanges(changes: SimpleChanges) {
        this.calculateColor();
    }

    calculateColor() {
        const range = this.max - this.min;
        const step = range / 5;

        if (this.currentValue <= this.min + step) {
            this.color = 'purple';
        } else if (this.currentValue <= this.min + step * 2) {
            this.color = 'blue';
        } else if (this.currentValue <= this.min + step * 3) {
            this.color = 'green';
        } else if (this.currentValue <= this.min + step * 4) {
            this.color = 'yellow';
        } else {
            this.color = 'red';
        }
    }
}