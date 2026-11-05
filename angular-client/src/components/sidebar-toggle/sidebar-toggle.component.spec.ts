import { TestBed } from '@angular/core/testing';
import SidebarService from 'src/services/sidebar.service';
import SidebarToggleComponent from './sidebar-toggle.component';

describe('SidebarToggleComponent', () => {
  it('is a named button that opens the nav drawer', () => {
    const fixture = TestBed.createComponent(SidebarToggleComponent);
    fixture.detectChanges();
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('button');
    expect(button.getAttribute('aria-label')).toBe('Open navigation');
    const service = TestBed.inject(SidebarService);
    button.click();
    expect(service.isOpen.value).toBe(true);
  });
});
