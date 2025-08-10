import { z } from 'zod';

// File upload schema
export const fileSchema = z.object({
  id: z.string(), // UUID for the file
  original_name: z.string(),
  file_path: z.string(),
  file_size: z.number().int(),
  mime_type: z.string(),
  upload_date: z.coerce.date(),
});

export type File = z.infer<typeof fileSchema>;

// Input schema for uploading files
export const uploadFileInputSchema = z.object({
  original_name: z.string().min(1, 'File name cannot be empty'),
  file_data: z.string(), // Base64 encoded file data
  mime_type: z.string(),
  file_size: z.number().int().positive().max(200 * 1024 * 1024, 'File size cannot exceed 200MB'),
});

export type UploadFileInput = z.infer<typeof uploadFileInputSchema>;

// Response schema for file upload
export const uploadFileResponseSchema = z.object({
  id: z.string(),
  public_link: z.string(),
  original_name: z.string(),
  file_size: z.number().int(),
  upload_date: z.coerce.date(),
});

export type UploadFileResponse = z.infer<typeof uploadFileResponseSchema>;

// Schema for getting file stats
export const fileStatsSchema = z.object({
  total_files: z.number().int().nonnegative(),
});

export type FileStats = z.infer<typeof fileStatsSchema>;

// Schema for file download/access
export const getFileByIdInputSchema = z.object({
  id: z.string().uuid('Invalid file ID format'),
});

export type GetFileByIdInput = z.infer<typeof getFileByIdInputSchema>;

// Response schema for file download
export const fileDownloadResponseSchema = z.object({
  id: z.string(),
  original_name: z.string(),
  file_data: z.string(), // Base64 encoded file data
  mime_type: z.string(),
  file_size: z.number().int(),
});

export type FileDownloadResponse = z.infer<typeof fileDownloadResponseSchema>;