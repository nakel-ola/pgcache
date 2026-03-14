# @pgcache/types

`@pgcache/types` provides the shared **TypeScript types for pgcache**, including PostgreSQL cache configuration, cache entry contracts, TTL options, and cache statistics interfaces.

## Installation

```bash
pnpm add @pgcache/types
```

## Usage

```typescript
import type { PgCacheOptions, CacheEntry } from "@pgcache/types";
```

## Exports

- `PgCacheOptions` - Configuration options for PgCache
- `PgCacheSetOptions` - Options for set operations (TTL)
- `CacheEntry` - Internal cache entry representation
- `PgCacheSetEntry` - Entry for batch set operations
- `PgCacheTTLResult` - Result of TTL check
- `PgCacheStats` - Cache statistics
- Error classes:
  - `PgCacheError` - Base error
  - `PgCacheConnectionError` - Connection errors
  - `PgCacheQueryError` - Query errors
  - `PgCacheConfigError` - Configuration errors

## License

MIT
