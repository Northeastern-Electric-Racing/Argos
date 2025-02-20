export class FailedWriteAuditLog extends Error {
  constructor(message: string) {
    super(`Failed to write to audit log: ${message}`);
  }
}
