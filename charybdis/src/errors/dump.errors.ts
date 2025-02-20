export class CouldNotConnectToLocalDB extends Error {
  constructor(message: string = "") {
    super(`Could not connect to local database: ${message}`);
  }
}

export class DataTypeDumpFailed extends Error {
  constructor(message: string) {
    super(`Failed to dump data types: ${message}`);
  }
}

export class RunDumpFailed extends Error {
  constructor(message: string) {
    super(`Failed to dump runs: ${message}`);
  }
}

export class DataDumpFailed extends Error {
  constructor(message: string) {
    super(`Failed to dump data: ${message}`);
  }
}
