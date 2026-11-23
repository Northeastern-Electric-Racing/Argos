import { TestBed } from '@angular/core/testing';
import Storage from 'src/services/storage.service';
import { ShutdownLoopService } from '../../shutdown-loop.service';
import { SHUTDOWN_TOPICS } from '../../shutdown-page.topics';
import { MockPanelComponent } from './mock-panel.component';

describe('MockPanelComponent', () => {
  beforeEach(() => TestBed.configureTestingModule({ imports: [MockPanelComponent], providers: [ShutdownLoopService] }));

  it('shows this client’s status while it publishes, and hands back to scylla when it stops', () => {
    const fixture = TestBed.createComponent(MockPanelComponent);
    const loop = TestBed.inject(ShutdownLoopService);
    expect(loop.preferServer()).toBe(true);
    fixture.componentInstance.togglePublishing();
    expect(loop.preferServer()).toBe(false);
    fixture.componentInstance.togglePublishing();
    expect(loop.preferServer()).toBe(true);
    fixture.componentInstance.togglePublishing();
    fixture.destroy();
    expect(loop.preferServer()).toBe(true);
  });

  it('publishes the TS state, inverted as the BMS sends it', () => {
    const fixture = TestBed.createComponent(MockPanelComponent);
    const add = vi.spyOn(TestBed.inject(Storage), 'addValue');
    fixture.componentInstance.tsOn.set(true);
    fixture.componentInstance.togglePublishing();
    expect(add).toHaveBeenCalledWith(SHUTDOWN_TOPICS.BMS.State, expect.objectContaining({ values: ['0'] }));
    fixture.destroy();
  });
});
