import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { Pool } from "pg";
import { PgCache } from "../pgcache.js";
import { PgCacheConfigError } from "@pgcache/types";

// Test database connection
const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL || "postgresql://localhost:5432/pgcache_test";

describe("PgCache", () => {
  let cache: PgCache;
  let pool: Pool;

  beforeAll(async () => {
    pool = new Pool({ connectionString: TEST_DATABASE_URL });
    // Clean up test table if it exists
    await pool.query("DROP TABLE IF EXISTS pgcache");
  });

  afterAll(async () => {
    await pool.end();
  });

  beforeEach(async () => {
    // Create fresh cache instance
    cache = new PgCache({
      pool,
      cleanupInterval: 0, // Disable auto cleanup for tests
    });
    await cache.init();

    // Clear all data before each test
    await cache.clear();
  });

  describe("Configuration", () => {
    it("should throw error when neither connectionString nor pool is provided", () => {
      expect(() => {
        new PgCache({} as any);
      }).toThrow(PgCacheConfigError);
    });

    it("should accept connectionString", () => {
      const instance = new PgCache({
        connectionString: TEST_DATABASE_URL,
        autoInit: false,
      });
      expect(instance).toBeInstanceOf(PgCache);
    });

    it("should accept pool", () => {
      const instance = new PgCache({ pool, autoInit: false });
      expect(instance).toBeInstanceOf(PgCache);
    });

    it("should use custom table name", async () => {
      const customCache = new PgCache({
        pool,
        table: "custom_cache_table",
      });
      await customCache.init();

      // Check if table was created
      const result = await pool.query(
        "SELECT EXISTS (SELECT FROM pg_tables WHERE tablename = 'custom_cache_table')"
      );
      expect(result.rows[0]?.exists).toBe(true);

      // Cleanup
      await pool.query("DROP TABLE IF EXISTS custom_cache_table");
    });
  });

  describe("set() and get()", () => {
    it("should set and get a string value", async () => {
      await cache.set("test-key", "test-value");
      const value = await cache.get<string>("test-key");
      expect(value).toBe("test-value");
    });

    it("should set and get an object value", async () => {
      const obj = { name: "Lekan", age: 30, active: true };
      await cache.set("user:1", obj);
      const value = await cache.get<typeof obj>("user:1");
      expect(value).toEqual(obj);
    });

    it("should set and get an array value", async () => {
      const arr = [1, 2, 3, 4, 5];
      await cache.set("numbers", arr);
      const value = await cache.get<number[]>("numbers");
      expect(value).toEqual(arr);
    });

    it("should return null for non-existent key", async () => {
      const value = await cache.get("non-existent");
      expect(value).toBeNull();
    });

    it("should overwrite existing key", async () => {
      await cache.set("key", "value1");
      await cache.set("key", "value2");
      const value = await cache.get("key");
      expect(value).toBe("value2");
    });

    it("should handle null and undefined values", async () => {
      await cache.set("null-key", null);
      await cache.set("undefined-key", undefined);

      const nullValue = await cache.get("null-key");
      const undefinedValue = await cache.get("undefined-key");

      expect(nullValue).toBeNull();
      expect(undefinedValue).toBeUndefined();
    });
  });

  describe("TTL (Time To Live)", () => {
    it("should set value with TTL", async () => {
      await cache.set("ttl-key", "value", { ttl: 2 });
      const value = await cache.get("ttl-key");
      expect(value).toBe("value");
    });

    it("should return null for expired key", async () => {
      await cache.set("expired-key", "value", { ttl: 1 });

      // Wait for expiration
      await new Promise((resolve) => setTimeout(resolve, 1100));

      const value = await cache.get("expired-key");
      expect(value).toBeNull();
    });

    it("should get correct TTL for key", async () => {
      await cache.set("ttl-test", "value", { ttl: 10 });
      const ttl = await cache.ttl("ttl-test");

      expect(ttl).toBeGreaterThan(8);
      expect(ttl).toBeLessThanOrEqual(10);
    });

    it("should return -1 for non-expiring key", async () => {
      await cache.set("no-ttl", "value");
      const ttl = await cache.ttl("no-ttl");
      expect(ttl).toBe(-1);
    });

    it("should return -2 for non-existent key", async () => {
      const ttl = await cache.ttl("non-existent");
      expect(ttl).toBe(-2);
    });
  });

  describe("del()", () => {
    it("should delete existing key", async () => {
      await cache.set("delete-me", "value");
      const deleted = await cache.del("delete-me");
      expect(deleted).toBe(true);

      const value = await cache.get("delete-me");
      expect(value).toBeNull();
    });

    it("should return false when deleting non-existent key", async () => {
      const deleted = await cache.del("non-existent");
      expect(deleted).toBe(false);
    });
  });

  describe("exists()", () => {
    it("should return true for existing key", async () => {
      await cache.set("exists-key", "value");
      const exists = await cache.exists("exists-key");
      expect(exists).toBe(true);
    });

    it("should return false for non-existent key", async () => {
      const exists = await cache.exists("non-existent");
      expect(exists).toBe(false);
    });

    it("should return false for expired key", async () => {
      await cache.set("expired", "value", { ttl: 1 });
      await new Promise((resolve) => setTimeout(resolve, 1100));

      const exists = await cache.exists("expired");
      expect(exists).toBe(false);
    });
  });

  describe("clear()", () => {
    it("should clear all entries", async () => {
      await cache.set("key1", "value1");
      await cache.set("key2", "value2");
      await cache.set("key3", "value3");

      await cache.clear();

      const value1 = await cache.get("key1");
      const value2 = await cache.get("key2");
      const value3 = await cache.get("key3");

      expect(value1).toBeNull();
      expect(value2).toBeNull();
      expect(value3).toBeNull();
    });
  });

  describe("keys()", () => {
    beforeEach(async () => {
      await cache.set("user:1", { name: "User 1" });
      await cache.set("user:2", { name: "User 2" });
      await cache.set("post:1", { title: "Post 1" });
      await cache.set("post:2", { title: "Post 2" });
    });

    it("should get keys matching pattern", async () => {
      const userKeys = await cache.keys("user:%");
      expect(userKeys).toHaveLength(2);
      expect(userKeys).toContain("user:1");
      expect(userKeys).toContain("user:2");
    });

    it("should handle wildcard patterns", async () => {
      const allKeys = await cache.keys("%");
      expect(allKeys).toHaveLength(4);
    });

    it("should return empty array when no matches", async () => {
      const keys = await cache.keys("nothing:%");
      expect(keys).toHaveLength(0);
    });

    it("should support case-insensitive matching", async () => {
      await cache.set("CamelCase", "value");
      const keys = await cache.keys("camelcase", true);
      expect(keys).toContain("CamelCase");
    });
  });

  describe("mget() - Multiple Get", () => {
    beforeEach(async () => {
      await cache.set("key1", "value1");
      await cache.set("key2", "value2");
      await cache.set("key3", "value3");
    });

    it("should get multiple values", async () => {
      const values = await cache.mget<string>(["key1", "key2", "key3"]);

      expect(values.size).toBe(3);
      expect(values.get("key1")).toBe("value1");
      expect(values.get("key2")).toBe("value2");
      expect(values.get("key3")).toBe("value3");
    });

    it("should omit non-existent keys", async () => {
      const values = await cache.mget<string>([
        "key1",
        "non-existent",
        "key2",
      ]);

      expect(values.size).toBe(2);
      expect(values.has("key1")).toBe(true);
      expect(values.has("key2")).toBe(true);
      expect(values.has("non-existent")).toBe(false);
    });

    it("should return empty map for empty array", async () => {
      const values = await cache.mget([]);
      expect(values.size).toBe(0);
    });
  });

  describe("mset() - Multiple Set", () => {
    it("should set multiple entries", async () => {
      await cache.mset([
        { key: "batch1", value: "value1" },
        { key: "batch2", value: "value2" },
        { key: "batch3", value: "value3" },
      ]);

      const value1 = await cache.get("batch1");
      const value2 = await cache.get("batch2");
      const value3 = await cache.get("batch3");

      expect(value1).toBe("value1");
      expect(value2).toBe("value2");
      expect(value3).toBe("value3");
    });

    it("should set entries with different TTLs", async () => {
      await cache.mset([
        { key: "ttl1", value: "value1", ttl: 60 },
        { key: "ttl2", value: "value2" }, // No TTL
      ]);

      const ttl1 = await cache.ttl("ttl1");
      const ttl2 = await cache.ttl("ttl2");

      expect(ttl1).toBeGreaterThan(0);
      expect(ttl2).toBe(-1);
    });

    it("should handle empty array", async () => {
      await expect(cache.mset([])).resolves.toBeUndefined();
    });
  });

  describe("cleanup()", () => {
    it("should remove expired entries", async () => {
      await cache.set("expired1", "value1", { ttl: 1 });
      await cache.set("expired2", "value2", { ttl: 1 });
      await cache.set("valid", "value3");

      // Wait for expiration
      await new Promise((resolve) => setTimeout(resolve, 1100));

      const deleted = await cache.cleanup();
      expect(deleted).toBe(2);

      const validValue = await cache.get("valid");
      expect(validValue).toBe("value3");
    });

    it("should return 0 when no expired entries", async () => {
      await cache.set("key1", "value1");
      await cache.set("key2", "value2");

      const deleted = await cache.cleanup();
      expect(deleted).toBe(0);
    });
  });

  describe("stats()", () => {
    it("should return cache statistics", async () => {
      await cache.set("key1", "value1");
      await cache.set("key2", "value2", { ttl: 1 });

      // Wait for one to expire
      await new Promise((resolve) => setTimeout(resolve, 1100));

      const stats = await cache.stats();

      expect(stats.totalEntries).toBe(2);
      expect(stats.expiredEntries).toBe(1);
      expect(stats.activeEntries).toBe(1);
      expect(stats.approximateSize).toBeGreaterThan(0);
    });

    it("should return zeros for empty cache", async () => {
      const stats = await cache.stats();

      expect(stats.totalEntries).toBe(0);
      expect(stats.expiredEntries).toBe(0);
      expect(stats.activeEntries).toBe(0);
    });
  });

  describe("close()", () => {
    it("should close the cache gracefully", async () => {
      const tempCache = new PgCache({
        connectionString: TEST_DATABASE_URL,
        cleanupInterval: 100,
      });

      await tempCache.close();

      // Should not throw
      expect(true).toBe(true);
    });
  });
});
