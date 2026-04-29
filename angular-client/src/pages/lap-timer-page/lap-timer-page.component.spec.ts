import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BehaviorSubject, Subject } from 'rxjs';
import Storage from 'src/services/storage.service';
import { DataValue } from 'src/utils/socket.utils';
import { LAP_STORE_STORAGE_KEY } from 'src/utils/lap-timer.types';
import LapTimerPageComponent from './lap-timer-page.component';

class FakeStorage {
  private currentRunId = new BehaviorSubject<number | undefined>(undefined);
  private streams = new Map<string, Subject<DataValue>>();
  get(key: string): Subject<DataValue> {
    let s = this.streams.get(key);
    if (!s) {
      s = new Subject<DataValue>();
      this.streams.set(key, s);
    }
    return s;
  }
  addValue(key: string, v: DataValue) {
    this.get(key).next(v);
  }
  getCurrentRunId() {
    return this.currentRunId;
  }
  setCurrentRunId(runId?: number) {
    this.currentRunId.next(runId);
  }
}

describe('LapTimerPageComponent', () => {
  let fixture: ComponentFixture<LapTimerPageComponent>;
  let component: LapTimerPageComponent;

  beforeEach(async () => {
    localStorage.removeItem(LAP_STORE_STORAGE_KEY);
    await TestBed.configureTestingModule({
      imports: [LapTimerPageComponent],
      providers: [{ provide: Storage, useValue: new FakeStorage() }]
    }).compileComponents();

    fixture = TestBed.createComponent(LapTimerPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    localStorage.removeItem(LAP_STORE_STORAGE_KEY);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
