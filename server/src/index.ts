import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { 
  uploadFileInputSchema, 
  getFileByIdInputSchema,
  fileStatsSchema,
  uploadFileResponseSchema,
  fileDownloadResponseSchema
} from './schema';
import { uploadFile } from './handlers/upload_file';
import { getFileStats } from './handlers/get_file_stats';
import { getFileById } from './handlers/get_file_by_id';
import { serveFile } from './handlers/serve_file';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  // Health check endpoint
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // Upload a file
  uploadFile: publicProcedure
    .input(uploadFileInputSchema)
    .mutation(({ input }) => uploadFile(input)),

  // Get total file count statistics
  getFileStats: publicProcedure
    .query(() => getFileStats()),

  // Get file data by ID (for download with base64 encoding)
  getFileById: publicProcedure
    .input(getFileByIdInputSchema)
    .query(({ input }) => getFileById(input)),

  // Serve file metadata by ID (for direct file serving)
  serveFile: publicProcedure
    .input(getFileByIdInputSchema)
    .query(({ input }) => serveFile(input)),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`Earl Box TRPC server listening at port: ${port}`);
}

start();