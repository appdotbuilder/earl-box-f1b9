import { pgTable, uuid, text, integer, timestamp } from 'drizzle-orm/pg-core';

export const filesTable = pgTable('files', {
  id: uuid('id').primaryKey().defaultRandom(), // Auto-generate UUID
  original_name: text('original_name').notNull(),
  file_path: text('file_path').notNull(), // Path to file in uploads folder
  file_size: integer('file_size').notNull(), // File size in bytes
  mime_type: text('mime_type').notNull(),
  upload_date: timestamp('upload_date').defaultNow().notNull(),
});

// TypeScript types for the table schema
export type File = typeof filesTable.$inferSelect; // For SELECT operations
export type NewFile = typeof filesTable.$inferInsert; // For INSERT operations

// Important: Export all tables for proper query building
export const tables = { files: filesTable };