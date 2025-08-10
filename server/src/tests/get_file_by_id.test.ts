import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { filesTable } from '../db/schema';
import { type GetFileByIdInput } from '../schema';
import { getFileById } from '../handlers/get_file_by_id';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { eq } from 'drizzle-orm';

// Test data
const testFileData = 'Hello, World! This is test file content.';
const testBase64Data = Buffer.from(testFileData).toString('base64');

const testInput: GetFileByIdInput = {
  id: '123e4567-e89b-12d3-a456-426614174000' // Valid UUID format
};

describe('getFileById', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return null for non-existent file', async () => {
    const result = await getFileById(testInput);

    expect(result).toBeNull();
  });

  it('should return file data when file exists', async () => {
    // Create uploads directory and test file
    const uploadsDir = path.resolve('./uploads');
    await mkdir(uploadsDir, { recursive: true });
    
    const filePath = path.join(uploadsDir, 'test-file.txt');
    await writeFile(filePath, testFileData);

    // Insert file record into database
    await db.insert(filesTable)
      .values({
        id: testInput.id,
        original_name: 'test-file.txt',
        file_path: filePath,
        file_size: testFileData.length,
        mime_type: 'text/plain'
      })
      .execute();

    const result = await getFileById(testInput);

    expect(result).toBeDefined();
    expect(result!.id).toEqual(testInput.id);
    expect(result!.original_name).toEqual('test-file.txt');
    expect(result!.file_data).toEqual(testBase64Data);
    expect(result!.mime_type).toEqual('text/plain');
    expect(result!.file_size).toEqual(testFileData.length);
  });

  it('should return null when file record exists but file missing from disk', async () => {
    // Insert file record without creating actual file
    await db.insert(filesTable)
      .values({
        id: testInput.id,
        original_name: 'missing-file.txt',
        file_path: '/non/existent/path/missing-file.txt',
        file_size: 100,
        mime_type: 'text/plain'
      })
      .execute();

    const result = await getFileById(testInput);

    expect(result).toBeNull();
  });

  it('should handle binary file data correctly', async () => {
    // Create binary test data (simple PNG-like header)
    const binaryData = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
    const expectedBase64 = binaryData.toString('base64');

    // Create uploads directory and binary test file
    const uploadsDir = path.resolve('./uploads');
    await mkdir(uploadsDir, { recursive: true });
    
    const filePath = path.join(uploadsDir, 'test-image.png');
    await writeFile(filePath, binaryData);

    // Insert file record into database
    await db.insert(filesTable)
      .values({
        id: testInput.id,
        original_name: 'test-image.png',
        file_path: filePath,
        file_size: binaryData.length,
        mime_type: 'image/png'
      })
      .execute();

    const result = await getFileById(testInput);

    expect(result).toBeDefined();
    expect(result!.id).toEqual(testInput.id);
    expect(result!.original_name).toEqual('test-image.png');
    expect(result!.file_data).toEqual(expectedBase64);
    expect(result!.mime_type).toEqual('image/png');
    expect(result!.file_size).toEqual(binaryData.length);
  });

  it('should save file record to database correctly', async () => {
    // Create uploads directory and test file
    const uploadsDir = path.resolve('./uploads');
    await mkdir(uploadsDir, { recursive: true });
    
    const filePath = path.join(uploadsDir, 'verify-db.txt');
    await writeFile(filePath, testFileData);

    // Insert file record into database
    await db.insert(filesTable)
      .values({
        id: testInput.id,
        original_name: 'verify-db.txt',
        file_path: filePath,
        file_size: testFileData.length,
        mime_type: 'text/plain'
      })
      .execute();

    // Call handler
    await getFileById(testInput);

    // Verify database record still exists
    const dbFiles = await db.select()
      .from(filesTable)
      .where(eq(filesTable.id, testInput.id))
      .execute();

    expect(dbFiles).toHaveLength(1);
    expect(dbFiles[0].id).toEqual(testInput.id);
    expect(dbFiles[0].original_name).toEqual('verify-db.txt');
    expect(dbFiles[0].file_path).toEqual(filePath);
    expect(dbFiles[0].file_size).toEqual(testFileData.length);
    expect(dbFiles[0].mime_type).toEqual('text/plain');
    expect(dbFiles[0].upload_date).toBeInstanceOf(Date);
  });
});