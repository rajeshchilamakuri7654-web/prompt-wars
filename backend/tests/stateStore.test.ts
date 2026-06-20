import { UserStateStore } from '../src/stateStore';
import { SessionDocument } from '../src/stateStore';
import path from 'path';
import { promises as fs } from 'fs';
import { z } from 'zod';

describe('UserStateStore Filesystem State Tests', () => {
  const store = new UserStateStore();
  const testSessionId = '12345678-abcd-ef01-2345-6789abcdef01'; // Valid UUID v4 shape
  const mockInputs = {
    commuteMode: 'ev' as const,
    dailyDistance: 15,
    shortHaulFlights: 0,
    longHaulFlights: 0,
    dietaryProfile: 'vegan' as const,
    housingType: 'apartment' as const,
    powerSource: 'solar' as const,
  };

  const sampleDoc: SessionDocument = {
    sessionId: testSessionId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    inputs: mockInputs,
    totalKg: 875,
  };

  afterEach(async () => {
    try {
      await store.delete(testSessionId);
    } catch {
      // Ignored
    }
  });

  test('Save, load, and delete a valid session state successfully', async () => {
    const loadedInit = await store.load(testSessionId);
    expect(loadedInit).toBeNull();

    await store.save(sampleDoc);

    const loadedDoc = await store.load(testSessionId);
    expect(loadedDoc).not.toBeNull();
    expect(loadedDoc?.sessionId).toBe(testSessionId);
    expect(loadedDoc?.totalKg).toBe(875);
    expect(loadedDoc?.inputs.commuteMode).toBe('ev');

    await store.delete(testSessionId);

    const loadedAfterDelete = await store.load(testSessionId);
    expect(loadedAfterDelete).toBeNull();
  });

  test('Path traversal mitigation rejects suspicious or invalid sessionIds', async () => {
    const maliciousSessionId = '../malicious-file';
    await expect(store.load(maliciousSessionId)).rejects.toThrow('Invalid sessionId format');
    await expect(store.delete(maliciousSessionId)).rejects.toThrow('Invalid sessionId format');
    
    const badUuid = 'not-a-valid-uuid-format-length-short';
    await expect(store.load(badUuid)).rejects.toThrow('Invalid sessionId format');
  });

  test('Path traversal detected when resolved path is outside DATA_DIR', async () => {
    const fakeSessionId = '11111111-2222-3333-4444-555555555555';
    const pathSpy = jest.spyOn(path, 'resolve').mockReturnValueOnce('/escaped/path/outside/data/11111111-2222-3333-4444-555555555555.json');
    await expect(store.load(fakeSessionId)).rejects.toThrow('Path traversal detected');
    pathSpy.mockRestore();
  });

  test('Validation fails on invalid documents', async () => {
    const invalidDoc = {
      sessionId: testSessionId,
      createdAt: 'not-a-date',
      updatedAt: new Date().toISOString(),
      inputs: {
        ...mockInputs,
        commuteMode: 'rocket-ship' // Invalid enum option
      },
      totalKg: -50,
    };

    await expect(store.save(invalidDoc as any)).rejects.toThrow();
  });

  test('Save throws error if document size exceeds limit', async () => {
    // Bypass Zod schema validation using a spy that passes all values through
    const parseSpy = jest.spyOn(z.ZodType.prototype, 'parse').mockImplementation((val) => val);
    
    const hugeDoc = {
      sessionId: testSessionId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      inputs: mockInputs,
      totalKg: 875,
      extraData: 'a'.repeat(60 * 1024), // 60 KB (exceeds 50KB limit)
    };

    await expect(store.save(hugeDoc as any)).rejects.toThrow('State document exceeds maximum allowed size');
    parseSpy.mockRestore();
  });

  test('Catch and rethrow filesystem errors on read exceptions (non-ENOENT)', async () => {
    const fsReadSpy = jest.spyOn(fs, 'readFile');
    const err = new Error('Permission Denied') as any;
    err.code = 'EACCES';
    fsReadSpy.mockRejectedValueOnce(err);

    await expect(store.load(testSessionId)).rejects.toThrow('Permission Denied');
    fsReadSpy.mockRestore();
  });

  test('Catch and rethrow filesystem errors on delete exceptions (non-ENOENT)', async () => {
    const fsUnlinkSpy = jest.spyOn(fs, 'unlink');
    const err = new Error('Permission Denied') as any;
    err.code = 'EACCES';
    fsUnlinkSpy.mockRejectedValueOnce(err);

    await expect(store.delete(testSessionId)).rejects.toThrow('Permission Denied');
    fsUnlinkSpy.mockRestore();
  });
});
