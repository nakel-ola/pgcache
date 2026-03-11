# @pgcache/nest

## 0.0.2

### Patch Changes

- a9ba9a9: Make PgCacheModule global when using forRoot() or forRootAsync(). This allows feature modules to inject PgCacheService without needing to import PgCacheModule in every module, following NestJS conventions for root-level modules.
- a9ba9a9: Support NestJS v11 in peer dependencies. The package now works with both NestJS v10 and v11.
