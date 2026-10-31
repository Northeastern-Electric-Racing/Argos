import { ValidatorFn, Validators } from '@angular/forms';
import { TuiValidationError } from '@taiga-ui/cdk';
import { TUI_VALIDATION_ERRORS } from '@taiga-ui/core';

/** Validators.required, reporting a message tui-error shows as is, so each field can say what it needs */
export const requiredWithMessage =
  (message: string): ValidatorFn =>
  (control) =>
    Validators.required(control) ? { required: new TuiValidationError(message) } : null;

/** Messages tui-error shows for the rule dialogs' other validators */
export const RULE_VALIDATION_ERRORS = {
  provide: TUI_VALIDATION_ERRORS,
  useValue: { min: 'Must be 0 or greater' }
};
