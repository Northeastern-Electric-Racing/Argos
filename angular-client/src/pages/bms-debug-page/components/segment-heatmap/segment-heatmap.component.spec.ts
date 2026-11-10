import { UiDialogService } from 'src/ui/dialog/dialog.service';
import { ChangeDetectorRef, provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import Storage from 'src/services/storage.service';
import { CellService } from 'src/services/cell.service';
import { HeatMapService, HeatMapView } from 'src/services/heat-map.service';
import { DataValue } from 'src/utils/socket.utils';
import { topics } from 'src/utils/topic.utils';
import { SegmentHeatmapComponent } from './segment-heatmap.component';

const SEGMENT = 0;
const CELL = 0;
const GREY = 'grey';

/** WCAG contrast of black tile text on a #rrggbb fill. */
const contrastWithBlack = (hex: string): number => {
  const channel = (i: number) => {
    const v = parseInt(hex.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  const luminance = 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
  return (luminance + 0.05) / 0.05;
};

const push = (storage: Storage, key: string, value: string): void => {
  storage.addValue(key, { values: [value], time: '0', unit: '' } as DataValue);
};

/**
 * Drives the heatmap through its real storage seam (Storage -> CellService ->
 * SegmentHeatmapComponent) and asserts the value + color the component binds onto
 * each hex tile, for the C Volts, S Volts, and Open Wire views, plus the no-data grey.
 *
 * Assertions read the component's rendered outputs (alphaDisplayCells[].value and
 * getColor) directly rather than re-running change detection per push: CellService
 * mutates its readings synchronously on storage.next, and a shared module-level
 * cell array means a template re-render would raise a spurious NG0100.
 */
describe('SegmentHeatmapComponent (storage seam)', () => {
  let fixture: ComponentFixture<SegmentHeatmapComponent>;
  let component: SegmentHeatmapComponent;
  let storage: Storage;
  let cellService: CellService;
  let heatMap: HeatMapService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SegmentHeatmapComponent],
      providers: [
        provideZonelessChangeDetection(),
        Storage,
        CellService,
        HeatMapService,
        { provide: UiDialogService, useValue: { openPanel: () => null } }
      ]
    }).compileComponents();

    storage = TestBed.inject(Storage);
    cellService = TestBed.inject(CellService);
    heatMap = TestBed.inject(HeatMapService);
    cellService.updateCellInfo(); // wire the per-cell storage subscriptions

    fixture = TestBed.createComponent(SegmentHeatmapComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('segment', SEGMENT);
    fixture.detectChanges(); // runs the effect (loads cells) + ngOnInit (view subscription)
  });

  const alphaCell = (cellNumber: number) => component.alphaDisplayCells.find((c) => c.cellLabel === cellNumber.toString());

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('renders the C Volts value and color from the Volts topic', () => {
    heatMap.setCurrentView(SEGMENT, HeatMapView.Voltage);
    push(storage, topics.alphaVolt(SEGMENT, CELL), '3.60');

    expect(alphaCell(CELL)?.value).toBeCloseTo(3.6);
    expect(component.getColor(alphaCell(CELL)!)).toBe('hsl(120, 100%, 50%)'); // (3.6 - 3.0) * 200 = 120
  });

  it('renders the S Volts value and color from the S_Volts topic, reusing the C Volts scale', () => {
    heatMap.setCurrentView(SEGMENT, HeatMapView.SVolts);
    push(storage, topics.alphaSVolt(SEGMENT, CELL), '3.50');

    expect(alphaCell(CELL)?.value).toBeCloseTo(3.5);
    expect(component.getColor(alphaCell(CELL)!)).toBe('hsl(100, 100%, 50%)'); // (3.5 - 3.0) * 200 = 100
  });

  it('shows the no-data grey for an S Volts cell with no value', () => {
    heatMap.setCurrentView(SEGMENT, HeatMapView.SVolts);

    // The last cell is never published to by any test in this suite.
    const cells = component.alphaDisplayCells;
    const untouched = cells[cells.length - 1];
    expect(untouched.value).toBeUndefined();
    expect(component.getColor(untouched)).toBe(GREY);
  });

  it('renders Open Wire true as red TRUE from the OW topic, mirroring CvS Failure', () => {
    heatMap.setCurrentView(SEGMENT, HeatMapView.OpenWire);
    push(storage, topics.alphaOw(SEGMENT, CELL), '1');

    expect(alphaCell(CELL)?.boolValue).toBe(true);
    expect(component.getColor(alphaCell(CELL)!)).toBe('#de3232');
  });

  it('fills a failed CvS cell in a red its black text reads on at AA (#dc2626 measured 4.35:1)', () => {
    heatMap.setCurrentView(SEGMENT, HeatMapView.CvsFailure);
    push(storage, topics.alphaCvs(SEGMENT, CELL), '1');

    expect(alphaCell(CELL)?.boolValue).toBe(true);
    expect(contrastWithBlack(component.getColor(alphaCell(CELL)!))).toBeGreaterThanOrEqual(4.5);
  });

  it('fills a balancing cell in a blue its black text reads on at AA (#4169e1 measured 4.33:1)', () => {
    heatMap.setCurrentView(SEGMENT, HeatMapView.Balancing);
    push(storage, topics.alphaBurning(SEGMENT, CELL), '1');

    expect(alphaCell(CELL)?.boolValue).toBe(true);
    expect(contrastWithBlack(component.getColor(alphaCell(CELL)!))).toBeGreaterThanOrEqual(4.5);
  });

  it('renders Open Wire false as green FALSE from the OW topic', () => {
    heatMap.setCurrentView(SEGMENT, HeatMapView.OpenWire);
    push(storage, topics.alphaOw(SEGMENT, CELL), '0');

    expect(alphaCell(CELL)?.boolValue).toBe(false);
    expect(component.getColor(alphaCell(CELL)!)).toBe('#16a34a');
  });

  it('shows the no-data grey for an Open Wire cell with no value', () => {
    heatMap.setCurrentView(SEGMENT, HeatMapView.OpenWire);

    const cells = component.alphaDisplayCells;
    const untouched = cells[cells.length - 1];
    expect(untouched.boolValue).toBeUndefined();
    expect(component.getColor(untouched)).toBe(GREY);
  });

  it('keeps Open Wire and CvS as independent readings for the same cell', () => {
    push(storage, topics.alphaCvs(SEGMENT, CELL), '0');
    push(storage, topics.alphaOw(SEGMENT, CELL), '1');

    heatMap.setCurrentView(SEGMENT, HeatMapView.CvsFailure);
    expect(alphaCell(CELL)?.boolValue).toBe(false);

    heatMap.setCurrentView(SEGMENT, HeatMapView.OpenWire);
    expect(alphaCell(CELL)?.boolValue).toBe(true);
  });

  it('keeps C Volts and S Volts as independent readings for the same cell', () => {
    push(storage, topics.alphaVolt(SEGMENT, CELL), '3.10');
    push(storage, topics.alphaSVolt(SEGMENT, CELL), '3.50');

    heatMap.setCurrentView(SEGMENT, HeatMapView.Voltage);
    expect(alphaCell(CELL)?.value).toBeCloseTo(3.1);

    heatMap.setCurrentView(SEGMENT, HeatMapView.SVolts);
    expect(alphaCell(CELL)?.value).toBeCloseTo(3.5);
  });

  describe('tiles', () => {
    /** Re-render after a storage push or a view change, which reach the component outside a signal. */
    const render = () => {
      fixture.componentRef.injector.get(ChangeDetectorRef).markForCheck();
      fixture.detectChanges();
    };
    /** The alpha row's tiles, in display order (cell 0 first). */
    const alphaTiles = (): HTMLButtonElement[] =>
      Array.from(fixture.nativeElement.querySelectorAll(':scope > div > div:last-child button'));
    const tile = (cellNumber: number) =>
      alphaTiles()[component.alphaDisplayCells.findIndex((c) => c.cellLabel === `${cellNumber}`)];

    /** A key press as the browser does it: Enter and Space activate a native button with a click. */
    const press = (target: HTMLElement, key: string) => {
      const down = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
      target.dispatchEvent(down);
      if (!down.defaultPrevented && (key === 'Enter' || key === ' ') && target instanceof HTMLButtonElement) target.click();
    };

    it('are native buttons in the tab order', () => {
      const buttons: HTMLButtonElement[] = Array.from(fixture.nativeElement.querySelectorAll('hex-tile button'));
      expect(buttons.length).toBe(component.alphaDisplayCells.length + component.betaDisplayCells.length);
      for (const button of buttons) {
        expect(button.type).toBe('button');
        expect(button.disabled).toBe(false);
        expect(button.tabIndex).toBe(0);
      }
    });

    it('toggle their cell from Enter or Space, exposing it as aria-pressed', () => {
      const button = tile(CELL);
      expect(button.getAttribute('aria-pressed')).toBe('false');
      for (const [key, pressed] of [
        ['Enter', 'true'],
        [' ', 'false']
      ] as const) {
        button.focus();
        press(button, key);
        render();
        expect(heatMap.anySelected(alphaCell(CELL)!.readings)).toBe(pressed === 'true');
        expect(tile(CELL).getAttribute('aria-pressed')).toBe(pressed);
        expect(document.activeElement).toBe(tile(CELL));
      }
    });

    it('are named by their cell and value, with its unit', () => {
      heatMap.setCurrentView(SEGMENT, HeatMapView.Voltage);
      push(storage, topics.alphaVolt(SEGMENT, CELL), '3.60');
      render();
      expect(tile(CELL).getAttribute('aria-label')).toBe('Cell 0, 3.60 V');
    });

    it('name a tile with no reading by its dash and unit, as no data', () => {
      heatMap.setCurrentView(SEGMENT, HeatMapView.SVolts);
      render();
      const tiles = alphaTiles();
      const last = component.alphaDisplayCells[component.alphaDisplayCells.length - 1];
      expect(tiles[tiles.length - 1].getAttribute('aria-label')).toBe(`Cell ${last.cellLabel}, - V (no data)`);
    });

    it('name a flag view tile by its TRUE or FALSE', () => {
      heatMap.setCurrentView(SEGMENT, HeatMapView.OpenWire);
      push(storage, topics.alphaOw(SEGMENT, CELL), '1');
      render();
      expect(tile(CELL).getAttribute('aria-label')).toBe('Cell 0, TRUE');
    });

    it('name a thermistor tile by every cell it spans', () => {
      heatMap.setCurrentView(SEGMENT, HeatMapView.Temperature);
      render();
      expect(component.alphaDisplayCells[0].cellLabel).toBe('0,1');
      expect(alphaTiles()[0].getAttribute('aria-label')).toMatch(/^Cells 0,1, /);
    });

    /** WCAG 2.5.3 Label in Name: every piece of a tile's visible text is in its name, in the order shown. */
    it.each([HeatMapView.Voltage, HeatMapView.SVolts, HeatMapView.Temperature, HeatMapView.Balancing, HeatMapView.OpenWire])(
      'name every tile with its visible text in order (%s)',
      (view) => {
        heatMap.setCurrentView(SEGMENT, view);
        push(storage, topics.alphaVolt(SEGMENT, CELL), '3.60');
        push(storage, topics.alphaOw(SEGMENT, CELL), '1');
        render();
        const buttons: HTMLButtonElement[] = Array.from(fixture.nativeElement.querySelectorAll('hex-tile button'));
        expect(buttons.length).toBeGreaterThan(0);
        for (const button of buttons) {
          const name = button.getAttribute('aria-label') ?? '';
          let from = 0;
          // The text of each leaf (number, value, unit); Angular drops the whitespace between them.
          const pieces = Array.from(button.querySelectorAll('span, sup'))
            .filter((e) => !e.children.length)
            .map((e) => e.textContent!.trim());
          for (const piece of pieces) {
            const at = name.indexOf(piece, from);
            expect(at, `"${piece}" of ${JSON.stringify(pieces)} in "${name}"`).toBeGreaterThanOrEqual(0);
            from = at + piece.length;
          }
        }
      }
    );
  });
});
