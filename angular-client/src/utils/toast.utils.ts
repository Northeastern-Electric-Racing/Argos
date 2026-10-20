import { toast } from '@spartan-ng/brain/sonner';

export type ToastSeverity = 'success' | 'info' | 'warn' | 'error';

const showBySeverity = {
  success: toast.success,
  info: toast.info,
  warn: toast.warning,
  error: toast.error
} as const;

/** Shows a Sonner toast for a severity chosen at runtime; `detail` becomes the description line. */
export function showToast(severity: ToastSeverity, summary: string, detail?: string, duration?: number): void {
  showBySeverity[severity](summary, {
    ...(detail ? { description: detail } : {}),
    ...(duration ? { duration } : {})
  });
}
