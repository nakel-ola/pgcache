# Node.js Example - PgCache

A simple Express.js REST API demonstrating how to use `@pgcache/core` in a Node.js application.

## Features

This example showcases:

- Basic cache operations (set, get, delete, exists)
- TTL (Time To Live) support
- Pattern-based key search
- Batch operations (mget, mset)
- Cache statistics
- Manual cleanup
- Graceful shutdown

## Setup

1. Install dependencies:

```bash
pnpm install
```

2. Configure PostgreSQL connection:

```bash
export DATABASE_URL="postgresql://user:password@localhost:5432/pgcache_dev"
```

Or create a `.env` file:

```env
DATABASE_URL=postgresql://localhost:5432/pgcache_dev
PORT=3000
```

3. Run the application:

```bash
# Development mode with auto-reload
pnpm dev

# Production mode
pnpm start
```

## API Endpoints

### Health Check

```bash
curl http://localhost:3000/health
```

### Set a Cache Value

```bash
# Without TTL
curl -X POST http://localhost:3000/cache/user:1 \
  -H "Content-Type: application/json" \
  -d '{"value": {"name": "Lekan", "age": 30}}'

# With TTL (60 seconds)
curl -X POST http://localhost:3000/cache/session:abc123 \
  -H "Content-Type: application/json" \
  -d '{"value": {"userId": "123", "token": "xyz"}, "ttl": 60}'
```

### Get a Cache Value

```bash
curl http://localhost:3000/cache/user:1
```

### Delete a Cache Value

```bash
curl -X DELETE http://localhost:3000/cache/user:1
```

### Check if Key Exists

```bash
curl http://localhost:3000/cache/user:1/exists
```

### Get Keys by Pattern

```bash
# Get all user keys
curl http://localhost:3000/keys/user:%

# Get all keys
curl http://localhost:3000/keys/%
```

### Get Cache Statistics

```bash
curl http://localhost:3000/stats
```

### Clear All Cache

```bash
curl -X DELETE http://localhost:3000/cache
```

### Manual Cleanup

```bash
curl -X POST http://localhost:3000/cleanup
```

### Batch Set

```bash
curl -X POST http://localhost:3000/batch/set \
  -H "Content-Type: application/json" \
  -d '{
    "entries": [
      {"key": "user:1", "value": {"name": "Alice"}},
      {"key": "user:2", "value": {"name": "Bob"}, "ttl": 300},
      {"key": "user:3", "value": {"name": "Charlie"}}
    ]
  }'
```

### Batch Get

```bash
curl -X POST http://localhost:3000/batch/get \
  -H "Content-Type: application/json" \
  -d '{"keys": ["user:1", "user:2", "user:3"]}'
```

## Example Usage Flow

```bash
# 1. Check health
curl http://localhost:3000/health

# 2. Set some cache entries
curl -X POST http://localhost:3000/cache/product:1 \
  -H "Content-Type: application/json" \
  -d '{"value": {"name": "Laptop", "price": 999}, "ttl": 300}'

curl -X POST http://localhost:3000/cache/product:2 \
  -H "Content-Type: application/json" \
  -d '{"value": {"name": "Phone", "price": 599}, "ttl": 300}'

# 3. Get a value
curl http://localhost:3000/cache/product:1

# 4. List all products
curl http://localhost:3000/keys/product:%

# 5. Check statistics
curl http://localhost:3000/stats

# 6. Delete a specific product
curl -X DELETE http://localhost:3000/cache/product:1

# 7. Clear all cache
curl -X DELETE http://localhost:3000/cache
```

## Code Structure

```
examples/node/
├── src/
│   └── index.ts          # Main application
├── package.json
├── tsconfig.json
└── README.md
```

## Learn More

- [@pgcache/core Documentation](../../packages/core/README.md)
- [Main README](../../README.md)
