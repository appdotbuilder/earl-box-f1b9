import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { filesTable } from '../db/schema';
import { getFileStats } from '../handlers/get_file_stats';

describe('getFileStats', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return zero files when database is empty', async () => {
    const result = await getFileStats();

    expect(result.total_files).toEqual(0);
    expect(typeof result.total_files).toEqual('number');
  });

  it('should return correct count with one file', async () => {
    // Insert one test file
    await db.insert(filesTable)
      .values({
        original_name: 'test-file.txt',
        file_path: '/uploads/test-file.txt',
        file_size: 1024,
        mime_type: 'text/plain'
      })
      .execute();

    const result = await getFileStats();

    expect(result.total_files).toEqual(1);
    expect(typeof result.total_files).toEqual('number');
  });

  it('should return correct count with multiple files', async () => {
    // Insert multiple test files
    await db.insert(filesTable)
      .values([
        {
          original_name: 'document.pdf',
          file_path: '/uploads/document.pdf',
          file_size: 5120,
          mime_type: 'application/pdf'
        },
        {
          original_name: 'image.jpg',
          file_path: '/uploads/image.jpg',
          file_size: 2048,
          mime_type: 'image/jpeg'
        },
        {
          original_name: 'data.csv',
          file_path: '/uploads/data.csv',
          file_size: 3072,
          mime_type: 'text/csv'
        }
      ])
      .execute();

    const result = await getFileStats();

    expect(result.total_files).toEqual(3);
    expect(typeof result.total_files).toEqual('number');
  });

  it('should handle large number of files correctly', async () => {
    // Insert many test files to test performance and accuracy
    const fileData = [];
    for (let i = 0; i < 50; i++) {
      fileData.push({
        original_name: `file-${i}.txt`,
        file_path: `/uploads/file-${i}.txt`,
        file_size: 1024 + i,
        mime_type: 'text/plain'
      });
    }

    await db.insert(filesTable)
      .values(fileData)
      .execute();

    const result = await getFileStats();

    expect(result.total_files).toEqual(50);
    expect(typeof result.total_files).toEqual('number');
  });

  it('should return consistent results on multiple calls', async () => {
    // Insert test files
    await db.insert(filesTable)
      .values([
        {
          original_name: 'file1.txt',
          file_path: '/uploads/file1.txt',
          file_size: 1024,
          mime_type: 'text/plain'
        },
        {
          original_name: 'file2.txt',
          file_path: '/uploads/file2.txt',
          file_size: 2048,
          mime_type: 'text/plain'
        }
      ])
      .execute();

    // Call the handler multiple times
    const result1 = await getFileStats();
    const result2 = await getFileStats();
    const result3 = await getFileStats();

    // All results should be identical
    expect(result1.total_files).toEqual(2);
    expect(result2.total_files).toEqual(2);
    expect(result3.total_files).toEqual(2);
    
    expect(result1).toEqual(result2);
    expect(result2).toEqual(result3);
  });

  it('should verify database state remains unchanged after query', async () => {
    // Insert test files
    await db.insert(filesTable)
      .values({
        original_name: 'test.txt',
        file_path: '/uploads/test.txt',
        file_size: 1024,
        mime_type: 'text/plain'
      })
      .execute();

    // Get count before stats call
    const filesBefore = await db.select().from(filesTable).execute();
    
    // Call getFileStats
    await getFileStats();
    
    // Verify database state is unchanged
    const filesAfter = await db.select().from(filesTable).execute();
    
    expect(filesBefore.length).toEqual(filesAfter.length);
    expect(filesBefore.length).toEqual(1);
    expect(filesBefore[0].original_name).toEqual(filesAfter[0].original_name);
  });
});