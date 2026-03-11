# @pgcache/core

Redis-like cache client using PostgreSQL UNLOGGED tables for high-performance caching.

## Features

- Redis-like API (set, get, del, exists, ttl, etc.)
- TTL (Time To Live) support
- Batch operations (mget, mset)
- Pattern-based key search
- Automatic cleanup of expired entries
- TypeScript support with full type safety
- Connection pooling
- JSONB storage for any serializable data

## Installation

```bash
pnpm add @pgcache/core
```

## Quick Start

```typescript
import { PgCache } from "@pgcache/core";

const cache = new PgCache({
  connectionString: process.env.DATABASE_URL,
});

// Set a value with 60 second TTL
await cache.set("user:1", { name: "Lekan" }, { ttl: 60 });

// Get a value
const user = await cache.get("user:1");
console.log(user); // { name: "Lekan" }

// Check if key exists
const exists = await cache.exists("user:1");

// Delete a key
await cache.del("user:1");
```

## API Reference

### Constructor

```typescript
new PgCache(options: PgCacheOptions)
```

**Options:**

- `connectionString?: string` - PostgreSQL connection string
- `pool?: Pool` - Existing pg Pool instance
- `poolConfig?: PoolConfig` - Additional pool configuration
- `cleanupInterval?: number` - Auto-cleanup interval in ms (default: 60000)
- `table?: string` - Cache table name (default: "pgcache")
- `autoInit?: boolean` - Auto-create table (default: true)

### Methods

#### `set(key, value, options?)`

Set a value in the cache.

```typescript
await cache.set("user:1", { name: "Lekan" }, { ttl: 60 });
```

#### `get<T>(key)`

Get a value from the cache.

```typescript
const user = await cache.get<User>("user:1");
```

#### `del(key)`

Delete a key from the cache.

```typescript
const deleted = await cache.del("user:1");
```

#### `exists(key)`

Check if a key exists.

```typescript
const exists = await cache.exists("user:1");
```

#### `ttl(key)`

Get remaining TTL in seconds.

```typescript
const ttl = await cache.ttl("user:1");
// Returns: seconds remaining, -1 for no expiry, -2 if key doesn't exist
```

#### `clear()`

Clear all entries.

```typescript
await cache.clear();
```

#### `keys(pattern, caseInsensitive?)`

Get keys matching a SQL LIKE pattern.

```typescript
const userKeys = await cache.keys("user:%");
```

#### `mget<T>(keys)`

Get multiple values at once.

```typescript
const values = await cache.mget(["user:1", "user:2"]);
// Returns: Map<string, T>
```

#### `mset(entries)`

Set multiple entries at once (uses transaction).

```typescript
await cache.mset([
  { key: "user:1", value: { name: "Lekan" }, ttl: 60 },
  { key: "user:2", value: { name: "John" } },
]);
```

#### `cleanup()`

Manually remove expired entries.

```typescript
const deleted = await cache.cleanup();
```

#### `stats()`

Get cache statistics.

```typescript
const stats = await cache.stats();
console.log(stats.totalEntries, stats.activeEntries);
```

#### `close()`

Close the connection pool.

```typescript
await cache.close();
```

## Database Schema

The cache uses an UNLOGGED table for maximum performance:

```sql
CREATE UNLOGGED TABLE pgcache (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  expires_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX pgcache_expires_idx
ON pgcache(expires_at)
WHERE expires_at IS NOT NULL;
```

## Performance Tips

- UNLOGGED tables provide better performance but data may be lost on crashes
- Use batch operations (mget/mset) for multiple operations
- Adjust `cleanupInterval` based on your expiration patterns
- Use connection pooling for high-concurrency scenarios

## License

MIT
