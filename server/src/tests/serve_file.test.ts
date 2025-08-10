import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { filesTable } from '../db/schema';
import { type GetFileByIdInput } from '../schema';
import { serveFile } from '../handlers/serve_file';
import { eq } from 'drizzle-orm';

describe('serveFile', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should retrieve file metadata by ID', async () => {
    // Insert a test file record
    const testFile = {
      original_name: 'test-document.pdf',
      file_path: '/uploads/test-document-123.pdf',
      file_size: 1024000,
      mime_type: 'application/pdf'
    };

    const insertResult = await db.insert(filesTable)
      .values(testFile)
      .returning()
      .execute();

    const createdFile = insertResult[0];

    // Test the handler
    const input: GetFileByIdInput = {
      id: createdFile.id
    };

    const result = await serveFile(input);

    // Verify result
    expect(result).not.toBeNull();
    expect(result!.id).toEqual(createdFile.id);
    expect(result!.original_name).toEqual('test-document.pdf');
    expect(result!.file_path).toEqual('/uploads/test-document-123.pdf');
    expect(result!.file_size).toEqual(1024000);
    expect(result!.mime_type).toEqual('application/pdf');
    expect(result!.upload_date).toBeInstanceOf(Date);
  });

  it('should return null for non-existent file ID', async () => {
    const input: GetFileByIdInput = {
      id: '550e8400-e29b-41d4-a716-446655440000' // Valid UUID that doesn't exist
    };

    const result = await serveFile(input);

    expect(result).toBeNull();
  });

  it('should handle different file types correctly', async () => {
    // Insert multiple test files
    const testFiles = [
      {
        original_name: 'image.jpg',
        file_path: '/uploads/image-456.jpg',
        file_size: 500000,
        mime_type: 'image/jpeg'
      },
      {
        original_name: 'document.txt',
        file_path: '/uploads/document-789.txt',
        file_size: 1024,
        mime_type: 'text/plain'
      },
      {
        original_name: 'video.mp4',
        file_path: '/uploads/video-101.mp4',
        file_size: 50000000,
        mime_type: 'video/mp4'
      }
    ];

    const insertResults = await db.insert(filesTable)
      .values(testFiles)
      .returning()
      .execute();

    // Test each file
    for (let i = 0; i < testFiles.length; i++) {
      const createdFile = insertResults[i];
      const testFile = testFiles[i];

      const input: GetFileByIdInput = {
        id: createdFile.id
      };

      const result = await serveFile(input);

      expect(result).not.toBeNull();
      expect(result!.id).toEqual(createdFile.id);
      expect(result!.original_name).toEqual(testFile.original_name);
      expect(result!.file_path).toEqual(testFile.file_path);
      expect(result!.file_size).toEqual(testFile.file_size);
      expect(result!.mime_type).toEqual(testFile.mime_type);
      expect(result!.upload_date).toBeInstanceOf(Date);
    }
  });

  it('should verify database record exists after retrieval', async () => {
    // Insert a test file
    const testFile = {
      original_name: 'verification-test.zip',
      file_path: '/uploads/verification-test-999.zip',
      file_size: 2048000,
      mime_type: 'application/zip'
    };

    const insertResult = await db.insert(filesTable)
      .values(testFile)
      .returning()
      .execute();

    const createdFile = insertResult[0];

    // Use the handler to retrieve the file
    const input: GetFileByIdInput = {
      id: createdFile.id
    };

    const result = await serveFile(input);

    // Verify the file still exists in database
    const dbFiles = await db.select()
      .from(filesTable)
      .where(eq(filesTable.id, createdFile.id))
      .execute();

    expect(dbFiles).toHaveLength(1);
    expect(dbFiles[0].id).toEqual(result!.id);
    expect(dbFiles[0].original_name).toEqual(result!.original_name);
    expect(dbFiles[0].file_path).toEqual(result!.file_path);
    expect(dbFiles[0].file_size).toEqual(result!.file_size);
    expect(dbFiles[0].mime_type).toEqual(result!.mime_type);
  });

  it('should handle large file sizes correctly', async () => {
    // Insert a test file with large size
    const testFile = {
      original_name: 'large-video.mov',
      file_path: '/uploads/large-video-555.mov',
      file_size: 199 * 1024 * 1024, // Just under 200MB limit
      mime_type: 'video/quicktime'
    };

    const insertResult = await db.insert(filesTable)
      .values(testFile)
      .returning()
      .execute();

    const createdFile = insertResult[0];

    const input: GetFileByIdInput = {
      id: createdFile.id
    };

    const result = await serveFile(input);

    expect(result).not.toBeNull();
    expect(result!.file_size).toEqual(199 * 1024 * 1024);
    expect(typeof result!.file_size).toBe('number');
  });
});