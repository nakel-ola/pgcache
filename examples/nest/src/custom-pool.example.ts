/**
 * Custom Pool Example for NestJS
 *
 * This file demonstrates how to use a custom PostgreSQL connection pool
 * with PgCacheModule in a NestJS application.
 *
 * Key concepts covered:
 * - Creating a custom pool provider
 * - Using the pool with PgCacheModule.forRootAsync
 * - Injecting and monitoring the pool
 * - Sharing the pool across multiple modules
 * - Graceful shutdown and lifecycle management
 */

import { Module, Injectable, OnModuleInit } from "@nestjs/common";
import { Pool, type PoolConfig } from "pg";
import { PgCacheModule } from "@pgcache/nest";

/**
 * Custom Pool Provider Token
 * Used for dependency injection
 */
export const CUSTOM_PG_POOL = Symbol("CUSTOM_PG_POOL");

/**
 * Pool Provider Factory
 * Creates and configures the PostgreSQL connection pool
 */
export const customPoolProvider = {
  provide: CUSTOM_PG_POOL,
  useFactory: () => {
    const poolConfig: PoolConfig = {
      connectionString:
        process.env.DATABASE_URL || "postgresql://localhost:5432/pgcache_dev",

      // Connection pool settings
      max: 20, // Maximum pool size
      min: 5, // Minimum pool size
      idleTimeoutMillis: 30000, // Close idle clients after 30s
      connectionTimeoutMillis: 2000, // Connection timeout

      // Performance settings
      statement_timeout: 5000, // Query timeout

      // Application name (visible in pg_stat_activity)
      application_name: "pgcache_nest_custom_pool",
    };

    const pool = new Pool(poolConfig);

    // Pool event handlers
    pool.on("connect", () => {
      console.log("✅ New client connected to custom pool");
    });

    pool.on("error", (err) => {
      console.error("💥 Unexpected pool error:", err);
    });

    console.log("📦 Custom PostgreSQL pool created");

    return pool;
  },
};

/**
 * Pool Monitor Service
 * Monitors pool health and provides statistics
 */
@Injectable()
export class PoolMonitorService implements OnModuleInit {
  private monitorInterval?: NodeJS.Timeout;

  constructor(@Inject(CUSTOM_PG_POOL) private readonly pool: Pool) {}

  onModuleInit() {
    console.log("🔍 Starting pool monitoring...");

    // Monitor pool stats every 10 seconds
    this.monitorInterval = setInterval(() => {
      this.logPoolStats();
    }, 10000);

    // Don't keep the process alive just for monitoring
    if (this.monitorInterval.unref) {
      this.monitorInterval.unref();
    }
  }

  onModuleDestroy() {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
    }
  }

  /**
   * Get current pool statistics
   */
  getStats() {
    return {
      totalCount: this.pool.totalCount,
      idleCount: this.pool.idleCount,
      waitingCount: this.pool.waitingCount,
    };
  }

  /**
   * Log pool statistics
   */
  private logPoolStats() {
    const stats = this.getStats();
    console.log("📊 Pool Stats:", {
      total: stats.totalCount,
      idle: stats.idleCount,
      waiting: stats.waitingCount,
    });
  }

  /**
   * Execute a custom query on the pool
   */
  async query<T = any>(text: string, params?: any[]): Promise<T[]> {
    const result = await this.pool.query(text, params);
    return result.rows;
  }
}

/**
 * Example 1: Basic Custom Pool Module
 * Uses a pre-configured custom pool
 */
@Module({
  imports: [
    PgCacheModule.forRootAsync({
      useFactory: (pool: Pool) => ({
        pool, // Use the custom pool
        cleanupInterval: 60000,
        table: "app_cache",
      }),
      inject: [CUSTOM_PG_POOL],
    }),
  ],
  providers: [customPoolProvider, PoolMonitorService],
  exports: [CUSTOM_PG_POOL, PoolMonitorService],
})
export class CustomPoolCacheModule {}

/**
 * Example 2: Multiple Cache Instances with Shared Pool
 * Demonstrates sharing a single pool across multiple cache tables
 */
@Module({
  providers: [
    customPoolProvider,
    PoolMonitorService,
    // User cache
    {
      provide: "USER_CACHE",
      useFactory: (pool: Pool) => {
        const { PgCache } = require("@pgcache/core");
        return new PgCache({
          pool,
          table: "user_cache",
          cleanupInterval: 60000,
        });
      },
      inject: [CUSTOM_PG_POOL],
    },
    // Session cache
    {
      provide: "SESSION_CACHE",
      useFactory: (pool: Pool) => {
        const { PgCache } = require("@pgcache/core");
        return new PgCache({
          pool,
          table: "session_cache",
          cleanupInterval: 30000,
        });
      },
      inject: [CUSTOM_PG_POOL],
    },
    // Product cache
    {
      provide: "PRODUCT_CACHE",
      useFactory: (pool: Pool) => {
        const { PgCache } = require("@pgcache/core");
        return new PgCache({
          pool,
          table: "product_cache",
          cleanupInterval: 120000,
        });
      },
      inject: [CUSTOM_PG_POOL],
    },
  ],
  exports: [
    "USER_CACHE",
    "SESSION_CACHE",
    "PRODUCT_CACHE",
    CUSTOM_PG_POOL,
    PoolMonitorService,
  ],
})
export class MultiCacheModule {}

