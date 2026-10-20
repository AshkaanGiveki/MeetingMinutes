import os from 'os';
import path from 'path';

export function getDocumentDirectory(): string {
  const configuredPath = process.env.DOCUMENT_STORAGE_PATH || './storage/documents';
  // Vercel's application directory is read-only; relative paths belong in /tmp.
  if (process.env.VERCEL === '1' && !path.isAbsolute(configuredPath)) {
    return path.resolve(os.tmpdir(), 'accord', configuredPath);
  }
  return path.resolve(configuredPath);
}
