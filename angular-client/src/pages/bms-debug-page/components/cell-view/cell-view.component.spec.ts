import { DIALOG_DATA } from '@angular/cdk/dialog';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SelectedCellInfo } from 'src/services/heat-map.service';
import { CellService } from 'src/services/cell.service';
import Storage, { TOPIC_SWEEP_MS } from 'src/services/storage.service';
import { DataValue } from 'src/utils/socket.utils';
import { topics } from 'src/utils/topic.utils';
import { CellViewComponent } from './cell-view.component';

describe('CellViewComponent', () => {
  let component: CellViewComponent;
  let fixture: ComponentFixture<CellViewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CellViewComponent],
      providers: [{ provide: DIALOG_DATA, useValue: { cells: new Map() } }]
    }).compileComponents();

    fixture = TestBed.createComponent(CellViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('colours balancing and CvS values with AA text tokens, never the raw tile colours', () => {
    const cell = { reading: { balancing: true, cvs: true }, cellNum: 3, segment: 0 } as unknown as SelectedCellInfo;
    const classOf = (label: string) => component.rows.find((r) => r.label === label)!.getClass!(cell);
    expect(classOf('Balancing')).toBe('text-info');
    expect(classOf('CvS Failure')).toBe('text-accent-fg');
    cell.reading.balancing = false;
    cell.reading.cvs = false;
    expect(classOf('Balancing')).toBe('text-warn');
    expect(classOf('CvS Failure')).toBe('text-success');
  });

  /** The panel stays open across navigation, so it keeps its cells live even off the BMS pages. */
  it('keeps the selected cells live while open', () => {
    const storage = TestBed.inject(Storage);
    const [reading] = TestBed.inject(CellService).getAlphaCellsBySegment(0);
    storage.addValue(topics.alphaVolt(0, 0), { values: ['3.70'], time: '0', unit: 'V' } as DataValue);
    expect(reading.voltage).toBeCloseTo(3.7);

    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    fixture.destroy();
    vi.advanceTimersByTime(TOPIC_SWEEP_MS); // the cell teardown's delay
    expect(reading.voltage).toBeUndefined();
    vi.useRealTimers();
  });
});
