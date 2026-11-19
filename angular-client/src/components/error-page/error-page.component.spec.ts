import { TestBed } from '@angular/core/testing';
import ErrorPageComponent from './error-page.component';

describe('ErrorPageComponent', () => {
  it('shows the error message', () => {
    const fixture = TestBed.createComponent(ErrorPageComponent);
    fixture.componentRef.setInput('errorMessage', 'Backend unreachable');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Backend unreachable');
  });
});
