---
"@pgcache/nest": patch
---

Make PgCacheModule global when using forRoot() or forRootAsync(). This allows feature modules to inject PgCacheService without needing to import PgCacheModule in every module, following NestJS conventions for root-level modules.
