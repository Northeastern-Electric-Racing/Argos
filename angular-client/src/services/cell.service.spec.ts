import { TestBed } from '@angular/core/testing';
import { CellService } from './cell.service';
import Storage, { TOPIC_SWEEP_MS } from './storage.service';
import { DataValue } from 'src/utils/socket.utils';
import { topics } from 'src/utils/topic.utils';

/** Ends the task, which adds the topics first read in it, then waits out the cell teardown's delay and the sweep after it. */
const flush = async () => {
  await Promise.resolve();
  vi.advanceTimersByTime(2 * TOPIC_SWEEP_MS);
};

const push = (storage: Storage, key: string, value: string): void => {
  storage.addValue(key, { values: [value], time: '0', unit: '' } as DataValue);
};

const isCellTopic = (topic: string) => topic.startsWith('BMS/PerCell/');

/** 2 chips x (7 therms + 13 each of volts, S volts, burns, CvS and open wire). */
const SEGMENT_TOPIC_COUNT = 144;
/** Every segment's. */
const CELL_TOPIC_COUNT = 5 * SEGMENT_TOPIC_COUNT;

describe('CellService', () => {
  let storage: Storage;
  let cells: CellService;
  const releases: (() => void)[] = [];

  const retain = (segments?: number[]) => {
    const release = cells.updateCellInfo(segments);
    releases.push(release);
    return release;
  };

  const cellTopics = () => storage.getTopics().filter(isCellTopic);
  const alphaCell = (segment: number, cell: number) => cells.getAlphaCellsBySegment(segment)[cell];
  const betaCell = (segment: number, cell: number) => cells.getBetaCellsBySegment(segment)[cell];

  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({ providers: [Storage, CellService] });
    storage = TestBed.inject(Storage);
    cells = TestBed.inject(CellService);
  });

  afterEach(() => {
    releases.splice(0).forEach((release) => release());
    // tear the cells down: their readings are shared across tests
    vi.advanceTimersByTime(TOPIC_SWEEP_MS);
    vi.useRealTimers();
  });

  it('subscribes no cell topics until something retains it', async () => {
    await flush();
    expect(cellTopics()).toEqual([]);
  });

  it('subscribes every cell topic while retained', async () => {
    retain();
    await flush();
    expect(cellTopics()).toHaveLength(CELL_TOPIC_COUNT);
    expect(cellTopics()).toContain(topics.alphaVolt(0, 0));
    expect(cellTopics()).toContain(topics.betaOw(4, 12));
  });

  it('keeps the topics while any reader holds them, and drops them once the last releases', async () => {
    const first = retain();
    const second = retain();
    await flush();

    first();
    await flush();
    expect(cellTopics()).toHaveLength(CELL_TOPIC_COUNT);

    second();
    await flush();
    expect(cellTopics()).toEqual([]);
  });

  it('counts a repeated release once', async () => {
    const first = retain();
    retain();
    first();
    first();
    await flush();
    expect(cellTopics()).toHaveLength(CELL_TOPIC_COUNT);
  });

  it('fills cell readings from their topics while retained', () => {
    retain();
    push(storage, topics.alphaVolt(1, 3), '3.61');
    push(storage, topics.betaSVolt(2, 4), '3.52');
    push(storage, topics.alphaTemp(0, 2), '31.5'); // therm 2 covers cells 2 and 3
    push(storage, topics.betaBurning(3, 5), '1');
    push(storage, topics.alphaCvs(4, 6), '0');
    push(storage, topics.betaOw(0, 7), '1');

    expect(alphaCell(1, 3).voltage).toBeCloseTo(3.61);
    expect(betaCell(2, 4).svolts).toBeCloseTo(3.52);
    expect(alphaCell(0, 2).temp).toBeCloseTo(31.5);
    expect(alphaCell(0, 3).temp).toBeCloseTo(31.5);
    expect(betaCell(3, 5).balancing).toBe(true);
    expect(alphaCell(4, 6).cvs).toBe(false);
    expect(betaCell(0, 7).ow).toBe(true);
  });

  it('subscribes only the segments asked for', async () => {
    retain([2]);
    await flush();
    expect(cellTopics()).toHaveLength(SEGMENT_TOPIC_COUNT);
    expect(cellTopics().every((topic) => topic.includes('/2/'))).toBe(true);
  });

  it("holds a segment while any reader holds it, as the overview and a segment's own page", async () => {
    const overview = retain();
    retain([2]);
    overview();
    await flush();
    expect(cellTopics()).toHaveLength(SEGMENT_TOPIC_COUNT);
  });

  it('keeps the readings when read again within the teardown delay, as on a BMS page switch', () => {
    const leaving = retain();
    push(storage, topics.alphaVolt(0, 0), '3.40');
    leaving();
    vi.advanceTimersByTime(TOPIC_SWEEP_MS - 1);
    retain([0]);
    vi.advanceTimersByTime(TOPIC_SWEEP_MS);
    expect(alphaCell(0, 0).voltage).toBeCloseTo(3.4);
  });

  it('shows no stale readings once the topics were released', () => {
    const release = retain();
    push(storage, topics.alphaVolt(0, 0), '3.40');
    release();
    expect(alphaCell(0, 0).voltage).toBeCloseTo(3.4);
    vi.advanceTimersByTime(TOPIC_SWEEP_MS);
    expect(alphaCell(0, 0).voltage).toBeUndefined();

    retain();
    expect(alphaCell(0, 0).voltage).toBeUndefined();
    push(storage, topics.alphaVolt(0, 0), '3.45');
    expect(alphaCell(0, 0).voltage).toBeCloseTo(3.45);
  });

  it('ignores values that arrive while nothing retains it', () => {
    push(storage, topics.alphaVolt(0, 0), '3.40');
    retain();
    expect(alphaCell(0, 0).voltage).toBeUndefined();
  });
});
