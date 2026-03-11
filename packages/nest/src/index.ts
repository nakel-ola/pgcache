/**
 * @pgcache/nest - NestJS integration for pgcache
 * @module
 */

export { PgCacheModule } from "./pgcache.module.js";
export type { PgCacheModuleAsyncOptions } from "./pgcache.module.js";
export { PgCacheService } from "./pgcache.service.js";
export { PGCACHE_MODULE_OPTIONS, PGCACHE_INSTANCE } from "./pgcache.constants.js";

// Re-export types for convenience
export type {
  PgCacheOptions,
  PgCacheSetOptions,
  PgCacheSetEntry,
  PgCacheStats,
} from "@pgcache/types";
