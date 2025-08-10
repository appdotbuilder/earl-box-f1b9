import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { filesTable } from '../db/schema';
import { type UploadFileInput } from '../schema';
import { uploadFile } from '../handlers/upload_file';
import { eq } from 'drizzle-orm';
import { readFile, unlink } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';

// Helper function to create base64 encoded test data
function createTestFileData(content: string): string {
  return Buffer.from(content).toString('base64');
}

// Simple test input with text file
const testInput: UploadFileInput = {
  original_name: 'test.txt',
  file_data: createTestFileData('Hello, world!'),
  mime_type: 'text/plain',
  file_size: Buffer.from('Hello, world!').length,
};

// Image test input
const imageTestInput: UploadFileInput = {
  original_name: 'test-image.png',
  file_data: createTestFileData('fake-png-data-for-testing'),
  mime_type: 'image/png',
  file_size: Buffer.from('fake-png-data-for-testing').length,
};

describe('uploadFile', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should upload a text file successfully', async () => {
    const result = await uploadFile(testInput);

    // Validate response structure
    expect(result.id).toBeDefined();
    expect(typeof result.id).toBe('string');
    expect(result.public_link).toBe(`/file/${result.id}`);
    expect(result.original_name).toBe('test.txt');
    expect(result.file_size).toBe(testInput.file_size);
    expect(result.upload_date).toBeInstanceOf(Date);
  });

  it('should save file metadata to database', async () => {
    const result = await uploadFile(testInput);

    // Query database to verify file was saved
    const files = await db.select()
      .from(filesTable)
      .where(eq(filesTable.id, result.id))
      .execute();

    expect(files).toHaveLength(1);
    const savedFile = files[0];
    
    expect(savedFile.id).toBe(result.id);
    expect(savedFile.original_name).toBe('test.txt');
    expect(savedFile.file_size).toBe(testInput.file_size);
    expect(savedFile.mime_type).toBe('text/plain');
    expect(savedFile.upload_date).toBeInstanceOf(Date);
    expect(savedFile.file_path).toMatch(new RegExp(`uploads.*${result.id}\\.txt$`));
  });

  it('should save file data to filesystem', async () => {
    const result = await uploadFile(testInput);

    // Query database to get file path
    const files = await db.select()
      .from(filesTable)
      .where(eq(filesTable.id, result.id))
      .execute();

    const savedFile = files[0];
    
    // Verify file exists on filesystem
    expect(existsSync(savedFile.file_path)).toBe(true);
    
    // Read and verify file content
    const fileContent = await readFile(savedFile.file_path, 'utf8');
    expect(fileContent).toBe('Hello, world!');

    // Clean up test file
    await unlink(savedFile.file_path);
  });

  it('should handle image files with proper extension', async () => {
    const result = await uploadFile(imageTestInput);

    // Query database to verify file extension handling
    const files = await db.select()
      .from(filesTable)
      .where(eq(filesTable.id, result.id))
      .execute();

    const savedFile = files[0];
    expect(savedFile.file_path).toMatch(new RegExp(`uploads.*${result.id}\\.png$`));
    expect(savedFile.mime_type).toBe('image/png');

    // Clean up test file
    if (existsSync(savedFile.file_path)) {
      await unlink(savedFile.file_path);
    }
  });

  it('should handle files without extensions using mime type', async () => {
    const noExtensionInput: UploadFileInput = {
      original_name: 'document',
      file_data: createTestFileData('PDF content'),
      mime_type: 'application/pdf',
      file_size: Buffer.from('PDF content').length,
    };

    const result = await uploadFile(noExtensionInput);

    // Query database to verify mime type extension mapping
    const files = await db.select()
      .from(filesTable)
      .where(eq(filesTable.id, result.id))
      .execute();

    const savedFile = files[0];
    expect(savedFile.file_path).toMatch(new RegExp(`uploads.*${result.id}\\.pdf$`));

    // Clean up test file
    if (existsSync(savedFile.file_path)) {
      await unlink(savedFile.file_path);
    }
  });

  it('should throw error for file size mismatch', async () => {
    const invalidInput: UploadFileInput = {
      original_name: 'test.txt',
      file_data: createTestFileData('Hello, world!'),
      mime_type: 'text/plain',
      file_size: 999, // Incorrect size
    };

    await expect(uploadFile(invalidInput)).rejects.toThrow(/file size mismatch/i);
  });

  it('should handle large file names properly', async () => {
    const longNameInput: UploadFileInput = {
      original_name: 'very-long-file-name-that-tests-our-system-handling-of-extended-names.txt',
      file_data: createTestFileData('Content'),
      mime_type: 'text/plain',
      file_size: Buffer.from('Content').length,
    };

    const result = await uploadFile(longNameInput);
    
    expect(result.original_name).toBe(longNameInput.original_name);
    
    // Verify database entry
    const files = await db.select()
      .from(filesTable)
      .where(eq(filesTable.id, result.id))
      .execute();

    const savedFile = files[0];
    expect(savedFile.original_name).toBe(longNameInput.original_name);

    // Clean up test file
    if (existsSync(savedFile.file_path)) {
      await unlink(savedFile.file_path);
    }
  });

  it('should create uploads directory if it does not exist', async () => {
    const uploadsDir = join(process.cwd(), 'uploads');
    
    // Upload file should create directory
    const result = await uploadFile(testInput);
    
    expect(existsSync(uploadsDir)).toBe(true);
    
    // Clean up test file
    const files = await db.select()
      .from(filesTable)
      .where(eq(filesTable.id, result.id))
      .execute();

    if (files.length > 0 && existsSync(files[0].file_path)) {
      await unlink(files[0].file_path);
    }
  });
});