import { db } from '../db';
import { filesTable } from '../db/schema';
import { type GetFileByIdInput, type FileDownloadResponse } from '../schema';
import { eq } from 'drizzle-orm';
import { readFile } from 'fs/promises';
import path from 'path';

export const getFileById = async (input: GetFileByIdInput): Promise<FileDownloadResponse | null> => {
  try {
    // Query the database for the file by UUID
    const files = await db.select()
      .from(filesTable)
      .where(eq(filesTable.id, input.id))
      .execute();

    // Return null if file not found in database
    if (files.length === 0) {
      return null;
    }

    const fileRecord = files[0];

    // Read the file from the uploads folder
    const filePath = path.resolve(fileRecord.file_path);
    let fileData: Buffer;
    
    try {
      fileData = await readFile(filePath);
    } catch (fileError) {
      // File not found on disk - return null
      console.error('File not found on disk:', filePath, fileError);
      return null;
    }

    // Encode the file data as base64
    const base64Data = fileData.toString('base64');

    // Return the file data and metadata
    return {
      id: fileRecord.id,
      original_name: fileRecord.original_name,
      file_data: base64Data,
      mime_type: fileRecord.mime_type,
      file_size: fileRecord.file_size
    };
  } catch (error) {
    console.error('Get file by ID failed:', error);
    throw error;
  }
};