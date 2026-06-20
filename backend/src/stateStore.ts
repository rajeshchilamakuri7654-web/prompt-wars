/**
 * stateStore.ts
 * UserStateStore — reads and writes user session state as JSON files.
 * Implements path-traversal protection, file-size limits, and schema
 * validation before any write operation.
 */

import { promises as fs } from 'fs';
import path from 'path';
import { z } from 'zod';
import { CarbonCalculationSchema } from './schema';

/* ──────────────────────────────────────────────────────────────
   Configuration
────────────────────────────────────────────────────────────── */

/** Absolute path to the local data directory (gitignored). */
const DATA_DIR = path.resolve(process.cwd(), 'data');

/** Maximum number of bytes allowed per state file (~50KB). */
const MAX_FILE_BYTES = 50 * 1024;

/* ──────────────────────────────────────────────────────────────
   Schema for the full persisted session document
────────────────────────────────────────────────────────────── */

const SessionDocumentSchema = z.object({
  sessionId:  z.string().uuid(),
  createdAt:  z.string().datetime(),
  updatedAt:  z.string().datetime(),
  inputs:     CarbonCalculationSchema,
  totalKg:    z.number().nonnegative(),
});

export type SessionDocument = z.infer<typeof SessionDocumentSchema>;

/* ──────────────────────────────────────────────────────────────
   UserStateStore
────────────────────────────────────────────────────────────── */

export class UserStateStore {
  /**
   * Ensures the data directory exists, creating it if necessary.
   */
  private async ensureDir(): Promise<void> {
    await fs.mkdir(DATA_DIR, { recursive: true });
  }

  /**
   * Resolves and validates a safe file path for a given sessionId.
   * Throws if the resolved path escapes the data directory
   * (path-traversal protection).
   *
   * @param sessionId - UUID session identifier
   * @throws Error if sessionId contains illegal characters
   */
  private resolvePath(sessionId: string): string {
    // Only allow UUID-safe characters: hex digits and hyphens
    if (!/^[0-9a-f-]{36}$/i.test(sessionId)) {
      throw new Error('Invalid sessionId format');
    }
    const filePath = path.resolve(DATA_DIR, `${sessionId}.json`);

    // Guard against path traversal (belt-and-suspenders)
    if (!filePath.startsWith(DATA_DIR + path.sep)) {
      throw new Error('Path traversal detected');
    }
    return filePath;
  }

  /**
   * Persist a session document to disk.
   *
   * @param doc - Validated SessionDocument to write
   * @throws ZodError if the document fails schema validation
   */
  public async save(doc: SessionDocument): Promise<void> {
    // Validate before touching the filesystem
    SessionDocumentSchema.parse(doc);

    await this.ensureDir();
    const filePath = this.resolvePath(doc.sessionId);
    const content  = JSON.stringify(doc, null, 2);

    if (Buffer.byteLength(content) > MAX_FILE_BYTES) {
      throw new Error('State document exceeds maximum allowed size');
    }

    await fs.writeFile(filePath, content, { encoding: 'utf8' });
  }

  /**
   * Load a session document from disk by sessionId.
   *
   * @param sessionId - UUID of the session to load
   * @returns Parsed and validated SessionDocument, or null if not found
   */
  public async load(sessionId: string): Promise<SessionDocument | null> {
    const filePath = this.resolvePath(sessionId);

    try {
      const raw  = await fs.readFile(filePath, { encoding: 'utf8' });
      const json = JSON.parse(raw);
      return SessionDocumentSchema.parse(json);
    } catch (err: unknown) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        return null; // File simply doesn't exist yet
      }
      throw err;
    }
  }

  /**
   * Delete a session document from disk.
   * Silently ignores "not found" errors.
   *
   * @param sessionId - UUID of the session to delete
   */
  public async delete(sessionId: string): Promise<void> {
    const filePath = this.resolvePath(sessionId);
    try {
      await fs.unlink(filePath);
    } catch (err: unknown) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw err;
      }
    }
  }
}

/** Shared singleton instance imported by routes. */
export const stateStore = new UserStateStore();
