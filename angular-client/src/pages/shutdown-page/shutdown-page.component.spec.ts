import { ComponentFixture, TestBed } from '@angular/core/testing';
import ShutdownPageComponent from './shutdown-page.component';

describe('ShutdownPageComponent', () => {
  let fixture: ComponentFixture<ShutdownPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [ShutdownPageComponent] }).compileComponents();
    fixture = TestBed.createComponent(ShutdownPageComponent);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('renders banner and strip', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('loop-banner')).toBeTruthy();
    expect(el.querySelector('loop-strip')).toBeTruthy();
    expect(el.textContent).toContain('UNKNOWN — no data from VCU and BMS');
  });
});
