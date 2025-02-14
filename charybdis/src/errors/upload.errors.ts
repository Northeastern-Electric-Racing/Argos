export class CouldNotConnectToCloudDB extends Error {
  constructor(message: string = "") {
    super(`Could not connect to cloud database: ${message}`);
  }
}

export class DataTypeUploadError extends Error {
  constructor(message: string) {
    super("Failed to upload data types: " + message);
  }
}

export class RunsUploadError extends Error {
  constructor(message: string) {
    super("Failed to upload runs: " + message);
  }
}

export class DataUploadError extends Error {
  constructor(message: string) {
    super("Failed to upload data: " + message);
  }
}
