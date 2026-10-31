import { DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormGroup, TouchedChangeEvent } from '@angular/forms';
import { filter } from 'rxjs';

/**
 * nz-form-control re-reads a control's status only on `statusChanges`, so a field that is just blurred (touched,
 * unchanged) or touched by `markAllAsTouched()` on submit wouldn't show its error. Re-validating each control when
 * it becomes touched shows the error then, as the forms did before.
 */
export function revalidateOnTouch(group: FormGroup, destroyRef: DestroyRef): void {
  Object.values(group.controls).forEach((control) =>
    control.events
      .pipe(
        filter((event) => event instanceof TouchedChangeEvent && event.touched),
        takeUntilDestroyed(destroyRef)
      )
      .subscribe(() => control.updateValueAndValidity())
  );
}
