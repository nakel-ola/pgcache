# @pgcache/nest

`@pgcache/nest` is a **NestJS cache module for PostgreSQL**. It wraps pgcache in Nest dependency injection so you can use a Redis-like cache API, TTL support, and PostgreSQL-backed caching inside NestJS services and modules.

## Why Search for @pgcache/nest?

Use this package if you need:

- A **NestJS cache** backed by PostgreSQL
- A **Redis alternative for NestJS**
- A **TTL cache module** that fits existing Nest dependency injection
- A **Postgres-first caching strategy** without extra cache infrastructure

## Features

- Easy integration with NestJS dependency injection
- Support for both sync and async configuration
- Lifecycle management (automatic cleanup on module destroy)
- Full TypeScript support
- Compatible with ConfigService for dynamic configuration

## Installation

```bash
pnpm add @pgcache/nest @pgcache/core pg
```

## Quick Start

### Basic Usage (Synchronous)

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

### Using in a Service

```typescript
import { Injectable } from "@nestjs/common";
import { PgCacheService } from "@pgcache/nest";

@Injectable()
export class UserService {
  constructor(private readonly cache: PgCacheService) {}

  async getUser(id: string) {
    // Try to get from cache
    const cached = await this.cache.get<User>(`user:${id}`);
    if (cached) return cached;

    // Fetch from database
    const user = await this.userRepository.findById(id);

    // Store in cache with 5 minute TTL
    await this.cache.set(`user:${id}`, user, { ttl: 300 });

    return user;
  }

  async invalidateUser(id: string) {
    await this.cache.del(`user:${id}`);
  }
}
```

### Distributed Lock Example

Use `setNX` with `delIfEquals` for safe distributed locks:

```typescript
import { Injectable } from "@nestjs/common";
import { randomUUID } from "crypto";
import { PgCacheService } from "@pgcache/nest";

@Injectable()
export class TaskService {
  constructor(private readonly cache: PgCacheService) {}

  async processTask(taskId: string) {
    const lockKey = `lock:task:${taskId}`;
    const lockToken = randomUUID(); // Unique token for ownership

    // Try to acquire lock with 30 second TTL
    const acquired = await this.cache.setNX(
      lockKey,
      lockToken,
      { ttl: 30 }
    );

    if (!acquired) {
      console.log("Task already being processed");
      return;
    }

    try {
      // Do work...
      await this.doWork(taskId);
    } finally {
      // Safely release only if we still own the lock
      await this.cache.delIfEquals(lockKey, lockToken);
    }
  }

  private async doWork(taskId: string) {
    // Your task processing logic
  }
}
```

**Important:** Always use `delIfEquals()` to release locks, not `del()`. Using plain `del()` is unsafe because if your lock expires while processing, another process can acquire it, and your `del()` will delete their lock.

## Advanced Configuration

### Async Configuration with ConfigService

```typescript
import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { PgCacheModule } from "@pgcache/nest";

@Module({
  imports: [
    ConfigModule.forRoot(),
    PgCacheModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connectionString: configService.get<string>("DATABASE_URL"),
        cleanupInterval: configService.get<number>("CACHE_CLEANUP_INTERVAL"),
        table: "app_cache",
      }),
    }),
  ],
})
export class AppModule {}
```

### Using Existing Pool

```typescript
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
});

@Module({
  imports: [
    PgCacheModule.forRoot({
      pool,
      cleanupInterval: 30000, // 30 seconds
    }),
  ],
})
export class AppModule {}
```

## API

The `PgCacheService` provides the same methods as `PgCache` from `@pgcache/core`:

### Methods

- `set<T>(key, value, options?)` - Set a value with optional TTL
- `setNX<T>(key, value, options?)` - Set a value only if key doesn't exist (returns boolean)
- `get<T>(key)` - Get a value
- `del(key)` - Delete a key
- `delIfEquals<T>(key, expectedValue)` - Delete only if value matches (safe lock release)
- `exists(key)` - Check if key exists
- `ttl(key)` - Get remaining TTL
- `clear()` - Clear all entries
- `keys(pattern, caseInsensitive?)` - Get keys matching pattern
- `mget<T>(keys)` - Get multiple values
- `mset<T>(entries)` - Set multiple entries
- `cleanup()` - Manually cleanup expired entries
- `stats()` - Get cache statistics
- `getClient()` - Get underlying PgCache instance

### Configuration Options

```typescript
interface PgCacheOptions {
  connectionString?: string; // PostgreSQL connection string
  pool?: Pool; // Existing pg Pool
  poolConfig?: PoolConfig; // Pool configuration
  cleanupInterval?: number; // Auto-cleanup interval (ms, default: 60000)
  table?: string; // Table name (default: "pgcache")
  autoInit?: boolean; // Auto-create table (default: true)
}
```

## Example: Caching Decorator

Create a custom caching decorator:

```typescript
import { PgCacheService } from "@pgcache/nest";

export function Cacheable(ttl: number = 300) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const cache: PgCacheService = this.cache;
      const cacheKey = `${target.constructor.name}:${propertyKey}:${JSON.stringify(args)}`;

      const cached = await cache.get(cacheKey);
      if (cached) return cached;

      const result = await originalMethod.apply(this, args);
      await cache.set(cacheKey, result, { ttl });

      return result;
    };

    return descriptor;
  };
}

// Usage
@Injectable()
export class ProductService {
  constructor(private readonly cache: PgCacheService) {}

  @Cacheable(600) // 10 minutes
  async getProduct(id: string) {
    return this.productRepository.findById(id);
  }
}
```

## Testing

The module can be tested using `@nestjs/testing`:

```typescript
import { Test } from "@nestjs/testing";
import { PgCacheModule, PgCacheService } from "@pgcache/nest";

describe("UserService", () => {
  let service: UserService;
  let cache: PgCacheService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [
        PgCacheModule.forRoot({
          connectionString: process.env.TEST_DATABASE_URL,
        }),
      ],
      providers: [UserService],
    }).compile();

    service = module.get<UserService>(UserService);
    cache = module.get<PgCacheService>(PgCacheService);
  });

  it("should cache user data", async () => {
    // Your tests here
  });
});
```

## License

MIT
