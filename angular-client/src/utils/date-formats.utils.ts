import { MatDateFormats } from '@angular/material/core';

/**
 * Native-adapter formats for the datepicker and timepicker: ISO-like dates and 24-hour times
 * with seconds, matching how the rest of the client shows timestamps.
 */
export const DATE_FORMATS: MatDateFormats = {
  parse: {
    dateInput: null,
    timeInput: null
  },
  display: {
    dateInput: { year: 'numeric', month: '2-digit', day: '2-digit' },
    timeInput: { hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' },
    monthYearLabel: { year: 'numeric', month: 'short' },
    dateA11yLabel: { year: 'numeric', month: 'long', day: 'numeric' },
    monthYearA11yLabel: { year: 'numeric', month: 'long' },
    timeOptionLabel: { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }
  }
};
