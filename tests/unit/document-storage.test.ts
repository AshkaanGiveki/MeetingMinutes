import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getDocumentDirectory } from '../../src/server/services/document-storage';

afterEach(() => vi.unstubAllEnvs());

describe('PDF document storage', () => {
  it('keeps local storage in the working directory', () => {
    vi.stubEnv('VERCEL', '');
    vi.stubEnv('DOCUMENT_STORAGE_PATH', '');
    expect(getDocumentDirectory()).toBe(path.resolve('storage/documents'));
  });

  it('uses temporary storage for the default on Vercel', () => {
    vi.stubEnv('VERCEL', '1');
    vi.stubEnv('DOCUMENT_STORAGE_PATH', '');
    expect(getDocumentDirectory()).toBe(path.resolve(os.tmpdir(), 'accord/storage/documents'));
  });

  it('relocates configured relative paths on Vercel', () => {
    vi.stubEnv('VERCEL', '1');
    vi.stubEnv('DOCUMENT_STORAGE_PATH', './storage/documents');
    expect(getDocumentDirectory()).toBe(path.resolve(os.tmpdir(), 'accord/storage/documents'));
  });

  it('honors explicit absolute storage paths', () => {
    vi.stubEnv('VERCEL', '1');
    const directory = path.resolve(os.tmpdir(), 'custom-pdfs');
    vi.stubEnv('DOCUMENT_STORAGE_PATH', directory);
    expect(getDocumentDirectory()).toBe(directory);
  });
});
