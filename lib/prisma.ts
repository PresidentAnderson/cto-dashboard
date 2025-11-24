/**
 * Prisma Client Singleton for Next.js and Node.js
 *
 * This file prevents multiple Prisma Client instances during development
 * with hot-reloading, which can exhaust database connections.
 *
 * Production: Single instance per process with connection pooling
 * Development: Cached instance to survive hot-reloads
 *
 * Connection Pool Configuration:
 * - Connection limit: 10 (configurable via env)
 * - Connection timeout: 20 seconds
 * - Pool timeout: 10 seconds
 * - Idle timeout: 300 seconds (5 minutes)
 */

import { PrismaClient } from '@prisma/client'

// PrismaClient is attached to the `global` object in development to prevent
// exhausting your database connection limit.
const globalForPrisma = global as unknown as { prisma: PrismaClient }

/**
 * Configure connection pool settings for Supabase PostgreSQL
 * Optimized for serverless/edge environments
 */
const connectionLimit = parseInt(process.env.DATABASE_CONNECTION_LIMIT || '10', 10)
const connectionTimeout = parseInt(process.env.DATABASE_CONNECTION_TIMEOUT || '20', 10)
const poolTimeout = parseInt(process.env.DATABASE_POOL_TIMEOUT || '10', 10)

// Build database URL with connection pool parameters
const getDatabaseUrl = () => {
  const baseUrl = process.env.DATABASE_URL
  if (!baseUrl) {
    throw new Error('DATABASE_URL environment variable is not set')
  }

  // Add connection pooling parameters for production
  if (process.env.NODE_ENV === 'production') {
    const url = new URL(baseUrl)
    url.searchParams.set('connection_limit', connectionLimit.toString())
    url.searchParams.set('pool_timeout', poolTimeout.toString())
    url.searchParams.set('connect_timeout', connectionTimeout.toString())
    return url.toString()
  }

  return baseUrl
}

// Configure Prisma Client with optimized settings
export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    datasources: {
      db: {
        url: getDatabaseUrl(),
      },
    },
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

/**
 * Test database connection and return connection status
 * @returns Connection test result with latency
 */
export async function testConnection(): Promise<{
  success: boolean
  latency: number
  error?: string
}> {
  try {
    const start = Date.now()
    await prisma.$queryRaw`SELECT 1`
    const latency = Date.now() - start

    return {
      success: true,
      latency,
    }
  } catch (error) {
    return {
      success: false,
      latency: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Execute a query within a transaction with retry logic
 * @param callback - Transaction callback
 * @param maxRetries - Maximum number of retry attempts (default: 3)
 * @returns Result of the transaction
 */
export async function executeTransaction<T>(
  callback: (tx: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>) => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  let lastError: Error | null = null

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await prisma.$transaction(callback, {
        maxWait: 5000, // 5 seconds
        timeout: 30000, // 30 seconds
      })
    } catch (error) {
      lastError = error as Error
      console.error(`Transaction attempt ${attempt} failed:`, error)

      // Don't retry on certain errors
      if (
        error instanceof Error &&
        (error.message.includes('Unique constraint') ||
          error.message.includes('Foreign key constraint'))
      ) {
        throw error
      }

      // Wait before retrying (exponential backoff)
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 100))
      }
    }
  }

  throw lastError || new Error('Transaction failed after retries')
}

/**
 * Middleware for logging slow queries in development
 */
if (process.env.NODE_ENV === 'development') {
  prisma.$use(async (params, next) => {
    const before = Date.now()
    const result = await next(params)
    const after = Date.now()
    const duration = after - before

    // Log queries that take longer than 1 second
    if (duration > 1000) {
      console.warn(`Slow query detected: ${params.model}.${params.action} took ${duration}ms`)
    }

    return result
  })
}

// Handle graceful shutdown
process.on('beforeExit', async () => {
  await disconnectPrisma()
})

process.on('SIGINT', async () => {
  await disconnectPrisma()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  await disconnectPrisma()
  process.exit(0)
})

export default prisma
