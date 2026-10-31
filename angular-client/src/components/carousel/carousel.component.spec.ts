import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { CarouselComponent } from './carousel.component';

describe('CarouselComponent', () => {
  const run = (id: number) => ({ id, driverName: 'Alex', locationName: 'NER Shop', time: new Date(), notes: '' });

  it('names the previous and next run buttons', () => {
    TestBed.configureTestingModule({
      imports: [CarouselComponent],
      providers: [
        provideRouter([]),
        { provide: DynamicDialogRef, useValue: { close: vi.fn() } },
        { provide: DynamicDialogConfig, useValue: { data: { runs: [run(2), run(1)], selectRun: vi.fn() } } }
      ]
    });
    const fixture = TestBed.createComponent(CarouselComponent);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;

    // The names must be on the inner <button>, not the <p-button> host where PrimeNG 21 puts its own
    expect(el.querySelector('button[aria-label="Previous run"]')).toBeTruthy();
    expect(el.querySelector('button[aria-label="Next run"]')).toBeTruthy();
  });
});
