import { ChangeDetectionStrategy, Component, input, computed } from '@angular/core';
import { HeatMapView } from 'src/services/heat-map.service';
import { cx, tw } from 'src/ui/recipes/tw';

/** Maps each HeatMapView to the unit label shown inside the hex */
const VIEW_UNIT_MAP: Record<HeatMapView, string> = {
  [HeatMapView.Voltage]: 'V',
  [HeatMapView.SVolts]: 'V',
  [HeatMapView.Temperature]: '°C',
  [HeatMapView.Balancing]: '',
  [HeatMapView.CvsFailure]: '',
  [HeatMapView.OpenWire]: ''
};

/** True/false views centre their TRUE/FALSE label; the others stack the number above a left-aligned value. */
const isFlagView = (view: HeatMapView | undefined) => view === HeatMapView.CvsFailure || view === HeatMapView.OpenWire;

/**
 * A hex tile's look. Every size scales with --hex-w/--hex-h/--hex-gap, which segment-heatmap sets for its row or
 * page size; the type is a fraction of the hex width (no step of the type scale fits a fluid hex).
 *   single  one pointy-top hex; double: two merged hexes for a thermistor that spans two cells
 *   flag    CvS Failure and Open Wire: TRUE/FALSE centred, the cell number kept at the left
 */
const tileBase = tw(
  'relative flex h-(--hex-h) cursor-pointer flex-col items-start justify-center transition-[filter] duration-150 ease-[ease]'
);
const tileShape = {
  single: tw('w-(--hex-w) [clip-path:polygon(50%_0%,100%_25%,100%_75%,50%_100%,0%_75%,0%_25%)]'),
  double: tw(
    'w-[calc(var(--hex-w)*2+var(--hex-gap))] [clip-path:polygon(0%_25%,25%_0%,50%_25%,75%_0%,100%_25%,100%_75%,75%_100%,50%_75%,25%_100%,0%_75%)]'
  )
};
const tilePadding = { single: tw('pl-[8%]'), double: tw('pl-[5%]'), flag: tw('pl-0') };
/**
 * Selected tiles are brighter; hover brightens the others a step (never both, so a hovered selected tile stays lit).
 * Plain filter properties, not brightness-*, which would pull in Tailwind's whole filter stack (~0.7 kB).
 */
const tileState = { rest: tw('hover:[filter:brightness(1.15)]'), selected: tw('[filter:brightness(1.3)]') };

const number = {
  plain: tw('mb-px font-sans text-[length:calc(var(--hex-w)*0.2)] leading-none font-bold text-on-status'),
  flag: tw('mb-px pl-[8%] font-sans text-[length:calc(var(--hex-w)*0.2)] leading-none font-bold text-on-status')
};
const container = { single: tw('flex items-baseline gap-px'), centred: tw('flex items-baseline gap-px self-center') };
const value = {
  plain: tw('font-sans text-[length:calc(var(--hex-w)*0.36)] leading-none font-bold text-on-status'),
  flag: tw('font-sans text-[length:calc(var(--hex-w)*0.24)] leading-none font-bold text-on-status')
};
const unit = tw('align-super font-sans text-[length:calc(var(--hex-w)*0.2)] font-semibold text-on-status');

/**
 * The native button around the clipped hex: Tab reaches it, Enter and Space press it, and its click bubbles to the
 * host's (click). It keeps the hex's box (block, so no line box adds height); the focus ring is drawn on it, since
 * the hex's clip-path would cut an outline on the tile.
 */
const button = tw('block rounded-xs focus-visible:focus-ring');

/**
 * The selected tile's white glow follows the hex outline (a glow on the clipped tile's host). A focused tile rises
 * above its neighbours and the interlocking row, so they don't paint over its ring.
 */
const hostBase = tw('block shrink-0 has-focus-visible:z-2');
const hostSelected = tw(
  'z-1 [filter:drop-shadow(0_0_3px_var(--color-on-accent))_drop-shadow(0_0_1px_var(--color-on-accent))]'
);

export type HexTileVariant = 'heatmap-cell' | 'heatmap-cell-double';

@Component({
  selector: 'hex-tile',
  templateUrl: './hex-tile.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class]': 'hostClass()'
  }
})
export class HexTileComponent {
  variant = input<HexTileVariant>('heatmap-cell');
  value = input<number | undefined>();
  booleanValue = input<boolean | undefined>();
  color = input.required<string>();
  currentView = input<HeatMapView>();
  boxShadowColor = input<boolean>(false);
  cellNumber = input<string | undefined>();

  private double = computed(() => this.variant() === 'heatmap-cell-double');
  private flag = computed(() => !this.double() && isFlagView(this.currentView()));

  protected hostClass = computed(() => cx(hostBase, this.boxShadowColor() && hostSelected));
  protected tileClass = computed(() =>
    cx(
      tileBase,
      this.double() ? tileShape.double : tileShape.single,
      this.double() ? tilePadding.double : this.flag() ? tilePadding.flag : tilePadding.single,
      this.boxShadowColor() ? tileState.selected : tileState.rest
    )
  );
  protected numberClass = computed(() => (this.flag() ? number.flag : number.plain));
  protected containerClass = computed(() => (this.double() || this.flag() ? container.centred : container.single));
  protected valueClass = computed(() => (this.flag() ? value.flag : value.plain));
  protected readonly unitClass = unit;
  protected readonly buttonClass = button;

  displayValue = computed(() => {
    const boolValue = this.booleanValue();
    if (boolValue !== undefined) {
      const view = this.currentView();
      if (view === HeatMapView.CvsFailure || view === HeatMapView.OpenWire) return boolValue ? 'TRUE' : 'FALSE';
      return boolValue ? 'YES' : 'NO';
    }
    const value = this.value();
    return value === undefined ? '-' : value.toFixed(2);
  });

  /** The button's name: its cell or cells and its value, e.g. "Cell 3, 3.60 V" or "Cells 0 and 1, no data". */
  accessibleName = computed(() => {
    const cells = (this.cellNumber() ?? '').split(',');
    const label =
      cells.length > 1 ? `Cells ${cells.slice(0, -1).join(', ')} and ${cells[cells.length - 1]}` : `Cell ${cells[0]}`;
    const value = this.displayValue();
    if (value === '-') return `${label}, no data`;
    const unit = this.unitLabel();
    return unit ? `${label}, ${value} ${unit}` : `${label}, ${value}`;
  });

  unitLabel = computed(() => {
    if (this.booleanValue() !== undefined) return '';
    const view = this.currentView();
    return view ? VIEW_UNIT_MAP[view] : '';
  });
}
