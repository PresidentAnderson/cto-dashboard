/**
 * Prisma Client Singleton for Next.js and Node.js
 *
 * This file prevents multiple Prisma Client instances during development
 * with hot-reloading, which can exhaust database connections.
 *
 * Production: Single instance per process
 * Development: Cached instance to survive hot-reloads
 */

import { PrismaClient } from '@prisma/client'

// PrismaClient is attached to the `global` object in development to prevent
// exhausting your database connection limit.
const globalForPrisma = global as unknown as { prisma: PrismaClient }

// Configure Prisma Client with appropriate logging
export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development'
      ? ['query', 'error', 'warn']
      : ['error'],
    errorFormat: 'pretty',
  })

// In development, store the client in the global object to prevent hot-reload issues
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

/**
 * Gracefully disconnect Prisma Client on process termination
 */
export async function disconnectPrisma() {
  await prisma.$disconnect()
}

// Handle graceful shutdown
process.on('beforeExit', async () => {
  await disconnectPrisma()
})

export default prisma
