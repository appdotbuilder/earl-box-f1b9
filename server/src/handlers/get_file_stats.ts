import { db } from '../db';
import { filesTable } from '../db/schema';
import { count } from 'drizzle-orm';
import { type FileStats } from '../schema';

export const getFileStats = async (): Promise<FileStats> => {
  try {
    // Query the database to count total files
    const result = await db.select({
      total_files: count(filesTable.id)
    })
    .from(filesTable)
    .execute();

    return {
      total_files: result[0].total_files
    };
  } catch (error) {
    console.error('Failed to get file stats:', error);
    throw error;
  }
};