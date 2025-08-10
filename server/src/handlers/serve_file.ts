import { db } from '../db';
import { filesTable } from '../db/schema';
import { type GetFileByIdInput, type File } from '../schema';
import { eq } from 'drizzle-orm';

export const serveFile = async (input: GetFileByIdInput): Promise<File | null> => {
  try {
    // Query the database for the file metadata by UUID
    const results = await db.select()
      .from(filesTable)
      .where(eq(filesTable.id, input.id))
      .execute();

    // Return null if file not found
    if (results.length === 0) {
      return null;
    }

    // Return file metadata for serving the file directly
    const file = results[0];
    return {
      id: file.id,
      original_name: file.original_name,
      file_path: file.file_path,
      file_size: file.file_size,
      mime_type: file.mime_type,
      upload_date: file.upload_date
    };
  } catch (error) {
    console.error('File retrieval failed:', error);
    throw error;
  }
};