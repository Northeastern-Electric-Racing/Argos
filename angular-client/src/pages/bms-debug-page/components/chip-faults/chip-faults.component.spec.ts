import { ComponentFixture, TestBed } from '@angular/core/testing';
import Storage from 'src/services/storage.service';
import { Chip } from 'src/utils/bms.utils';
import { allChipFaults, topics } from 'src/utils/topic.utils';

import { ChipFaultsComponent } from './chip-faults.component';

describe('ChipFaultsComponent', () => {
  let component: ChipFaultsComponent;
  let fixture: ComponentFixture<ChipFaultsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChipFaultsComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(ChipFaultsComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('chip', Chip.Alpha);
    fixture.componentRef.setInput('segment', 0);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('lists each fault that arrives, newest first', async () => {
    const storage = TestBed.inject(Storage);
    const [first, second] = allChipFaults;
    storage.addValue(topics.chipFault(0, Chip.Alpha, first), { values: ['1'], time: '1000', unit: '' });
    storage.addValue(topics.chipFault(0, Chip.Alpha, second), { values: ['1'], time: '2000', unit: '' });
    fixture.detectChanges();
    await fixture.whenStable();

    const rows: HTMLElement[] = Array.from(fixture.nativeElement.querySelectorAll('tbody tr.fault-row'));
    expect(rows.map((row) => row.querySelector('td')?.textContent?.trim())).toEqual([
      `PerCell/Alpha/0/${second}`,
      `PerCell/Alpha/0/${first}`
    ]);
  });
});
