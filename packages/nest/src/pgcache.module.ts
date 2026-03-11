import { DynamicModule, Module, Provider } from "@nestjs/common";
import type { PgCacheOptions } from "@pgcache/types";
import { PgCache } from "@pgcache/core";
import { PgCacheService } from "./pgcache.service.js";
import { PGCACHE_MODULE_OPTIONS, PGCACHE_INSTANCE } from "./pgcache.constants.js";

/**
 * Options for async module configuration
 */
export interface PgCacheModuleAsyncOptions {
  /**
   * Factory function that returns PgCacheOptions
   */
  useFactory: (...args: any[]) => Promise<PgCacheOptions> | PgCacheOptions;

  /**
   * Dependencies to inject into the factory function
   */
  inject?: any[];

  /**
   * Imports required for the factory function (e.g., ConfigModule)
   */
  imports?: any[];
}

/**
 * NestJS module for PgCache integration
 *
 * @example
 * ```typescript
 * // Synchronous configuration
 * @Module({
 *   imports: [
 *     PgCacheModule.forRoot({
 *       connectionString: process.env.DATABASE_URL
 *     })
 *   ]
 * })
 * export class AppModule {}
 *
 * // Async configuration
 * @Module({
 *   imports: [
 *     PgCacheModule.forRootAsync({
 *       imports: [ConfigModule],
 *       inject: [ConfigService],
 *       useFactory: (config: ConfigService) => ({
 *         connectionString: config.get('DATABASE_URL')
 *       })
 *     })
 *   ]
 * })
 * export class AppModule {}
 * ```
 */
@Module({})
export class PgCacheModule {
  /**
   * Configure the module with static options
   */
  static forRoot(options: PgCacheOptions): DynamicModule {
    const providers: Provider[] = [
      {
        provide: PGCACHE_MODULE_OPTIONS,
        useValue: options,
      },
      {
        provide: PGCACHE_INSTANCE,
        useFactory: (opts: PgCacheOptions) => {
          return new PgCache(opts);
        },
        inject: [PGCACHE_MODULE_OPTIONS],
      },
      PgCacheService,
    ];

    return {
      module: PgCacheModule,
      providers,
      exports: [PgCacheService, PGCACHE_INSTANCE],
      global: true,
    };
  }

  /**
   * Configure the module asynchronously (e.g., using ConfigService)
   */
  static forRootAsync(options: PgCacheModuleAsyncOptions): DynamicModule {
    const providers: Provider[] = [
      {
        provide: PGCACHE_MODULE_OPTIONS,
        useFactory: options.useFactory,
        inject: options.inject || [],
      },
      {
        provide: PGCACHE_INSTANCE,
        useFactory: (opts: PgCacheOptions) => {
          return new PgCache(opts);
        },
        inject: [PGCACHE_MODULE_OPTIONS],
      },
      PgCacheService,
    ];

    return {
      module: PgCacheModule,
      imports: options.imports || [],
      providers,
      exports: [PgCacheService, PGCACHE_INSTANCE],
      global: true,
    };
  }
}
