import { Pool } from "pg";
import type {
  PgCacheOptions,
  PgCacheSetOptions,
  PgCacheSetEntry,
  PgCacheStats,
} from "@pgcache/types";
import {
  PgCacheConnectionError,
  PgCacheQueryError,
  PgCacheConfigError,
} from "@pgcache/types";

/**
 * Redis-like cache client using PostgreSQL UNLOGGED tables
 *
 * @example Basic usage with connection string
 * ```typescript
 * const cache = new PgCache({
 *   connectionString: process.env.DATABASE_URL
 * });
 *
 * await cache.set("user:1", { name: "Lekan" }, { ttl: 60 });
 * const user = await cache.get("user:1");
 * ```
 *
 * @example Using a custom pool
 * ```typescript
 * import { Pool } from "pg";
 *
 * const pool = new Pool({
 *   connectionString: process.env.DATABASE_URL,
 *   max: 20,
 *   idleTimeoutMillis: 30000,
 * });
 *
 * const cache = new PgCache({ pool });
 *
 * // You manage the pool lifecycle
 * await cache.close(); // Only stops cleanup
 * await pool.end();    // Closes all connections
 * ```
 *
 * @example Sharing a pool across multiple caches
 * ```typescript
 * const pool = new Pool({ ... });
 *
 * const userCache = new PgCache({ pool, table: "user_cache" });
 * const sessionCache = new PgCache({ pool, table: "session_cache" });
 * ```
 *
 * @example Advanced configuration
 * ```typescript
 * const cache = new PgCache({
 *   connectionString: process.env.DATABASE_URL,
 *   table: "my_cache",
 *   cleanupInterval: 30000,  // Cleanup every 30 seconds
 *   poolConfig: {
 *     max: 10,
 *     idleTimeoutMillis: 20000,
 *   },
 * });
 * ```
 */
export class PgCache {
  private pool: Pool;
  private ownPool: boolean;
  private table: string;
  private quotedTable: string;
  private cleanupInterval?: NodeJS.Timeout;
  private isInitialized = false;

  constructor(options: PgCacheOptions) {
    // Validate options
    if (!options.connectionString && !options.pool) {
      throw new PgCacheConfigError(
        "Either connectionString or pool must be provided"
      );
    }

    // Setup pool
    if (options.pool) {
      this.pool = options.pool;
      this.ownPool = false;
    } else {
      this.pool = new Pool({
        connectionString: options.connectionString,
        ...options.poolConfig,
      });
      this.ownPool = true;
    }

    const tableName = options.table ?? "pgcache";
    this.table = tableName;
    this.quotedTable = this.validateAndQuoteTableName(tableName);

    // Auto-initialize if enabled (default: true)
    const autoInit = options.autoInit ?? true;
    if (autoInit) {
      this.init().catch((err) => {
        console.error("Failed to initialize PgCache:", err);
      });
    }

    // Setup automatic cleanup
    const cleanupInterval = options.cleanupInterval ?? 60000; // 1 minute default
    if (cleanupInterval > 0) {
      this._startCleanup(cleanupInterval);
    }
  }

