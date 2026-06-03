import dotenv from 'dotenv';
import path from 'path';

// Load .env BEFORE PrismaClient - critical for DATABASE_URL resolution
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

// Use require() instead of import to guarantee execution order
const { PrismaClient } = require('@prisma/client') as typeof import('@prisma/client');

const globalForPrisma = globalThis as unknown as {
  prisma: InstanceType<typeof PrismaClient> | undefined;
};

function getPrisma() {
  if (!globalForPrisma.prisma) {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      console.error('CRITICAL: DATABASE_URL environment variable is not set. The application cannot start.');
      throw new Error('DATABASE_URL environment variable is required');
    }
    globalForPrisma.prisma = new PrismaClient({
      datasources: {
        db: {
          url: databaseUrl,
        },
      },
    });
  }
  return globalForPrisma.prisma;
}

export const prisma = getPrisma();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
