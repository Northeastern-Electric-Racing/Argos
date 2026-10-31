import { TestBed } from '@angular/core/testing';
import { filter, firstValueFrom } from 'rxjs';
import APIService from './api.service';

describe('APIService', () => {
  let service: APIService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(APIService);
  });

  /** The message of the one error a failed request reports. */
  const errorFor = (response: Response): Promise<string> => {
    const query = service.query(() => Promise.resolve(response));
    return firstValueFrom(query.error.pipe(filter(Boolean))).then((error) => error.message);
  };

  it("reports the server's plain-text reason", async () => {
    const response = new Response('Could not connect to db: pool timed out', { status: 500, statusText: 'Server Error' });
    expect(await errorFor(response)).toBe('Could not connect to db: pool timed out');
  });

  it('cuts a long reason to 200 characters', async () => {
    const message = await errorFor(new Response('x'.repeat(500), { status: 500 }));
    expect(message).toBe('x'.repeat(199) + '…');
  });

  it('reports the status text instead of a body that is not plain text', async () => {
    const page = new Response('<html><body>Bad gateway</body></html>', {
      status: 502,
      statusText: 'Bad Gateway',
      headers: { 'content-type': 'text/html' }
    });
    expect(await errorFor(page)).toBe('Bad Gateway');
  });

  it('reports the status code when there is no reason or status text', async () => {
    expect(await errorFor(new Response('', { status: 503, statusText: '' }))).toBe('HTTP 503');
  });

  it('reports one error and no data for a failed request', async () => {
    const query = service.query(() => Promise.resolve(new Response('nope', { status: 500 })));
    const errors: string[] = [];
    query.error.pipe(filter(Boolean)).subscribe((error) => errors.push(error.message));
    await new Promise((resolve) => setTimeout(resolve));
    expect(errors).toEqual(['nope']);
    expect(query.data.value).toBeNull();
  });
});
