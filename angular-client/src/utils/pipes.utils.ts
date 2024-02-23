export const datePipe = (date: Date) => {
  return date.toLocaleString();
};

export const floatPipe = (value: string): number => {
  return Math.round(parseFloat(value));
};
