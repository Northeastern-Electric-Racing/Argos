import { Component, createEnvironmentInjector, DestroyRef, EnvironmentInjector, inject, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { QuickViewReadout, QuickViewService } from './quick-view.service';

const readout = (label: string): QuickViewReadout => ({ label, value: signal(1) });

describe('QuickViewService', () => {
  let service: QuickViewService;
  let root: EnvironmentInjector;

  /** An owner standing in for a page or component: destroying it is navigating away. */
  const owner = () => createEnvironmentInjector([], root);

  const labels = () => service.readouts().map((r) => r.label);

  beforeEach(() => {
    service = TestBed.inject(QuickViewService);
    root = TestBed.inject(EnvironmentInjector);
  });

  it('starts empty', () => {
    expect(service.readouts()).toEqual([]);
  });

  it('shows what an owner registers, in order', () => {
    owner().runInContext(() => service.register([readout('SoC'), readout('Pack')]));

    expect(labels()).toEqual(['SoC', 'Pack']);
  });

  it('clears an owner’s readouts when the owner is destroyed', () => {
    const page = owner();
    page.runInContext(() => service.register([readout('SoC')]));

    page.destroy();

    expect(service.readouts()).toEqual([]);
  });

  it('keeps other owners’ readouts when one owner is destroyed', () => {
    const page = owner();
    const widget = owner();
    page.runInContext(() => service.register([readout('SoC')]));
    widget.runInContext(() => service.register([readout('LV')]));

    page.destroy();

    expect(labels()).toEqual(['LV']);
  });

  it('lets an owner withdraw its readouts early', () => {
    const release = owner().runInContext(() => service.register([readout('SoC')]));

    release();

    expect(service.readouts()).toEqual([]);
  });

  it('can register outside an injection context when given the owner’s DestroyRef', () => {
    const page = owner();

    service.register([readout('SoC')], page.get(DestroyRef));
    expect(labels()).toEqual(['SoC']);

    page.destroy();
    expect(service.readouts()).toEqual([]);
  });
});

// Navigation is the real lifecycle that matters: a routed page registers on creation, and the
// router destroying it on navigate-away must leave nothing stale for the next page.
@Component({ selector: 'registering-page', template: 'a' })
class RegisteringPageComponent {
  constructor() {
    inject(QuickViewService).register([readout('From A')]);
  }
}

@Component({ selector: 'plain-page', template: 'b' })
class PlainPageComponent {}

describe('QuickViewService across navigation', () => {
  it('drops a page’s readouts when the router navigates away from it', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'a', component: RegisteringPageComponent },
          { path: 'b', component: PlainPageComponent }
        ])
      ]
    });
    const service = TestBed.inject(QuickViewService);
    const harness = await RouterTestingHarness.create();

    await harness.navigateByUrl('/a');
    expect(service.readouts().map((r) => r.label)).toEqual(['From A']);

    await harness.navigateByUrl('/b');
    expect(service.readouts()).toEqual([]);
  });
});