/**
 * Example Service Using Custom Pool
 * Demonstrates how to use the custom pool in a service
 */
@Injectable()
export class ExampleService {
  constructor(
    @Inject(CUSTOM_PG_POOL) private readonly pool: Pool,
    private readonly poolMonitor: PoolMonitorService
  ) {}

  /**
   * Get pool statistics
   */
  async getPoolStats() {
    return this.poolMonitor.getStats();
  }

  /**
   * Execute a custom database query
   */
  async executeCustomQuery() {
    const result = await this.poolMonitor.query("SELECT version()");
    return result[0];
  }

  /**
   * Health check that includes pool status
   */
  async healthCheck() {
    try {
      await this.pool.query("SELECT 1");
      return {
        status: "healthy",
        pool: this.poolMonitor.getStats(),
      };
    } catch (error) {
      return {
        status: "unhealthy",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
}

/**
 * Example 3: Using ConfigService with Custom Pool
 * Demonstrates dynamic pool configuration based on environment
 */
import { ConfigService } from "@nestjs/config";
import { Inject } from "@nestjs/common";

export const configBasedPoolProvider = {
  provide: CUSTOM_PG_POOL,
  useFactory: (configService: ConfigService) => {
    const isDevelopment = configService.get("NODE_ENV") === "development";

    const poolConfig: PoolConfig = {
      connectionString: configService.get<string>("DATABASE_URL"),

      // Different pool sizes based on environment
      max: isDevelopment ? 10 : 20,
      min: isDevelopment ? 2 : 5,

      idleTimeoutMillis: configService.get<number>("DB_IDLE_TIMEOUT", 30000),
      connectionTimeoutMillis: configService.get<number>(
        "DB_CONNECTION_TIMEOUT",
        2000
      ),

      // SSL in production
      ssl: isDevelopment
        ? false
        : {
            rejectUnauthorized: false,
          },

      application_name: configService.get<string>(
        "APP_NAME",
        "pgcache_nest_app"
      ),
    };

    const pool = new Pool(poolConfig);

    pool.on("error", (err) => {
      console.error("Pool error:", err);
    });

    return pool;
  },
  inject: [ConfigService],
};

/**
 * Example App Module using Custom Pool with ConfigService
 */
import { ConfigModule } from "@nestjs/config";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PgCacheModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService, pool: Pool) => ({
        pool,
        cleanupInterval: configService.get<number>("CACHE_CLEANUP_INTERVAL", 60000),
        table: configService.get<string>("CACHE_TABLE", "app_cache"),
      }),
      inject: [ConfigService, CUSTOM_PG_POOL],
    }),
  ],
  providers: [configBasedPoolProvider, PoolMonitorService, ExampleService],
  exports: [CUSTOM_PG_POOL, PoolMonitorService, ExampleService],
})
export class ConfigBasedCacheModule {}

/**
 * Usage Example in a Controller
 */
import { Controller, Get } from "@nestjs/common";

@Controller("pool")
export class PoolController {
  constructor(
    private readonly exampleService: ExampleService,
    private readonly poolMonitor: PoolMonitorService
  ) {}

  @Get("stats")
  async getStats() {
    return this.poolMonitor.getStats();
  }

  @Get("health")
  async health() {
    return this.exampleService.healthCheck();
  }

  @Get("version")
  async getVersion() {
    return this.exampleService.executeCustomQuery();
  }
}

/**
 * Complete App Module Example
 */
@Module({
  imports: [CustomPoolCacheModule],
  controllers: [PoolController],
  providers: [ExampleService],
})
export class AppModuleWithCustomPool {}

/**
 * IMPORTANT NOTES:
 *
 * 1. Pool Lifecycle:
 *    - When using a custom pool, YOU are responsible for closing it
 *    - PgCacheModule.close() will NOT close your custom pool
 *    - Implement onModuleDestroy to close the pool on app shutdown
 *
 * 2. Pool Sharing:
 *    - One pool can be shared across multiple PgCache instances
 *    - This is more efficient than creating multiple pools
 *    - Make sure your pool size (max) can handle all instances
 *
 * 3. Monitoring:
 *    - Always monitor pool health in production
 *    - Use pool events to track connection lifecycle
 *    - Log pool stats to catch connection leaks
 *
 * 4. Error Handling:
 *    - Always handle pool errors
 *    - Set up proper error logging/alerting
 *    - Consider implementing circuit breakers for resilience
 */
