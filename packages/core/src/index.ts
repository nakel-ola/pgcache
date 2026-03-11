/**
 * @pgcache/core - Redis-like cache client using PostgreSQL UNLOGGED tables
 * @module
 */

export { PgCache } from "./pgcache.js";

// Re-export types from @pgcache/types for convenience
export type {
  PgCacheOptions,
  PgCacheSetOptions,
  PgCacheSetEntry,
  PgCacheTTLResult,
  PgCacheStats,
  CacheEntry,
} from "@pgcache/types";

export {
  PgCacheError,
  PgCacheConnectionError,
  PgCacheQueryError,
  PgCacheConfigError,
} from "@pgcache/types";
