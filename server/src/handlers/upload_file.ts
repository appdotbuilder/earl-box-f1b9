import { db } from '../db';
import { filesTable } from '../db/schema';
import { type UploadFileInput, type UploadFileResponse } from '../schema';
import { randomUUID } from 'crypto';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

export const uploadFile = async (input: UploadFileInput): Promise<UploadFileResponse> => {
  try {
    // Generate a unique UUID for the file
    const fileId = randomUUID();
    
    // Decode base64 file data
    const fileBuffer = Buffer.from(input.file_data, 'base64');
    
    // Verify the decoded file size matches the input size
    if (fileBuffer.length !== input.file_size) {
      throw new Error('File size mismatch: decoded data does not match expected size');
    }
    
    // Create uploads directory if it doesn't exist
    const uploadsDir = join(process.cwd(), 'uploads');
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }
    
    // Generate file path using UUID as filename with proper extension
    const fileExtension = getFileExtension(input.original_name, input.mime_type);
    const fileName = `${fileId}${fileExtension}`;
    const filePath = join(uploadsDir, fileName);
    
    // Save file to uploads folder
    await writeFile(filePath, fileBuffer);
    
    // Store file metadata in database
    const result = await db.insert(filesTable)
      .values({
        id: fileId,
        original_name: input.original_name,
        file_path: filePath,
        file_size: input.file_size,
        mime_type: input.mime_type
      })
      .returning()
      .execute();
    
    const savedFile = result[0];
    
    return {
      id: savedFile.id,
      public_link: `/file/${savedFile.id}`,
      original_name: savedFile.original_name,
      file_size: savedFile.file_size,
      upload_date: savedFile.upload_date
    };
  } catch (error) {
    console.error('File upload failed:', error);
    throw error;
  }
};

// Helper function to determine file extension from original name or mime type
function getFileExtension(originalName: string, mimeType: string): string {
  // First try to get extension from original filename
  const nameMatch = originalName.match(/\.[^.]+$/);
  if (nameMatch) {
    return nameMatch[0];
  }
  
  // Fallback to mime type mapping
  const mimeExtensions: Record<string, string> = {
    'image/jpeg': '.jpg',
    'image/jpg': '.jpg',
    'image/png': '.png',
    'image/gif': '.gif',
    'image/webp': '.webp',
    'text/plain': '.txt',
    'application/pdf': '.pdf',
    'application/json': '.json',
    'text/html': '.html',
    'text/css': '.css',
    'application/javascript': '.js',
    'text/javascript': '.js'
  };
  
  return mimeExtensions[mimeType] || '';
}