import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

@Component({
  selector: 'half-gauge',
  templateUrl: './half-gauge.component.html',
  styleUrls: ['./half-gauge.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export default class HalfGaugeComponent {
  current = input<number>(50);
  min = input<number>(0);
  max = input<number>(100);
  unit = input<string>('m/s');
  color = input<string>('#ff0000');
  size = input<number>(200);

  // Stroke thickness as a fraction of width, matching the old radialBar look.
  private readonly strokeWidth = computed(() => this.size() * 0.1);
  private readonly radius = computed(() => (this.size() - this.strokeWidth()) / 2);
  // Baseline y of the semicircle (its flat edge sits at the bottom).
  private readonly centerY = computed(() => this.radius() + this.strokeWidth() / 2);

  protected readonly stroke = computed(() => this.strokeWidth());
  // Half-circle footprint: width = size, height = size / 2 (matches the old gauge).
  protected readonly heightPx = computed(() => this.size() / 2);
  protected readonly fontSizePx = computed(() => this.size() / 10);
  protected readonly viewBox = computed(() => `0 0 ${this.size()} ${this.heightPx()}`);

  // Top semicircle from the left edge to the right edge.
  protected readonly arcPath = computed(() => {
    const s = this.strokeWidth() / 2;
    const cy = this.centerY();
    return `M ${s} ${cy} A ${this.radius()} ${this.radius()} 0 0 1 ${this.size() - s} ${cy}`;
  });
  protected readonly arcLength = computed(() => Math.PI * this.radius());

  protected readonly percentage = computed(() => {
    const pct = ((this.current() - this.min()) / (this.max() - this.min())) * 100;
    return Math.max(0, Math.min(100, pct));
  });

  // The only value that changes per tick: a single attribute on one <path>.
  protected readonly dashOffset = computed(() => this.arcLength() * (1 - this.percentage() / 100));

  protected readonly label = computed(() => formatGaugeValue(this.current()) + this.unit());
}

function formatGaugeValue(n: number): string {
  return (Math.round(n * 100) / 100).toFixed(2);
}
