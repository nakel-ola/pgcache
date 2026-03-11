# NestJS Example - PgCache

A complete NestJS application demonstrating how to use `@pgcache/nest` for caching in a production-ready way.

## Features

This example showcases:

- NestJS module integration with `PgCacheModule`
- Dependency injection with `PgCacheService`
- Real-world caching patterns
- Cache invalidation strategies
- REST API with cached endpoints
- Cache hit/miss logging
- Health checks with cache statistics

## Architecture

```
src/
├── main.ts                 # Application entry point
├── app.module.ts           # Root module with PgCacheModule
├── app.controller.ts       # Health and utility endpoints
└── users/                  # Example feature module
    ├── users.module.ts     # Users module
    ├── users.controller.ts # Users REST endpoints
    └── users.service.ts    # Business logic with caching
```

## Setup

1. Install dependencies:

```bash
pnpm install
```

2. Configure PostgreSQL connection:

```bash
export DATABASE_URL="postgresql://localhost:5432/pgcache_dev"
```

Or create a `.env` file:

```env
DATABASE_URL=postgresql://localhost:5432/pgcache_dev
PORT=3001
```

3. Run the application:

```bash
# Development mode with auto-reload
pnpm dev

# Production mode
pnpm build
pnpm start:prod
```

## API Endpoints

### Root Endpoints

#### Welcome Message

```bash
curl http://localhost:3001/
```

#### Health Check

```bash
curl http://localhost:3001/health
```

#### Clear All Cache

```bash
curl -X POST http://localhost:3001/cache/clear
```

### User Endpoints

#### Get All Users (Cached)

```bash
curl http://localhost:3001/users
```

The first request will fetch from "database" (simulated delay). Subsequent requests within 60 seconds will be served from cache.

#### Get User by ID (Cached)

```bash
curl http://localhost:3001/users/1
```

Individual user data is cached for 5 minutes.

#### Create User

```bash
curl -X POST http://localhost:3001/users \
  -H "Content-Type: application/json" \
  -d '{"name": "Alice Johnson", "email": "alice@example.com"}'
```

Creating a user invalidates the "all users" cache.

#### Update User

```bash
curl -X PUT http://localhost:3001/users/1 \
  -H "Content-Type: application/json" \
  -d '{"name": "Updated Name"}'
```

Updating a user invalidates both the specific user cache and the "all users" cache.

#### Delete User

```bash
curl -X DELETE http://localhost:3001/users/1
```

Deleting a user invalidates both the specific user cache and the "all users" cache.

#### Get User Cache Statistics

```bash
curl http://localhost:3001/users/cache/stats
```

## Caching Strategy

### Cache Keys

- `users:all` - All users list (TTL: 60 seconds)
- `user:{id}` - Individual user (TTL: 300 seconds)

### Cache Invalidation

1. **Create User**: Invalidates `users:all`
2. **Update User**: Invalidates `user:{id}` and `users:all`
3. **Delete User**: Invalidates `user:{id}` and `users:all`

### Cache Hit/Miss Logging

Watch the console to see cache hits and misses:

```
✅ Cache HIT: users:all
❌ Cache MISS: user:123
```

## Testing the Cache

### Test Cache Hit

```bash
# First request (cache miss)
time curl http://localhost:3001/users/1

# Second request (cache hit - much faster)
time curl http://localhost:3001/users/1
```

### Test Cache Invalidation

```bash
# Get user (cache miss)
curl http://localhost:3001/users/1

# Get user again (cache hit)
curl http://localhost:3001/users/1

# Update user (invalidates cache)
curl -X PUT http://localhost:3001/users/1 \
  -H "Content-Type: application/json" \
  -d '{"name": "New Name"}'

# Get user again (cache miss because it was invalidated)
curl http://localhost:3001/users/1
```

## Code Highlights

### Module Configuration

```typescript
// app.module.ts
@Module({
  imports: [
    PgCacheModule.forRoot({
      connectionString: process.env.DATABASE_URL,
      cleanupInterval: 60000,
      table: 'app_cache',
    }),
  ],
})
export class AppModule {}
```

### Service with Caching

```typescript
// users.service.ts
@Injectable()
export class UsersService {
  constructor(private readonly cache: PgCacheService) {}

  async findOne(id: string): Promise<User> {
    const cacheKey = `user:${id}`;

    // Try cache first
    const cached = await this.cache.get<User>(cacheKey);
    if (cached) return cached;

    // Fetch from database
    const user = await this.fetchFromDatabase(id);

    // Store in cache
    await this.cache.set(cacheKey, user, { ttl: 300 });

    return user;
  }
}
```

## Performance Comparison

Without cache:
```
First request:  ~100ms (database query)
Second request: ~100ms (database query)
```

With cache:
```
First request:  ~100ms (cache miss + database query)
Second request: ~5ms   (cache hit)
```

## Advanced Patterns

### Custom Caching Decorator

You can create a custom decorator for automatic caching:

```typescript
export function Cacheable(ttl: number) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    // Decorator implementation
  };
}

@Cacheable(300)
async getUser(id: string) {
  // This method's results will be automatically cached
}
```

See the full implementation in the [NestJS package README](../../packages/nest/README.md#example-caching-decorator).

## Learn More

- [@pgcache/nest Documentation](../../packages/nest/README.md)
- [@pgcache/core Documentation](../../packages/core/README.md)
- [Main README](../../README.md)
- [NestJS Documentation](https://docs.nestjs.com)
