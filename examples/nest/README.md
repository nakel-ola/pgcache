# PgCache NestJS Example

A complete REST API example demonstrating how to use `@pgcache/nest` in a NestJS application.

## Features

- 🚀 Full CRUD API for user management
- 💾 Caching with automatic invalidation
- 📊 Cache statistics endpoint
- 🏥 Health check with cache metrics
- ⚡ Demonstrates cache hits/misses in console

## Prerequisites

- Node.js 20+
- PostgreSQL 12+
- pnpm (or npm/yarn)

## Setup

### 1. Install Dependencies

From the root of the monorepo:

```bash
pnpm install
pnpm build
```

### 2. Create PostgreSQL Database

Create the development database:

```bash
# Using psql
psql -d template1 -c "CREATE DATABASE pgcache_dev;"

# Or using createdb
createdb pgcache_dev
```

### 3. Configure Database Connection (Optional)

By default, the app connects to `postgresql://localhost:5432/pgcache_dev`.

To use a different connection string, set the `DATABASE_URL` environment variable:

```bash
export DATABASE_URL="postgresql://username:password@localhost:5432/your_database"
```

### 4. Start the Application

```bash
# From the monorepo root
pnpm --filter @pgcache-examples/nest start

# Or from this directory
cd examples/nest
pnpm start

# Development mode with watch
pnpm dev
```

The server will start at `http://localhost:3001`

## API Endpoints

### General

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Welcome message |
| GET | `/health` | Health check with cache stats |
| POST | `/cache/clear` | Clear all cache entries |

### Users

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/users` | Get all users (cached for 60s) |
| GET | `/users/:id` | Get user by ID (cached for 5min) |
| POST | `/users` | Create new user |
| PUT | `/users/:id` | Update user (invalidates cache) |
| DELETE | `/users/:id` | Delete user (invalidates cache) |
| GET | `/users/cache/stats` | Get cache statistics |

## Usage Examples

### Get All Users

\`\`\`bash
curl http://localhost:3001/users
\`\`\`

**First request** (cache MISS):
\`\`\`
❌ Cache MISS: users:all
\`\`\`

**Second request** (cache HIT):
\`\`\`
✅ Cache HIT: users:all
\`\`\`

### Get User by ID

\`\`\`bash
curl http://localhost:3001/users/1
\`\`\`

### Create User

\`\`\`bash
curl -X POST http://localhost:3001/users \\
  -H "Content-Type: application/json" \\
  -d '{"name": "Alice Smith", "email": "alice@example.com"}'
\`\`\`

This automatically invalidates the \`users:all\` cache.

### Update User

\`\`\`bash
curl -X PUT http://localhost:3001/users/1 \\
  -H "Content-Type: application/json" \\
  -d '{"name": "Updated Name"}'
\`\`\`

This invalidates both \`user:1\` and \`users:all\` caches.

### Delete User

\`\`\`bash
curl -X DELETE http://localhost:3001/users/1
\`\`\`

### Cache Statistics

\`\`\`bash
curl http://localhost:3001/users/cache/stats
\`\`\`

Response:
\`\`\`json
{
  "userCacheKeys": ["user:1", "user:2", "users:all"],
  "cacheStats": {
    "totalEntries": 3,
    "expiredEntries": 0,
    "activeEntries": 3,
    "approximateSize": 8192
  }
}
\`\`\`

### Health Check

\`\`\`bash
curl http://localhost:3001/health
\`\`\`

Response:
\`\`\`json
{
  "status": "ok",
  "timestamp": "2026-03-11T15:30:00.000Z",
  "uptime": 42.5,
  "database": "connected",
  "cache": {
    "totalEntries": 3,
    "activeEntries": 3,
    "expiredEntries": 0
  }
}
\`\`\`

## Code Structure

\`\`\`
src/
├── main.ts                  # Application entry point
├── app.module.ts            # Root module with PgCache configuration
├── app.controller.ts        # Health and cache management endpoints
└── users/
    ├── users.module.ts      # Users feature module
    ├── users.controller.ts  # Users REST endpoints
    └── users.service.ts     # Business logic with caching
\`\`\`

## Caching Strategy

### Cache Keys

- \`users:all\` - List of all users (TTL: 60 seconds)
- \`user:{id}\` - Individual user data (TTL: 5 minutes)

### Cache Invalidation

- **Create User**: Invalidates \`users:all\`
- **Update User**: Invalidates \`user:{id}\` and \`users:all\`
- **Delete User**: Invalidates \`user:{id}\` and \`users:all\`

### Why This Works

The cache is automatically invalidated when data changes, ensuring users always see fresh data while maximizing cache hits for read operations.

## Configuration

The PgCache module is configured in \`app.module.ts\`:

\`\`\`typescript
PgCacheModule.forRoot({
  connectionString: process.env.DATABASE_URL ||
    "postgresql://localhost:5432/pgcache_dev",
  cleanupInterval: 60000,  // Cleanup every minute
  table: "app_cache",      // Custom table name
})
\`\`\`

### Configuration Options

| Option | Description | Default |
|--------|-------------|---------|
| \`connectionString\` | PostgreSQL connection URL | Required |
| \`cleanupInterval\` | Automatic cleanup interval (ms) | \`60000\` |
| \`table\` | Cache table name | \`"pgcache"\` |
| \`autoInit\` | Auto-create table | \`true\` |

## Troubleshooting

### Database Connection Error

**Error**: \`database "pgcache_dev" does not exist\`

**Solution**: Create the database:
\`\`\`bash
createdb pgcache_dev
# or
psql -d template1 -c "CREATE DATABASE pgcache_dev;"
\`\`\`

### Port Already in Use

**Error**: \`EADDRINUSE: address already in use :::3001\`

**Solution**: Kill the existing process or change the port in \`src/main.ts\`:
\`\`\`bash
# Kill process on port 3001
lsof -ti:3001 | xargs kill -9
\`\`\`

### PostgreSQL Not Running

**Error**: \`connection refused\`

**Solution**: Start PostgreSQL:
\`\`\`bash
# macOS (Homebrew)
brew services start postgresql@16

# Linux (systemd)
sudo systemctl start postgresql

# Check status
psql -d template1 -c "SELECT version();"
\`\`\`

### Cache Not Working

1. **Check database connection**: Visit \`/health\` endpoint
2. **Check cache table**: \`psql pgcache_dev -c "SELECT * FROM app_cache;"\`
3. **Check logs**: Look for cache HIT/MISS messages in console
4. **Clear cache**: \`curl -X POST http://localhost:3001/cache/clear\`

## Performance

Expected response times:

- **Cache HIT**: ~1-5ms
- **Cache MISS**: ~100ms (simulated DB delay)
- **Cache invalidation**: ~1-2ms

The example includes artificial delays to demonstrate cache benefits clearly.

## Learn More

- [@pgcache/nest documentation](../../packages/nest/README.md)
- [@pgcache/core documentation](../../packages/core/README.md)
- [NestJS documentation](https://docs.nestjs.com)

## License

MIT
