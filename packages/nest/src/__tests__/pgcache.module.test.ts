import { describe, it, expect, beforeEach } from "vitest";
import { Test, TestingModule } from "@nestjs/testing";
import { PgCacheModule } from "../pgcache.module.js";
import { PgCacheService } from "../pgcache.service.js";

const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL || "postgresql://localhost:5432/pgcache_test";

describe("PgCacheModule", () => {
  let service: PgCacheService;
  let module: TestingModule;

  describe("forRoot", () => {
    beforeEach(async () => {
      module = await Test.createTestingModule({
        imports: [
          PgCacheModule.forRoot({
            connectionString: TEST_DATABASE_URL,
            cleanupInterval: 0,
          }),
        ],
      }).compile();

      service = module.get<PgCacheService>(PgCacheService);
    });

    afterEach(async () => {
      await module.close();
    });

    it("should be defined", () => {
      expect(service).toBeDefined();
    });

    it("should set and get values", async () => {
      await service.set("test-key", "test-value");
      const value = await service.get<string>("test-key");
      expect(value).toBe("test-value");
    });

    it("should delete values", async () => {
      await service.set("delete-me", "value");
      const deleted = await service.del("delete-me");
      expect(deleted).toBe(true);

      const value = await service.get("delete-me");
      expect(value).toBeNull();
    });

    it("should check existence", async () => {
      await service.set("exists-test", "value");
      const exists = await service.exists("exists-test");
      expect(exists).toBe(true);

      const notExists = await service.exists("not-exists");
      expect(notExists).toBe(false);
    });

    it("should get stats", async () => {
      await service.clear();
      await service.set("stat-test", "value");

      const stats = await service.stats();
      expect(stats.totalEntries).toBeGreaterThan(0);
    });
  });

  describe("forRootAsync", () => {
    beforeEach(async () => {
      module = await Test.createTestingModule({
        imports: [
          PgCacheModule.forRootAsync({
            useFactory: () => ({
              connectionString: TEST_DATABASE_URL,
              cleanupInterval: 0,
            }),
          }),
        ],
      }).compile();

      service = module.get<PgCacheService>(PgCacheService);
    });

    afterEach(async () => {
      await module.close();
    });

    it("should be defined", () => {
      expect(service).toBeDefined();
    });

    it("should work with async configuration", async () => {
      await service.set("async-test", "async-value");
      const value = await service.get<string>("async-test");
      expect(value).toBe("async-value");
    });
  });
});