  /**
   * Initialize the cache table and indexes
   */
  async init(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      await this.pool.query(`
        CREATE UNLOGGED TABLE IF NOT EXISTS ${this.quotedTable} (
          key TEXT PRIMARY KEY,
          value JSONB NOT NULL,
          expires_at TIMESTAMP NULL,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `);

      await this.pool.query(`
        CREATE INDEX IF NOT EXISTS "${this.table}_expires_idx"
        ON ${this.quotedTable}(expires_at)
        WHERE expires_at IS NOT NULL
      `);

      this.isInitialized = true;
    } catch (err) {
      throw new PgCacheConnectionError(
        "Failed to initialize cache table",
        err as Error
      );
    }
  }

  /**
   * Set a value in the cache
   *
   * @param key - The cache key
   * @param value - The value to cache (will be JSON serialized)
   * @param options - Options including TTL
   *
   * @example
   * ```typescript
   * await cache.set("user:1", { name: "Lekan" }, { ttl: 60 });
   * ```
   */
  async set<T = unknown>(
    key: string,
    value: T,
    options?: PgCacheSetOptions
  ): Promise<void> {
    await this.ensureInitialized();

    const expiresAt = this.computeExpiresAt(options?.ttl);

    // Handle undefined by wrapping in a container to preserve the distinction from null
    const wrappedValue = value === undefined
      ? { __pgcache_undefined: true }
      : { __pgcache_value: value };

    try {
      await this.pool.query(
        `
        INSERT INTO ${this.quotedTable} (key, value, expires_at)
        VALUES ($1, $2::jsonb, $3)
        ON CONFLICT (key)
        DO UPDATE SET value = $2::jsonb, expires_at = $3, created_at = NOW()
      `,
        [key, JSON.stringify(wrappedValue), expiresAt]
      );
    } catch (err) {
      throw new PgCacheQueryError("Failed to set cache entry", undefined, err as Error);
    }
  }

  /**
   * Set a value only if the key does not exist (SET if Not Exists)
   *
   * @param key - The cache key
   * @param value - The value to cache (will be JSON serialized)
   * @param options - Options including TTL
   * @returns True if the key was set, false if it already exists
   *
   * @example Safe distributed lock with unique token
   * ```typescript
   * import { randomUUID } from "crypto";
   *
   * const lockKey = "lock:user:1";
   * const lockToken = randomUUID();
   *
   * const acquired = await cache.setNX(lockKey, lockToken, { ttl: 30 });
   * if (acquired) {
   *   try {
   *     // Lock acquired, do work...
   *   } finally {
   *     // Only release if we still own the lock
   *     await cache.delIfEquals(lockKey, lockToken);
   *   }
   * }
   * ```
   *
   * @example Prevent duplicate processing
   * ```typescript
   * import { randomUUID } from "crypto";
   *
   * const key = `job:${jobId}`;
   * const token = randomUUID();
   * const started = await cache.setNX(key, token, { ttl: 300 });
   * if (!started) {
   *   console.log("Job already running");
   *   return;
   * }
   * try {
   *   // Process job...
   * } finally {
   *   await cache.delIfEquals(key, token);
   * }
   * ```
   */
  async setNX<T = unknown>(
    key: string,
    value: T,
    options?: PgCacheSetOptions
  ): Promise<boolean> {
    await this.ensureInitialized();

    const expiresAt = this.computeExpiresAt(options?.ttl);

    // Handle undefined by wrapping in a container to preserve the distinction from null
    const wrappedValue = value === undefined
      ? { __pgcache_undefined: true }
      : { __pgcache_value: value };

    try {
      // First, delete any expired keys with this name
      // This ensures expired keys don't block setNX
      await this.pool.query(
        `
        DELETE FROM ${this.quotedTable}
        WHERE key = $1
        AND expires_at IS NOT NULL
        AND expires_at <= NOW()
      `,
        [key]
      );

      // Then attempt to insert, but do nothing if key already exists
      const result = await this.pool.query(
        `
        INSERT INTO ${this.quotedTable} (key, value, expires_at)
        VALUES ($1, $2::jsonb, $3)
        ON CONFLICT (key) DO NOTHING
      `,
        [key, JSON.stringify(wrappedValue), expiresAt]
      );

      // Return true if a row was inserted, false if key already existed
      return (result.rowCount ?? 0) > 0;
    } catch (err) {
      throw new PgCacheQueryError("Failed to set cache entry", undefined, err as Error);
    }
  }

  /**
   * Get a value from the cache
   *
   * @param key - The cache key
   * @returns The cached value or null if not found or expired
   *
   * @example
   * ```typescript
   * const user = await cache.get<User>("user:1");
   * ```
   */
  async get<T = unknown>(key: string): Promise<T | null> {
    await this.ensureInitialized();

    try {
      const result = await this.pool.query<{ value: T }>(
        `
        SELECT value FROM ${this.quotedTable}
        WHERE key = $1
        AND (expires_at IS NULL OR expires_at > NOW())
      `,
        [key]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const wrapped = result.rows[0]!.value as any;

      // Unwrap the value
      if (wrapped && typeof wrapped === 'object') {
        if ('__pgcache_undefined' in wrapped) {
          return undefined as T;
        }
        if ('__pgcache_value' in wrapped) {
          return wrapped.__pgcache_value as T;
        }
      }

      return wrapped as T;
    } catch (err) {
      throw new PgCacheQueryError("Failed to get cache entry", undefined, err as Error);
    }
  }

  /**
   * Delete a key from the cache
   *
   * @param key - The cache key to delete
   * @returns True if the key was deleted, false if it didn't exist
   *
   * @example
   * ```typescript
   * await cache.del("user:1");
   * ```
   */
  async del(key: string): Promise<boolean> {
    await this.ensureInitialized();

    try {
      const result = await this.pool.query(
        `DELETE FROM ${this.quotedTable} WHERE key = $1`,
        [key]
      );

      return (result.rowCount ?? 0) > 0;
    } catch (err) {
      throw new PgCacheQueryError("Failed to delete cache entry", undefined, err as Error);
    }
  }

  /**
   * Delete a key only if its value matches the expected value
   *
   * This is essential for safe distributed lock releases to prevent
   * accidentally deleting a lock acquired by another process.
   *
   * @param key - The cache key to delete
   * @param expectedValue - The value that must match for deletion to occur
   * @returns True if the key was deleted (value matched), false otherwise
   *
   * @example Safe distributed lock
   * ```typescript
   * import { randomUUID } from "crypto";
   *
   * const lockKey = "lock:resource:1";
   * const lockToken = randomUUID();
   *
   * // Acquire lock with unique token
   * const acquired = await cache.setNX(lockKey, lockToken, { ttl: 30 });
   *
   * if (acquired) {
   *   try {
   *     // Do work...
   *   } finally {
   *     // Only release if we still own the lock
   *     await cache.delIfEquals(lockKey, lockToken);
   *   }
   * }
   * ```
   */
  async delIfEquals<T = unknown>(key: string, expectedValue: T): Promise<boolean> {
    await this.ensureInitialized();

    // Wrap the expected value the same way we do in set/setNX
    const wrappedExpectedValue = expectedValue === undefined
      ? { __pgcache_undefined: true }
      : { __pgcache_value: expectedValue };

    try {
      const result = await this.pool.query(
        `
        DELETE FROM ${this.quotedTable}
        WHERE key = $1
        AND value = $2::jsonb
      `,
        [key, JSON.stringify(wrappedExpectedValue)]
      );

      return (result.rowCount ?? 0) > 0;
    } catch (err) {
      throw new PgCacheQueryError("Failed to conditionally delete cache entry", undefined, err as Error);
    }
  }

  /**
   * Check if a key exists in the cache
   *
   * @param key - The cache key
   * @returns True if the key exists and is not expired
   *
   * @example
   * ```typescript
   * const exists = await cache.exists("user:1");
   * ```
   */
  async exists(key: string): Promise<boolean> {
    await this.ensureInitialized();

    try {
      const result = await this.pool.query<{ exists: boolean }>(
        `
        SELECT EXISTS(
          SELECT 1 FROM ${this.quotedTable}
          WHERE key = $1
          AND (expires_at IS NULL OR expires_at > NOW())
        ) as exists
      `,
        [key]
      );

      return result.rows[0]?.exists ?? false;
    } catch (err) {
      throw new PgCacheQueryError("Failed to check existence", undefined, err as Error);
    }
  }

  /**
   * Get the remaining TTL for a key
   *
   * @param key - The cache key
   * @returns Remaining seconds (-1 for non-expiring entries, -2 if key doesn't exist)
   *
   * @example
   * ```typescript
   * const ttl = await cache.ttl("user:1");
   * ```
   */
  async ttl(key: string): Promise<number> {
    await this.ensureInitialized();

    try {
      const result = await this.pool.query<{ expires_at: Date | null }>(
        `
        SELECT expires_at FROM ${this.quotedTable}
        WHERE key = $1
      `,
        [key]
      );

      if (result.rows.length === 0) {
        return -2; // Key doesn't exist
      }

      const expiresAt = result.rows[0]!.expires_at;

      if (!expiresAt) {
        return -1; // Key exists but has no expiration
      }

      const now = Date.now();
      const expiresAtMs = new Date(expiresAt).getTime();

      if (expiresAtMs <= now) {
        return -2; // Key is expired
      }

      return Math.ceil((expiresAtMs - now) / 1000);
    } catch (err) {
      throw new PgCacheQueryError("Failed to get TTL", undefined, err as Error);
    }
  }

  /**
   * Clear all entries from the cache
   *
   * @example
   * ```typescript
   * await cache.clear();
   * ```
   */
  async clear(): Promise<void> {
    await this.ensureInitialized();

    try {
      await this.pool.query(`TRUNCATE TABLE ${this.quotedTable}`);
    } catch (err) {
      throw new PgCacheQueryError("Failed to clear cache", undefined, err as Error);
    }
  }

  /**
   * Get keys matching a pattern (uses SQL LIKE/ILIKE)
   *
   * @param pattern - SQL LIKE pattern (e.g., "user:%", "%:active")
   * @param caseInsensitive - Use case-insensitive matching (ILIKE)
   * @returns Array of matching keys
   *
   * @example
   * ```typescript
   * const userKeys = await cache.keys("user:%");
   * ```
   */
  async keys(pattern: string, caseInsensitive = false): Promise<string[]> {
    await this.ensureInitialized();

    const operator = caseInsensitive ? "ILIKE" : "LIKE";

    try {
      const result = await this.pool.query<{ key: string }>(
        `
        SELECT key FROM ${this.quotedTable}
        WHERE key ${operator} $1
        AND (expires_at IS NULL OR expires_at > NOW())
      `,
        [pattern]
      );

      return result.rows.map((row) => row.key);
    } catch (err) {
      throw new PgCacheQueryError("Failed to get keys", undefined, err as Error);
    }
  }

  /**
   * Get multiple values at once
   *
   * @param keys - Array of cache keys
   * @returns Map of key to value (missing/expired keys are omitted)
   *
   * @example
   * ```typescript
   * const values = await cache.mget(["user:1", "user:2"]);
   * ```
   */
  async mget<T = unknown>(keys: string[]): Promise<Map<string, T>> {
    await this.ensureInitialized();

    if (keys.length === 0) {
      return new Map();
    }

    try {
      const result = await this.pool.query<{ key: string; value: T }>(
        `
        SELECT key, value FROM ${this.quotedTable}
        WHERE key = ANY($1)
        AND (expires_at IS NULL OR expires_at > NOW())
      `,
        [keys]
      );

      const map = new Map<string, T>();
      for (const row of result.rows) {
        const wrapped = row.value as any;

        // Unwrap the value
        let unwrapped: T;
        if (wrapped && typeof wrapped === 'object') {
          if ('__pgcache_undefined' in wrapped) {
            unwrapped = undefined as T;
          } else if ('__pgcache_value' in wrapped) {
            unwrapped = wrapped.__pgcache_value as T;
          } else {
            unwrapped = wrapped as T;
          }
        } else {
          unwrapped = wrapped as T;
        }

        map.set(row.key, unwrapped);
      }

      return map;
    } catch (err) {
      throw new PgCacheQueryError("Failed to get multiple entries", undefined, err as Error);
    }
  }

  /**
   * Set multiple entries at once (uses a transaction)
   *
   * @param entries - Array of entries to set
   *
   * @example
   * ```typescript
   * await cache.mset([
   *   { key: "user:1", value: { name: "Lekan" }, ttl: 60 },
   *   { key: "user:2", value: { name: "John" } }
   * ]);
   * ```
   */
  async mset<T = unknown>(entries: PgCacheSetEntry<T>[]): Promise<void> {
    await this.ensureInitialized();

    if (entries.length === 0) {
      return;
    }

    const client = await this.pool.connect();

    try {
      await client.query("BEGIN");

      for (const entry of entries) {
        const expiresAt = this.computeExpiresAt(entry.ttl);

        // Handle undefined by wrapping in a container to preserve the distinction from null
        const wrappedValue = entry.value === undefined
          ? { __pgcache_undefined: true }
          : { __pgcache_value: entry.value };

        await client.query(
          `
          INSERT INTO ${this.quotedTable} (key, value, expires_at)
          VALUES ($1, $2::jsonb, $3)
          ON CONFLICT (key)
          DO UPDATE SET value = $2::jsonb, expires_at = $3, created_at = NOW()
        `,
          [entry.key, JSON.stringify(wrappedValue), expiresAt]
        );
      }

      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      // Re-throw config errors directly (e.g., invalid TTL)
      if (err instanceof PgCacheConfigError) {
        throw err;
      }
      throw new PgCacheQueryError("Failed to set multiple entries", undefined, err as Error);
    } finally {
      client.release();
    }
  }

  /**
   * Delete expired entries from the cache
   *
   * @returns Number of entries deleted
   *
   * @example
   * ```typescript
   * const deleted = await cache.cleanup();
   * console.log(`Cleaned up ${deleted} expired entries`);
   * ```
   */
  async cleanup(): Promise<number> {
    await this.ensureInitialized();

    try {
      const result = await this.pool.query(
        `
        DELETE FROM ${this.quotedTable}
        WHERE expires_at IS NOT NULL
        AND expires_at <= NOW()
      `
      );

      return result.rowCount ?? 0;
    } catch (err) {
      throw new PgCacheQueryError("Failed to cleanup expired entries", undefined, err as Error);
    }
  }

  /**
   * Get cache statistics
   *
   * @returns Statistics about the cache
   *
   * @example
   * ```typescript
   * const stats = await cache.stats();
   * console.log(`Total entries: ${stats.totalEntries}`);
   * ```
   */
  async stats(): Promise<PgCacheStats> {
    await this.ensureInitialized();

    try {
      const result = await this.pool.query<{
        total: string;
        expired: string;
        active: string;
        size: string;
      }>(`
        SELECT
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE expires_at IS NOT NULL AND expires_at <= NOW()) as expired,
          COUNT(*) FILTER (WHERE expires_at IS NULL OR expires_at > NOW()) as active,
          pg_total_relation_size('${this.table}') as size
        FROM ${this.quotedTable}
      `);

      const row = result.rows[0]!;

      return {
        totalEntries: parseInt(row.total, 10),
        expiredEntries: parseInt(row.expired, 10),
        activeEntries: parseInt(row.active, 10),
        approximateSize: parseInt(row.size, 10),
      };
    } catch (err) {
      throw new PgCacheQueryError("Failed to get stats", undefined, err as Error);
    }
  }

  /**
   * Close the connection pool and stop cleanup
   * Only call this when you're done with the cache
   */
  async close(): Promise<void> {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
    }

    if (this.ownPool) {
      await this.pool.end();
    }
  }

  /**
   * Start automatic cleanup of expired entries
   * @private
   */
  private _startCleanup(interval: number): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanup().catch((err) => {
        console.error("Automatic cleanup failed:", err);
      });
    }, interval);

    // Don't keep the process alive just for cleanup
    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref();
    }
  }

  /**
   * Validate and compute expiration date from TTL
   * @private
   */
  private computeExpiresAt(ttl: number | undefined): Date | null {
    if (ttl === undefined || ttl === null) {
      return null;
    }

    if (!Number.isFinite(ttl) || ttl <= 0) {
      throw new PgCacheConfigError(
        `TTL must be a positive finite number, got: ${ttl}`
      );
    }

    return new Date(Date.now() + ttl * 1000);
  }

  /**
   * Ensure the cache is initialized before running queries
   * @private
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      await this.init();
    }
  }

  /**
   * Validate and quote table name to prevent SQL injection
   * @private
   */
  private validateAndQuoteTableName(tableName: string): string {
    // Validate: only alphanumeric and underscores, must start with letter or underscore
    const validIdentifierPattern = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

    if (!validIdentifierPattern.test(tableName)) {
      throw new PgCacheConfigError(
        `Invalid table name: "${tableName}". Table names must start with a letter or underscore and contain only letters, numbers, and underscores.`
      );
    }

    // Quote the identifier for safe use in SQL (escape any double quotes by doubling them)
    return `"${tableName.replace(/"/g, '""')}"`;
  }
}
