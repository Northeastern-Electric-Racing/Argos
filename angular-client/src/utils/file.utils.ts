export function downloadAsFile(filename: string, content: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();

  URL.revokeObjectURL(url);
}

export type FileReadErrorKind = 'invalid-extension' | 'read-error';

export class FileReadError extends Error {
  constructor(
    public readonly kind: FileReadErrorKind,
    message: string
  ) {
    super(message);
    this.name = 'FileReadError';
  }
}

export function readTextFile(file: File, allowedExt: string | string[]): Promise<string> {
  const exts = (Array.isArray(allowedExt) ? allowedExt : [allowedExt]).map((e) => e.toLowerCase());
  const lower = file.name.toLowerCase();
  if (!exts.some((ext) => lower.endsWith(ext))) {
    return Promise.reject(new FileReadError('invalid-extension', `Expected ${exts.join(' or ')}`));
  }

  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new FileReadError('read-error', 'Failed to read file'));
    reader.readAsText(file);
  });
}
