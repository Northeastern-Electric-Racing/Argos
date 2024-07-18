export const datePipe = (date: Date) => {
  date = new Date(date);
  return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()} - ${date.getHours()}:${date.getMinutes()}`;
};

export const convertUTCtoLocal = (utcTimeInMs: number): number => {
  // Create a Date object from the UTC time in milliseconds since epoch and convert it to local time
  const date = new Date(utcTimeInMs);

  // Convert the Date object back to time in milliseconds since epoch
  const localTimeInMs = date.getTime() - date.getTimezoneOffset() * 60 * 1000;

  return localTimeInMs;
};

export const floatPipe = (value: string): number => {
  return Math.round(parseFloat(value));
};

//rounds number to specified number of decimal places (defaults to 1)
export const decimalPipe = (value: string, places?: number): number => {
  const decimalMultiplier = 10 ** (places || 1);
  return Math.round(parseFloat(value) * decimalMultiplier) / decimalMultiplier;
};
