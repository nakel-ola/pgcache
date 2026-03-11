import { Controller, Get, Post } from "@nestjs/common";
import { PgCacheService } from "@pgcache/nest";

@Controller()
export class AppController {
  constructor(private readonly cacheService: PgCacheService) {}

  @Get()
  getWelcome() {
    return {
      message: "Welcome to PgCache NestJS Example",
      endpoints: {
        health: "GET /health",
        users: "GET /users",
        userById: "GET /users/:id",
        createUser: "POST /users",
        updateUser: "PUT /users/:id",
        deleteUser: "DELETE /users/:id",
        clearCache: "POST /cache/clear",
      },
    };
  }

  @Get("health")
  async getHealth() {
    const stats = await this.cacheService.stats();

    return {
      status: "ok",
      service: "pgcache-nest-example",
      cache: {
        totalEntries: stats.totalEntries,
        activeEntries: stats.activeEntries,
        expiredEntries: stats.expiredEntries,
        sizeMB: (stats.approximateSize / (1024 * 1024)).toFixed(2),
      },
    };
  }

  @Post("cache/clear")
  async clearCache() {
    await this.cacheService.clear();

    return {
      success: true,
      message: "All cache entries cleared",
    };
  }
}
