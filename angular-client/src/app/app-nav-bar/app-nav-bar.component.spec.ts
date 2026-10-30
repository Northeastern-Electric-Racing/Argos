import type { Mock } from 'vitest';
import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MatTabNavPanel } from '@angular/material/tabs';
import { ToastService } from 'src/services/toast.service';
import { AppNavBarComponent } from './app-nav-bar.component';

// The desktop tab nav bar needs the page panel it controls, as app-context provides.
@Component({
  template: '<app-nav-bar [tabPanel]="panel" /><mat-tab-nav-panel #panel />',
  imports: [AppNavBarComponent, MatTabNavPanel]
})
class HostComponent {}

describe('AppNavBarComponent (desktop)', () => {
  let fixture: ComponentFixture<HostComponent>;
  let toastSpy: { add: Mock };
  let fetchMock: Mock;

  const flush = () => new Promise((resolve) => setTimeout(resolve));

  beforeEach(async () => {
    vi.stubGlobal('innerWidth', 1440);
    fetchMock = vi.fn(() => new Promise(() => {}));
    vi.stubGlobal('fetch', fetchMock);
    toastSpy = { add: vi.fn().mockName('ToastService.add') };

    await TestBed.configureTestingModule({
      imports: [HostComponent],
      providers: [provideRouter([]), { provide: ToastService, useValue: toastSpy }]
    }).compileComponents();

    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
  });

  afterEach(() => vi.unstubAllGlobals());

  const startNewRunButton = (): HTMLButtonElement =>
    Array.from(fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>).find(
      (button) => button.textContent?.trim() === 'Start New Run'
    )!;

  it('renders the page links as tab links with hrefs', () => {
    const links = Array.from(fixture.nativeElement.querySelectorAll('a[mat-tab-link]') as NodeListOf<HTMLAnchorElement>);
    expect(links.map((link) => link.getAttribute('href'))).toEqual(['/charging', '/graph', '/bms', '/efuses']);
    expect(links.every((link) => link.getAttribute('role') === 'tab')).toBe(true);
  });

  it('toasts success only once the server has started the run', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ id: 7 }), { status: 200 }));

    startNewRunButton().click();
    expect(toastSpy.add).not.toHaveBeenCalled();
    await flush();

    expect(toastSpy.add).toHaveBeenCalledWith(expect.objectContaining({ severity: 'success', summary: 'New Run Started' }));
  });

  it('toasts the error, and no success, when starting the run fails', async () => {
    fetchMock.mockResolvedValue(new Response('boom', { status: 500, statusText: 'Server Error' }));

    startNewRunButton().click();
    await flush();

    const severities = toastSpy.add.mock.calls.map(([message]) => message.severity);
    expect(severities).toContain('error');
    expect(severities).not.toContain('success');
  });
});
