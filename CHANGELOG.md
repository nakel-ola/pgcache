# pgcache

## Unreleased

### Initial Release

This is the initial release of pgcache - a Redis-like cache client using PostgreSQL UNLOGGED tables.

#### Packages

- `@pgcache/core@0.0.1` - Core cache client
- `@pgcache/nest@0.0.1` - NestJS integration
- `@pgcache/types@0.0.1` - Shared TypeScript types

#### Features

- Redis-like API (set, get, del, exists, ttl, keys, clear)
- TTL (Time To Live) support with automatic expiration
- Batch operations (mget, mset)
- Pattern-based key search using SQL LIKE
- Automatic cleanup of expired entries
- Connection pooling with pg
- NestJS module with forRoot and forRootAsync
- Full TypeScript support with strict types
- Comprehensive test coverage
- Production-ready with prepared statements

---

**Note**: This changelog is automatically generated using [Changesets](https://github.com/changesets/changesets).
