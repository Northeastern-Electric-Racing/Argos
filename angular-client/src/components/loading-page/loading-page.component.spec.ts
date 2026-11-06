import { TestBed } from '@angular/core/testing';
import LoadingPageComponent from './loading-page.component';

describe('LoadingPageComponent', () => {
  it('announces loading as a named status', () => {
    const fixture = TestBed.createComponent(LoadingPageComponent);
    fixture.detectChanges();
    const status: HTMLElement = fixture.nativeElement.querySelector('[role="status"]');
    expect(status.getAttribute('aria-label')).toBe('Loading');
  });
});
