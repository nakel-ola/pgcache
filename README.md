# pgcache

[![CI](https://github.com/yourusername/pgcache/actions/workflows/ci.yml/badge.svg)](https://github.com/yourusername/pgcache/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A **Redis-like cache client** implemented using PostgreSQL UNLOGGED tables. Get the performance benefits of in-database caching with a familiar Redis-style API.

## Features

- **Redis-like API** - Familiar methods like `set`, `get`, `del`, `exists`, `ttl`
- **TTL Support** - Automatic expiration with Time To Live
- **Batch Operations** - Efficient `mget` and `mset` for multiple operations
- **Pattern Matching** - Find keys using SQL LIKE patterns
- **TypeScript Native** - Full type safety with strict TypeScript
- **Production Ready** - Connection pooling, prepared statements, automatic cleanup
- **NestJS Integration** - First-class support for NestJS applications
- **High Performance** - UNLOGGED tables for maximum speed
- **Monorepo Structure** - Clean architecture with separate packages

## Why pgcache?

### Use Cases

- **Application Caching** - Cache database queries, API responses, computed results
- **Session Storage** - Store user sessions with automatic expiration
- **Rate Limiting** - Track API rate limits with TTL
- **PostgreSQL-First Architecture** - No need for separate Redis infrastructure
- **Simplified Deployment** - One less service to manage and monitor

### When to Use

✅ You're already using PostgreSQL
✅ You want to reduce infrastructure complexity
✅ You need database-level caching
✅ You want ACID guarantees for your cache
✅ Your cache data can tolerate potential loss on crashes (UNLOGGED tables)

### When Not to Use

❌ You need guaranteed persistence (use Redis or regular tables)
❌ You need pub/sub features
❌ You need distributed caching across multiple databases
❌ Your app doesn't use PostgreSQL

## Packages

This monorepo contains:

- **[@pgcache/core](./packages/core)** - Core cache client
- **[@pgcache/nest](./packages/nest)** - NestJS integration
- **[@pgcache/types](./packages/types)** - Shared TypeScript types

## Quick Start

### Installation

```bash
# Core package
pnpm add @pgcache/core

# NestJS integration
pnpm add @pgcache/nest
```

### Basic Usage (Node.js)

```typescript
import { PgCache } from "@pgcache/core";

const cache = new PgCache({
  connectionString: process.env.DATABASE_URL,
});

// Set a value with 60 second TTL
await cache.set("user:1", { name: "Lekan", age: 30 }, { ttl: 60 });

// Get a value
const user = await cache.get("user:1");
console.log(user); // { name: "Lekan", age: 30 }

// Check if exists
const exists = await cache.exists("user:1");

// Delete
await cache.del("user:1");
```

### NestJS Integration

```typescript
import { Module } from "@nestjs/common";
import { PgCacheModule } from "@pgcache/nest";

@Module({
  imports: [
    PgCacheModule.forRoot({
      connectionString: process.env.DATABASE_URL,
    }),
  ],
})
export class AppModule {}
```

```typescript
import { Injectable } from "@nestjs/common";
import { PgCacheService } from "@pgcache/nest";

@Injectable()
export class UserService {
  constructor(private readonly cache: PgCacheService) {}

  async getUser(id: string) {
    const cacheKey = `user:${id}`;

    // Try cache first
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

    // Fetch from database
    const user = await this.userRepository.findById(id);

    // Cache for 5 minutes
    await this.cache.set(cacheKey, user, { ttl: 300 });

    return user;
  }
}
```

## API Reference

### Core Methods

| Method | Description |
|--------|-------------|
| `set(key, value, options?)` | Set a value with optional TTL |
| `get(key)` | Get a value |
| `del(key)` | Delete a key |
| `exists(key)` | Check if key exists |
| `ttl(key)` | Get remaining TTL in seconds |
| `clear()` | Delete all entries |
| `keys(pattern)` | Get keys matching SQL LIKE pattern |
| `mget(keys)` | Get multiple values at once |
| `mset(entries)` | Set multiple entries (transactional) |
| `cleanup()` | Manually remove expired entries |
| `stats()` | Get cache statistics |

### Configuration Options

```typescript
interface PgCacheOptions {
  connectionString?: string;  // PostgreSQL connection string
  pool?: Pool;                // Existing pg Pool
  poolConfig?: PoolConfig;    // Pool configuration
  cleanupInterval?: number;   // Auto-cleanup interval (ms)
  table?: string;             // Table name (default: "pgcache")
  autoInit?: boolean;         // Auto-create table (default: true)
}
```

## Database Schema

pgcache uses a PostgreSQL UNLOGGED table for maximum performance:

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

**Note**: UNLOGGED tables offer better performance but data may be lost on database crashes. This is acceptable for cache use cases.

## Examples

### Node.js / Express

See [examples/node](./examples/node) for a complete REST API example.

```bash
cd examples/node
pnpm install
pnpm dev
```

### NestJS

See [examples/nest](./examples/nest) for a complete NestJS application.

```bash
cd examples/nest
pnpm install
pnpm dev
```

## Development

### Prerequisites

- Node.js 20+
- PostgreSQL 12+
- pnpm 9+

### Setup

```bash
# Clone the repository
git clone https://github.com/yourusername/pgcache.git
cd pgcache

# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests (requires PostgreSQL)
export TEST_DATABASE_URL="postgresql://localhost:5432/pgcache_test"
pnpm test
```

### Project Structure

```
pgcache/
├── packages/
│   ├── core/              # @pgcache/core - Main cache client
│   ├── nest/              # @pgcache/nest - NestJS integration
│   └── types/             # @pgcache/types - Shared types
├── examples/
│   ├── node/              # Node.js example
│   └── nest/              # NestJS example
├── .github/
│   └── workflows/         # CI/CD workflows
└── .changeset/            # Version management
```

### Scripts

```bash
pnpm build          # Build all packages
pnpm test           # Run all tests
pnpm lint           # Lint code with oxc
pnpm format         # Format code with oxc
pnpm typecheck      # Type check all packages
pnpm changeset      # Create a changeset for versioning
```

## Performance

### Benchmarks

Typical performance characteristics:

- **Set operation**: ~1-2ms
- **Get operation (cache hit)**: ~0.5-1ms
- **Get operation (cache miss)**: ~1-2ms
- **Batch operations (mset/mget)**: ~2-5ms for 10 entries

Performance depends on:
- Database server specifications
- Network latency
- Connection pool configuration
- Data size

### Optimization Tips

1. **Use batch operations** - `mget`/`mset` for multiple operations
2. **Tune cleanup interval** - Match your expiration patterns
3. **Connection pooling** - Configure pool size based on concurrency
4. **Use prepared statements** - Built-in for all operations
5. **Monitor cache hit rate** - Use `stats()` to track effectiveness

## Testing

```bash
# Run tests for all packages
pnpm test

# Run tests with coverage
pnpm test:coverage

# Run tests in watch mode
pnpm test:watch
```

Tests require a PostgreSQL database. Set the connection string:

```bash
export TEST_DATABASE_URL="postgresql://localhost:5432/pgcache_test"
```

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

### Development Workflow

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Run `pnpm changeset` to document changes
6. Submit a pull request

## Versioning

This project uses [Changesets](https://github.com/changesets/changesets) for version management and changelog generation.

## License

MIT © [pgcache contributors](./LICENSE)

## Acknowledgments

- Inspired by Redis and its API design
- Built on the solid foundation of PostgreSQL
- Powered by [node-postgres](https://node-postgres.com/)

## Support

- **Documentation**: [Package READMEs](./packages)
- **Examples**: [examples/](./examples)
- **Issues**: [GitHub Issues](https://github.com/yourusername/pgcache/issues)

---

Made with ❤️ by the pgcache team
