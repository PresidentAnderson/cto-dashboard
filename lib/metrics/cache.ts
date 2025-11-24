/**
 * In-Memory Cache for Metrics Engine
 *
 * High-performance caching layer for hot-path metrics queries
 * with configurable TTL and automatic expiration.
 */

import { CacheEntry } from './types';
import { getConfig } from './config';

/**
 * Simple in-memory cache implementation
 * For production, consider Redis or similar
 */
class MetricsCache {
  private cache: Map<string, CacheEntry<any>>;
  private cleanupInterval: NodeJS.Timeout | null;

  constructor() {
    this.cache = new Map();
    this.cleanupInterval = null;
    this.startCleanup();
  }

  /**
   * Get cached value if not expired
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Set cache value with TTL
   */
  set<T>(key: string, data: T, ttl?: number): void {
    const config = getConfig();
    const expirationTime = ttl || config.cacheTTL;
    const now = Date.now();

    const entry: CacheEntry<T> = {
      data,
      timestamp: now,
      expiresAt: now + expirationTime,
    };

    this.cache.set(key, entry);
  }

  /**
   * Delete cache entry
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const now = Date.now();
    let validEntries = 0;
    let expiredEntries = 0;

    for (const entry of this.cache.values()) {
      if (now > entry.expiresAt) {
        expiredEntries++;
      } else {
        validEntries++;
      }
    }

    return {
      totalEntries: this.cache.size,
      validEntries,
      expiredEntries,
    };
  }

  /**
   * Start periodic cleanup of expired entries
   */
  private startCleanup(): void {
    // Run cleanup every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpired();
    }, 60 * 1000);
  }

  /**
   * Remove all expired entries
   */
  private cleanupExpired(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      this.cache.delete(key);
    }

    if (keysToDelete.length > 0) {
      console.log(`[MetricsCache] Cleaned up ${keysToDelete.length} expired entries`);
    }
  }

  /**
   * Stop cleanup interval
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.clear();
  }
}

// Singleton instance
const metricsCache = new MetricsCache();

// Cleanup on process exit
process.on('beforeExit', () => {
  metricsCache.destroy();
});

/**
 * Generate cache key from components
 */
export function generateCacheKey(prefix: string, ...parts: (string | number | Date)[]): string {
  const normalizedParts = parts.map(part => {
    if (part instanceof Date) {
      return part.toISOString();
    }
    return String(part);
  });

  return `${prefix}:${normalizedParts.join(':')}`;
}

/**
 * Cache decorator for async functions
 * Usage: const result = await withCache('key', () => expensiveOperation())
 */
export async function withCache<T>(
  key: string,
  fn: () => Promise<T>,
  ttl?: number
): Promise<T> {
  // Check cache first
  const cached = metricsCache.get<T>(key);
  if (cached !== null) {
    return cached;
  }

  // Execute function
  const result = await fn();

  // Store in cache
  metricsCache.set(key, result, ttl);

  return result;
}

/**
 * Invalidate cache entries by prefix
 */
export function invalidateByPrefix(prefix: string): number {
  let count = 0;
  const keysToDelete: string[] = [];

  for (const key of metricsCache['cache'].keys()) {
    if (key.startsWith(prefix)) {
      keysToDelete.push(key);
    }
  }

  for (const key of keysToDelete) {
    metricsCache.delete(key);
    count++;
  }

  return count;
}

export { metricsCache };
export default metricsCache;
