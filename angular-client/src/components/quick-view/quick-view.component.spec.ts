import { createEnvironmentInjector, EnvironmentInjector, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { QuickViewService } from 'src/services/quick-view.service';
import QuickViewComponent from './quick-view.component';

// The shell's single quick view: it renders whatever the registry holds, and nothing otherwise.
describe('QuickViewComponent', () => {
  let fixture: ComponentFixture<QuickViewComponent>;
  let service: QuickViewService;

  const host = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const owner = () => createEnvironmentInjector([], TestBed.inject(EnvironmentInjector));

  beforeEach(() => {
    service = TestBed.inject(QuickViewService);
    fixture = TestBed.createComponent(QuickViewComponent);
    fixture.detectChanges();
  });

  it('renders nothing while no readouts are registered', () => {
    expect(host().querySelector('status-bar')).toBeNull();
  });

  it('renders one chip per registered readout inside the quick view', () => {
    owner().runInContext(() =>
      service.register([
        { label: 'SoC', value: signal(80) },
        { label: 'Pack Voltage', value: signal(400) }
      ])
    );
    fixture.detectChanges();

    expect(host().querySelector('status-bar')).not.toBeNull();
    const labels = [...host().querySelectorAll('quick-view-readout .subtitle')].map((e) => e.textContent?.trim());
    expect(labels).toEqual(['SoC', 'Pack Voltage']);
  });

  it('goes away again when the registering owner is destroyed', () => {
    const page = owner();
    page.runInContext(() => service.register([{ label: 'SoC', value: signal(80) }]));
    fixture.detectChanges();

    page.destroy();
    fixture.detectChanges();

    expect(host().querySelector('status-bar')).toBeNull();
  });
});
