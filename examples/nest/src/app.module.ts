import { Module } from "@nestjs/common";
import { PgCacheModule } from "@pgcache/nest";
import { AppController } from "./app.controller.js";
import { UsersModule } from "./users/users.module.js";

@Module({
  imports: [
    // Initialize PgCache
    PgCacheModule.forRoot({
      connectionString:
        process.env.DATABASE_URL || "postgresql://localhost:5432/pgcache_dev",
      cleanupInterval: 60000, // Cleanup every minute
      table: "app_cache",
    }),

    // Feature modules
    UsersModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
