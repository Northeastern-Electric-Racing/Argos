export enum Chip {
  Alpha = 0,
  Beta = 1
}
export const chipToString = (chip: Chip, singleLetter = false): string => {
  switch (chip) {
    case Chip.Alpha:
      return singleLetter ? 'A' : 'Alpha';
    case Chip.Beta:
      return singleLetter ? 'B' : 'Beta';
    default:
      throw new Error('Invalid chip type ' + chip);
  }
};

/** Segment is a plain numeric index (0-based). */
export type Segment = number;
