import { FormControl } from '@angular/forms';
import { TuiValidationError } from '@taiga-ui/cdk';
import { requiredWithMessage } from './rule-validators';

describe('requiredWithMessage', () => {
  it('reports the field-specific message when empty', () => {
    const control = new FormControl<string | null>(null, requiredWithMessage('Pick a topic from the list'));
    expect(control.errors?.['required']).toEqual(new TuiValidationError('Pick a topic from the list'));
  });

  it('passes when the field has a value', () => {
    const control = new FormControl('BMS/Pack/Voltage', requiredWithMessage('Pick a topic from the list'));
    expect(control.errors).toBeNull();
  });
});
