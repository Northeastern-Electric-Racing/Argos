import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { UiDialogService } from 'src/ui/dialog/dialog.service';
import { CellViewComponent } from 'src/pages/bms-debug-page/components/cell-view/cell-view.component';
import { CellReading } from './cell.service';
import { HeatMapService } from './heat-map.service';

describe('HeatMapService cell comparison panel', () => {
  const closed = new Subject<void>();
  const openPanel = vi.fn(() => ({ closed, close: vi.fn() }));

  beforeEach(() => {
    openPanel.mockClear();
    TestBed.configureTestingModule({
      providers: [{ provide: UiDialogService, useValue: { openPanel } }]
    });
  });

  it('opens one compact, draggable, modeless panel through the panel API, with no legacy panel class', () => {
    const heatMap = TestBed.inject(HeatMapService);
    const reading = { cellNumber: 3 } as CellReading;

    heatMap.selectCells([reading], 0 as never, true);
    heatMap.selectCells([{ cellNumber: 4 } as CellReading], 0 as never, true);

    expect(openPanel).toHaveBeenCalledTimes(1);
    const [component, options] = openPanel.mock.calls[0] as unknown as [unknown, Record<string, unknown>];
    expect(component).toBe(CellViewComponent);
    expect(options).toMatchObject({ header: 'Cell Comparison', draggable: true, compact: true });
    expect(options['panelClass']).toBeUndefined();
  });
});
