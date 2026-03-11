import { Injectable, Inject, OnModuleDestroy } from "@nestjs/common";
import { PgCache } from "@pgcache/core";
import type {
  PgCacheSetOptions,
  PgCacheSetEntry,
  PgCacheStats,
} from "@pgcache/types";
import { PGCACHE_INSTANCE } from "./pgcache.constants.js";

/**
 * NestJS service that wraps PgCache for dependency injection
 *
 * @example
 * ```typescript
 * @Injectable()
 * export class UserService {
 *   constructor(private readonly cache: PgCacheService) {}
 *
 *   async getUser(id: string) {
 *     const cached = await this.cache.get(`user:${id}`);
 *     if (cached) return cached;
 *
 *     const user = await this.fetchUser(id);
 *     await this.cache.set(`user:${id}`, user, { ttl: 300 });
 *     return user;
 *   }
 * }
 * ```
 */
@Injectable()
export class PgCacheService implements OnModuleDestroy {
  constructor(
    @Inject(PGCACHE_INSTANCE)
    private readonly pgcache: PgCache
  ) {}

  /**
   * Set a value in the cache
   */
  async set<T = unknown>(
    key: string,
    value: T,
    options?: PgCacheSetOptions
  ): Promise<void> {
    return this.pgcache.set(key, value, options);
  }

  /**
   * Set a value only if the key does not exist (SET if Not Exists)
   * Useful for distributed locks and preventing race conditions
   *
   * @returns true if the key was set, false if it already exists
   *
   * @example Safe distributed lock
   * ```typescript
   * import { randomUUID } from "crypto";
   *
   * const lockKey = "lock:user:1";
   * const lockToken = randomUUID();
   *
   * const acquired = await this.cache.setNX(lockKey, lockToken, { ttl: 30 });
   * if (acquired) {
   *   try {
   *     // Do work...
   *   } finally {
   *     await this.cache.delIfEquals(lockKey, lockToken);
   *   }
   * }
   * ```
   */
  async setNX<T = unknown>(
    key: string,
    value: T,
    options?: PgCacheSetOptions
  ): Promise<boolean> {
    return this.pgcache.setNX(key, value, options);
  }

  /**
   * Get a value from the cache
   */
  async get<T = unknown>(key: string): Promise<T | null> {
    return this.pgcache.get<T>(key);
  }

  /**
   * Delete a key from the cache
   */
  async del(key: string): Promise<boolean> {
    return this.pgcache.del(key);
  }

  /**
   * Delete a key only if its value matches the expected value
   *
   * Essential for safe distributed lock releases. This prevents
   * accidentally deleting a lock acquired by another process after
   * your lock expired.
   *
   * @returns true if the key was deleted (value matched), false otherwise
   *
   * @example Safe distributed lock release
   * ```typescript
   * import { randomUUID } from "crypto";
   *
   * const lockKey = "lock:resource:1";
   * const lockToken = randomUUID();
   *
   * const acquired = await this.cache.setNX(lockKey, lockToken, { ttl: 30 });
   * if (acquired) {
   *   try {
   *     // Do work...
   *   } finally {
   *     await this.cache.delIfEquals(lockKey, lockToken);
   *   }
   * }
   * ```
   */
  async delIfEquals<T = unknown>(key: string, expectedValue: T): Promise<boolean> {
    return this.pgcache.delIfEquals(key, expectedValue);
  }

  /**
   * Check if a key exists
   */
  async exists(key: string): Promise<boolean> {
    return this.pgcache.exists(key);
  }

  /**
   * Get TTL for a key
   */
  async ttl(key: string): Promise<number> {
    return this.pgcache.ttl(key);
  }

  /**
   * Clear all entries
   */
  async clear(): Promise<void> {
    return this.pgcache.clear();
  }

  /**
   * Get keys matching pattern
   */
  async keys(pattern: string, caseInsensitive = false): Promise<string[]> {
    return this.pgcache.keys(pattern, caseInsensitive);
  }

  /**
   * Get multiple values at once
   */
  async mget<T = unknown>(keys: string[]): Promise<Map<string, T>> {
    return this.pgcache.mget<T>(keys);
  }

  /**
   * Set multiple entries at once
   */
  async mset<T = unknown>(entries: PgCacheSetEntry<T>[]): Promise<void> {
    return this.pgcache.mset(entries);
  }

  /**
   * Cleanup expired entries
   */
  async cleanup(): Promise<number> {
    return this.pgcache.cleanup();
  }

  /**
   * Get cache statistics
   */
  async stats(): Promise<PgCacheStats> {
    return this.pgcache.stats();
  }

  /**
   * Get the underlying PgCache instance
   */
  getClient(): PgCache {
    return this.pgcache;
  }

  /**
   * Cleanup on module destroy
   */
  async onModuleDestroy(): Promise<void> {
    await this.pgcache.close();
  }
}
