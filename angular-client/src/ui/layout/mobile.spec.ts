import { TestBed } from '@angular/core/testing';
import { injectIsMobile } from './mobile';
import { fakeViewport } from './viewport.testing';

describe('injectIsMobile', () => {
  const isMobileAt = (width: number) => {
    const viewport = fakeViewport(width);
    TestBed.configureTestingModule({ providers: [viewport.provider] });
    return { isMobile: TestBed.runInInjectionContext(() => injectIsMobile()), viewport };
  };
  // The browser debounces changes after the first answer to the next macrotask.
  const settle = () => new Promise((resolve) => setTimeout(resolve));

  // Tailwind's max-md applies below 768px, so 768px itself (an iPad in portrait) is not mobile.
  it.each([
    [767, true],
    [768, false],
    [769, false]
  ])('at %ipx wide is mobile: %s', (width, expected) => {
    expect(isMobileAt(width).isMobile()).toBe(expected);
  });

  it('follows the viewport across 768px as it is resized', async () => {
    const { isMobile, viewport } = isMobileAt(1024);
    viewport.resize(767);
    await settle();
    expect(isMobile()).toBe(true);

    viewport.resize(768);
    await settle();
    expect(isMobile()).toBe(false);
  });
});
