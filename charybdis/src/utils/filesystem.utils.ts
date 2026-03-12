import * as fs from "fs";

/**
 * Creates a folder at the specified path, if it doesn't already exist.
 *
 * @param folderPath the path to the folder to create
 */
export async function createFolder(folderPath: string) {
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath);
    console.info(`Folder created at: ${folderPath}`);
  } else {
    console.info(`Folder already exists at: ${folderPath}`);
  }
}

/**
 * Creates a file at the specified path, if it doesn't already exist.
 *
 * @param filePath the path to the file to create
 */
export async function createFile(filePath: string) {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, "");
    console.info(`Folder created at: ${filePath}`);
  }
}

/**
 * Creates a file name formatted with the given date.
 * DOES NOT ACTUALLY CREATE THE FILE.
 *
 * In the format: "name_yyyy-mm-dd__hr-min-sec-ms"
 * @param name The name of the file
 * @param date The date to format
 * @returns The formatted file name
 */
export function createMeaningfulFileName(name: string, date: Date): string {
  // Format the date as "yyyy_month_day-hr_minute_ms"
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  const hours = String(date.getUTCHours()).padStart(2, "0");
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");
  const seconds = String(date.getUTCSeconds()).padStart(2, "0");
  const milliseconds = String(date.getUTCMilliseconds()).padStart(3, "0");

  const formattedDate = `${year}-${month}-${day}__${hours}-${minutes}-${seconds}-${milliseconds}`;

  // Combine the sanitized file name with the formatted date
  return `${name}_${formattedDate}`;
}
