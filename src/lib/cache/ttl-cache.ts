/**
 * TTL-based in-memory cache with LRU eviction
 */

export interface CacheEntry<T> {
  data: T;
  expiresAt: number;
  createdAt: number;
}

export interface CacheStats {
  size: number;
  hits: number;
  misses: number;
  hitRate: number;
  evictions: number;
}

/**
 * In-memory cache with time-to-live (TTL) expiration and LRU eviction.
 *
 * Features:
 * - TTL-based expiration per entry
 * - LRU eviction when maxEntries exceeded
 * - Automatic cleanup of expired entries
 * - Pattern-based cache invalidation
 * - Hit/miss statistics
 */
export class TTLCache<T = unknown> {
  private cache: Map<string, CacheEntry<T>>;
  private maxEntries: number;
  private stats: {
    hits: number;
    misses: number;
    evictions: number;
  };

  constructor(maxEntries = 1000) {
    this.cache = new Map();
    this.maxEntries = maxEntries;
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
    };
  }

  /**
   * Get a value from the cache.
   * Returns null if not found or expired.
   *
   * @param key - Cache key
   * @returns Cached value or null
   */
  get<R = T>(key: string): R | null {
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    // Move to end for LRU (refresh access time)
    this.cache.delete(key);
    this.cache.set(key, entry);

    this.stats.hits++;
    return entry.data as unknown as R;
  }

  /**
   * Set a value in the cache with TTL.
   *
   * @param key - Cache key
   * @param value - Value to cache
   * @param ttlMs - Time to live in milliseconds
   */
  set(key: string, value: T, ttlMs: number): void {
    const now = Date.now();
    const entry: CacheEntry<T> = {
      data: value,
      expiresAt: now + ttlMs,
      createdAt: now,
    };

    // Delete existing entry (if any) to update LRU order
    this.cache.delete(key);

    // Evict oldest entries if at capacity
    if (this.cache.size >= this.maxEntries) {
      // Evict the oldest entry (first in Map)
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
        this.stats.evictions++;
      }
    }

    this.cache.set(key, entry);

    // Cleanup expired entries periodically
    this.cleanupExpired();
  }

  /**
   * Delete a specific key from the cache.
   *
   * @param key - Cache key
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear all entries from the cache.
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Clear all entries matching a pattern.
   * Pattern supports basic glob matching with '*' wildcard.
   *
   * @param pattern - Pattern to match (e.g., 'gh:proj:*')
   * @returns Number of entries cleared
   */
  clearPattern(pattern: string): number {
    const regex = new RegExp(
      '^' + pattern.replace(/\*/g, '.*') + '$'
    );

    let cleared = 0;
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        cleared++;
      }
    }

    return cleared;
  }

  /**
   * Get cache statistics.
   *
   * @returns Cache statistics
   */
  getStats(): CacheStats {
    const totalRequests = this.stats.hits + this.stats.misses;
    const hitRate = totalRequests > 0
      ? this.stats.hits / totalRequests
      : 0;

    return {
      size: this.cache.size,
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate,
      evictions: this.stats.evictions,
    };
  }

  /**
   * Cleanup expired entries.
   * Called automatically on set() to prevent unbounded growth.
   * Only removes a batch to avoid blocking on large caches.
   */
  private cleanupExpired(): void {
    const now = Date.now();
    let cleaned = 0;
    const maxCleanup = 10; // Limit cleanup batch size

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        cleaned++;

        if (cleaned >= maxCleanup) {
          break;
        }
      }
    }
  }
}
