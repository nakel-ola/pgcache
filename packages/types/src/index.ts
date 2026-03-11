import type { Pool, PoolConfig } from "pg";

/**
 * Options for configuring TTL (Time To Live) on cache entries
 */
export interface PgCacheSetOptions {
  /**
   * Time to live in seconds. If not provided, the entry never expires.
   */
  ttl?: number;
}

/**
 * Configuration options for PgCache
 */
export interface PgCacheOptions {
  /**
   * PostgreSQL connection string (e.g., "postgresql://user:password@localhost:5432/db")
   * Either connectionString or pool must be provided
   */
  connectionString?: string;

  /**
   * Existing PostgreSQL connection pool
   * Either connectionString or pool must be provided
   */
  pool?: Pool;

  /**
   * Additional pool configuration (only used when connectionString is provided)
   */
  poolConfig?: PoolConfig;

  /**
   * Interval in milliseconds for automatic cleanup of expired entries
   * Set to 0 to disable automatic cleanup
   * @default 60000 (1 minute)
   */
  cleanupInterval?: number;

  /**
   * Name of the cache table in PostgreSQL
   * @default "pgcache"
   */
  table?: string;

  /**
   * Automatically create the cache table and indexes if they don't exist
   * @default true
   */
  autoInit?: boolean;
}

/**
 * Internal representation of a cache entry
 */
export interface CacheEntry<T = unknown> {
  /**
   * The cache key
   */
  key: string;

  /**
   * The cached value (stored as JSONB in PostgreSQL)
   */
  value: T;

  /**
   * Timestamp when the entry expires (null for non-expiring entries)
   */
  expiresAt: Date | null;

  /**
   * Timestamp when the entry was created
   */
  createdAt: Date;
}

/**
 * Entry for batch set operations
 */
export interface PgCacheSetEntry<T = unknown> {
  /**
   * The cache key
   */
  key: string;

  /**
   * The value to cache
   */
  value: T;

  /**
   * Optional TTL in seconds for this specific entry
   */
  ttl?: number;
}

/**
 * Result of a TTL check
 */
export interface PgCacheTTLResult {
  /**
   * The cache key
   */
  key: string;

  /**
   * Remaining time to live in seconds (-1 for non-expiring entries, -2 if key doesn't exist)
   */
  ttl: number;
}

/**
 * Statistics about the cache
 */
export interface PgCacheStats {
  /**
   * Total number of entries in the cache
   */
  totalEntries: number;

  /**
   * Number of expired entries
   */
  expiredEntries: number;

  /**
   * Number of active (non-expired) entries
   */
  activeEntries: number;

  /**
   * Approximate size of the cache in bytes
   */
  approximateSize: number;
}

/**
 * Base error class for all PgCache errors
 */
export class PgCacheError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PgCacheError";
    Object.setPrototypeOf(this, PgCacheError.prototype);
  }
}

/**
 * Error thrown when there's a connection issue with PostgreSQL
 */
export class PgCacheConnectionError extends PgCacheError {
  constructor(message: string, public readonly cause?: Error) {
    super(message);
    this.name = "PgCacheConnectionError";
    Object.setPrototypeOf(this, PgCacheConnectionError.prototype);
  }
}

/**
 * Error thrown when a query fails
 */
export class PgCacheQueryError extends PgCacheError {
  constructor(
    message: string,
    public readonly query?: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = "PgCacheQueryError";
    Object.setPrototypeOf(this, PgCacheQueryError.prototype);
  }
}

/**
 * Error thrown when configuration is invalid
 */
export class PgCacheConfigError extends PgCacheError {
  constructor(message: string) {
    super(message);
    this.name = "PgCacheConfigError";
    Object.setPrototypeOf(this, PgCacheConfigError.prototype);
  }
}
