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

#### `setNX(key, value, options?)`

Set a value only if the key does not already exist (SET if Not Exists).

Returns `true` if the key was set, `false` if it already exists.

This is useful for distributed locks and preventing race conditions.

**Example - Distributed Lock:**

```typescript
const acquired = await cache.setNX(
  "lock:user:1",
  "processing",
  { ttl: 30 }
);

if (acquired) {
  console.log("Lock acquired!");
  // Do work...
  await cache.del("lock:user:1");
} else {
  console.log("Lock already held");
}
```

**Example - Prevent Duplicate Processing:**

```typescript
const key = `job:${jobId}`;
const started = await cache.setNX(key, "running", { ttl: 300 });

if (!started) {
  console.log("Job already running");
  return;
}

// Process job...
```

**Return Value:**
- `true` - Key was successfully set
- `false` - Key already exists

**Note:** Expired keys are treated as non-existent, so setNX will succeed if the key exists but is expired.

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

## Using Custom Pool

### When to Use a Custom Pool

Use a custom pool when you need to:
- **Share a connection pool** across multiple parts of your application
- **Configure advanced pool options** (connection limits, timeouts, SSL, etc.)
- **Monitor pool health** and connection metrics
- **Reuse an existing pool** from your application

### Basic Custom Pool

```typescript
import { Pool } from "pg";
import { PgCache } from "@pgcache/core";

// Create your own pool with custom configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,                      // Maximum pool size
  idleTimeoutMillis: 30000,     // Close idle clients after 30 seconds
  connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection not established
});

// Use the custom pool
const cache = new PgCache({ pool });

// pgcache won't close your pool when cache.close() is called
await cache.close(); // Only stops cleanup, doesn't end the pool

// You manage the pool lifecycle
await pool.end();
```

### Sharing Pools Across Instances

You can share a single pool across multiple PgCache instances:

```typescript
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 50, // Higher limit for multiple cache instances
});

// Multiple cache instances using different tables
const userCache = new PgCache({
  pool,
  table: "user_cache",
  cleanupInterval: 60000,
});

const sessionCache = new PgCache({
  pool,
  table: "session_cache",
  cleanupInterval: 30000,
});

const productCache = new PgCache({
  pool,
  table: "product_cache",
  cleanupInterval: 120000,
});

// All instances share the same connection pool
```

### Advanced Pool Configuration

```typescript
import { Pool } from "pg";
import { PgCache } from "@pgcache/core";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,

  // Connection pool settings
  max: 20,                      // Max number of clients in pool
  min: 5,                       // Min number of clients
  idleTimeoutMillis: 30000,     // Close idle clients after 30s
  connectionTimeoutMillis: 2000, // Fail after 2s if connection can't be established

  // Statement timeout (queries will be cancelled after this time)
  statement_timeout: 5000,

  // SSL configuration
  ssl: {
    rejectUnauthorized: false,
  },

  // Application name for monitoring
  application_name: "pgcache_app",
});

// Pool error handling
pool.on("error", (err, client) => {
  console.error("Unexpected pool error:", err);
});

pool.on("connect", (client) => {
  console.log("New client connected to pool");
});

pool.on("remove", (client) => {
  console.log("Client removed from pool");
});

const cache = new PgCache({ pool });
```

### Pool Monitoring

```typescript
import { Pool } from "pg";
import { PgCache } from "@pgcache/core";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
});

const cache = new PgCache({ pool });

// Monitor pool health
function logPoolStats() {
  console.log("Pool Stats:", {
    totalCount: pool.totalCount,     // Total number of clients
    idleCount: pool.idleCount,       // Idle clients
    waitingCount: pool.waitingCount, // Clients waiting for connection
  });
}

setInterval(logPoolStats, 10000); // Log every 10 seconds

// Graceful shutdown
process.on("SIGTERM", async () => {
  await cache.close(); // Stop cleanup
  await pool.end();    // Close all connections
  process.exit(0);
});
```

### TypeScript Pool Types

```typescript
import { Pool, PoolConfig } from "pg";
import { PgCache } from "@pgcache/core";

const poolConfig: PoolConfig = {
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
};

const pool = new Pool(poolConfig);
const cache = new PgCache({ pool });

// Type-safe pool access
pool.query("SELECT version()").then((result) => {
  console.log("PostgreSQL version:", result.rows[0]);
});
```

## Performance Tips

- UNLOGGED tables provide better performance but data may be lost on crashes
- Use batch operations (mget/mset) for multiple operations
- Adjust `cleanupInterval` based on your expiration patterns
- Use connection pooling for high-concurrency scenarios
- **Configure pool size** based on your concurrent query load
- **Monitor pool metrics** to optimize connection settings

## License

MIT
