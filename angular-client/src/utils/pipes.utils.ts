export const datePipe = (date: Date) => {
  return date.toLocaleString();
};

export const floatPipe = (value: string): number => {
  return Math.round(parseFloat(value));
};

//rounds number to one decimal place
export const decimalPipe = (value: string): number => {
  return Math.round(parseFloat(value) * 10) / 10;
};
