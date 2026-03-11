import { Component, input } from '@angular/core';
import { NgFor, NgClass } from '@angular/common';

/**
 * Seven-segment display component that mimics classic LED displays
 * Shows numbers with red segments on a near-black background
 */
@Component({
  selector: 'seven-segment-display',
  templateUrl: './seven-segment-display.component.html',
  styleUrls: ['./seven-segment-display.component.css'],
  standalone: true,
  imports: [NgFor, NgClass]
})
export default class SevenSegmentDisplayComponent {
  // Input properties
  value = input.required<string>(); // The value to display (e.g., "123.45")
  size = input<string>('medium'); // Size: 'small', 'medium', 'large'

  // Segment mappings for each digit (0-9) and decimal point
  private segmentMap: { [key: string]: boolean[] } = {
    '0': [true, true, true, true, true, true, false],     // a,b,c,d,e,f,g
    '1': [false, true, true, false, false, false, false],
    '2': [true, true, false, true, true, false, true],
    '3': [true, true, true, true, false, false, true],
    '4': [false, true, true, false, false, true, true],
    '5': [true, false, true, true, false, true, true],
    '6': [true, false, true, true, true, true, true],
    '7': [true, true, true, false, false, false, false],
    '8': [true, true, true, true, true, true, true],
    '9': [true, true, true, true, false, true, true],
    ' ': [false, false, false, false, false, false, false], // blank
    '-': [false, false, false, false, false, false, true],  // minus sign
    '.': [false, false, false, false, false, false, false]  // decimal (handled separately)
  };

  /**
   * Get the characters to display including proper spacing for decimals
   */
  getDisplayCharacters(): Array<{ char: string; hasDecimal: boolean }> {
    const valueStr = this.value().toString();
    const result: Array<{ char: string; hasDecimal: boolean }> = [];

    for (let i = 0; i < valueStr.length; i++) {
      const char = valueStr[i];
      
      if (char === '.') {
        // Attach decimal to previous character
        if (result.length > 0) {
          result[result.length - 1].hasDecimal = true;
        }
      } else {
        result.push({ char, hasDecimal: false });
      }
    }

    return result;
  }

  /**
   * Get segment states for a given character
   */
  getSegments(char: string): boolean[] {
    return this.segmentMap[char] || this.segmentMap[' '];
  }

  /**
   * Get CSS class for size
   */
  getSizeClass(): string {
    return `size-${this.size()}`;
  }
}
