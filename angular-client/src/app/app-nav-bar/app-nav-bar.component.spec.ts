import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MessageService } from 'primeng/api';
import { DialogService } from 'primeng/dynamicdialog';
import { AppNavBarComponent } from './app-nav-bar.component';

describe('AppNavBarComponent: Start New Run', () => {
  let fixture: ComponentFixture<AppNavBarComponent>;
  let component: AppNavBarComponent;
  let messageService: MessageService;
  let resolveFetch: (response: Response) => void;

  const settle = () => new Promise((resolve) => setTimeout(resolve));

  beforeEach(async () => {
    // Only the start-run request resolves; every other request stays pending
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) =>
        String(url).endsWith('/runs/new')
          ? new Promise<Response>((resolve) => (resolveFetch = resolve))
          : new Promise(() => {})
      )
    );
    await TestBed.configureTestingModule({
      imports: [AppNavBarComponent],
      providers: [provideRouter([]), MessageService, DialogService]
    }).compileComponents();

    fixture = TestBed.createComponent(AppNavBarComponent);
    component = fixture.componentInstance;
    messageService = TestBed.inject(MessageService);
    fixture.detectChanges();
  });

  afterEach(() => vi.unstubAllGlobals());

  it('shows the success toast only once the server has started the run', async () => {
    const add = vi.spyOn(messageService, 'add');

    component.onStartNewRun();
    expect(component.newRunIsLoading()).toBe(true);
    expect(add).not.toHaveBeenCalled();

    resolveFetch(new Response(JSON.stringify({ id: 7 }), { status: 200 }));
    await settle();

    expect(component.newRunIsLoading()).toBe(false);
    expect(add).toHaveBeenCalledWith(expect.objectContaining({ severity: 'success', summary: 'New Run Started' }));
  });

  it('shows an error toast and re-enables the button when the request fails', async () => {
    const add = vi.spyOn(messageService, 'add');

    component.onStartNewRun();
    resolveFetch(new Response('', { status: 500, statusText: 'Server Error' }));
    await settle();

    expect(component.newRunIsLoading()).toBe(false);
    expect(add).toHaveBeenCalledWith(expect.objectContaining({ severity: 'error' }));
    expect(add).not.toHaveBeenCalledWith(expect.objectContaining({ severity: 'success' }));
  });
});
