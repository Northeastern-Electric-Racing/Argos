// Batch settings
let downloadDataBatch = 1000000;
let uploadDataTypeBatch = 1000;
let dumpFoldersForUpload: string[] | undefined = undefined;

// Database URLs
let cloudUrl = process.env.CLOUD_DATABASE_URL || "";
let localUrl = process.env.LOCAL_DATABASE_URL || "";

/* ------------------- General  Settings ------------------- */

/**
 * Change the dump folders to be used for uploading.
 *
 * @param dumpFoldersForUpload - The new dump folders
 *
 * @returns The dump folders
 */
export function setDumpFoldersForUpload(
  dumpFoldersToAdd: string[] | undefined
) {
  console.log("Setting dump folders for upload as: ", dumpFoldersToAdd);
  dumpFoldersForUpload = dumpFoldersToAdd;
}
/**
 * Get the dump folders to be used for uploading.
 *
 * @returns The dump folders
 */
export function getDumpFoldersForUpload(): string[] | undefined {
  return dumpFoldersForUpload;
}
/**
 * Change the batch size for transforming downloaded data (the table in the database)
 *
 * @param size - The new batch size
 */
export function setTransformDataBatch(size: number) {
  downloadDataBatch = size;
}

/**
 * Get the batch size for trasnforming data.
 *
 * @returns The batch size
 */
export function getTransformingDataBatch(): number {
  return Number(downloadDataBatch);
}

/**
 * Change the batch size for uploading data (the table in the database)
 *
 * @param size - The new batch size
 */
export function setUploadDataTypeBatch(size: number) {
  uploadDataTypeBatch = size;
}

/**
 * Get the batch size for uploading data.
 *
 * @returns The batch size
 */
export function getUploadDataTypeBatch(): number {
  return Number(uploadDataTypeBatch);
}

/* ------------------- Database URL's ------------------- */

/**
 * Change the URL for the local database
 *
 * @param url - The new URL
 */
export function setLocalDbUrl(url: string) {
  localUrl = url;
}

/**
 * Get the URL for the local database
 *
 * @returns The URL
 */
export function getLocalDbUrl(): string {
  return localUrl;
}

/**
 * Change the URL for the cloud database
 *
 * @param url - The new URL
 */
export function setCloudDbUrl(url: string) {
  cloudUrl = url;
}

/**
 * Get the URL for the cloud database
 *
 * @returns The URL
 */
export function getCloudDbUrl(): string {
  return cloudUrl;
}
