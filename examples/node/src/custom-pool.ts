import { Pool, type PoolConfig } from "pg";
import { PgCache } from "@pgcache/core";

/**
 * Custom Pool Example
 *
 * This example demonstrates how to use a custom PostgreSQL connection pool
 * with PgCache instead of letting PgCache create one for you.
 *
 * Benefits of using a custom pool:
 * - Share a pool across multiple parts of your application
 * - Fine-tune connection settings (timeouts, pool size, etc.)
 * - Monitor pool health and connection metrics
 * - Better control over pool lifecycle
 */

// Pool configuration
const poolConfig: PoolConfig = {
  connectionString:
    process.env.DATABASE_URL || "postgresql://localhost:5432/pgcache_dev",

  // Connection pool settings
  max: 20, // Maximum number of clients in the pool
  min: 5, // Minimum number of clients to keep in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 2000, // Fail if connection can't be established in 2s

  // Performance settings
  statement_timeout: 5000, // Cancel queries running longer than 5 seconds

  // Application name (visible in pg_stat_activity)
  application_name: "pgcache_custom_pool_example",
};

// Create the custom pool
console.log("Creating custom PostgreSQL connection pool...");
const pool = new Pool(poolConfig);

// Pool event handlers for monitoring
pool.on("connect", (_client) => {
  console.log("✅ New client connected to pool");
});

pool.on("acquire", (_client) => {
  console.log("🔄 Client acquired from pool");
});

pool.on("remove", (_client) => {
  console.log("❌ Client removed from pool");
});

pool.on("error", (err, _client) => {
  console.error("💥 Unexpected pool error:", err);
  // In production, you might want to send this to your error tracking service
});

// Create multiple PgCache instances sharing the same pool
const userCache = new PgCache({
  pool,
  table: "user_cache",
  cleanupInterval: 60000, // Cleanup every minute
});

const sessionCache = new PgCache({
  pool,
  table: "session_cache",
  cleanupInterval: 30000, // More frequent cleanup for sessions
});

const productCache = new PgCache({
  pool,
  table: "product_cache",
  cleanupInterval: 120000, // Less frequent cleanup for products
});

console.log("Created 3 cache instances sharing the same pool:");
console.log("  - userCache (table: user_cache)");
console.log("  - sessionCache (table: session_cache)");
console.log("  - productCache (table: product_cache)");

// Function to log pool statistics
function logPoolStats() {
  console.log("\n📊 Pool Statistics:");
  console.log(`  Total clients: ${pool.totalCount}`);
  console.log(`  Idle clients: ${pool.idleCount}`);
  console.log(`  Waiting requests: ${pool.waitingCount}`);
}

// Monitor pool health every 10 seconds
const monitorInterval = setInterval(logPoolStats, 10000);

// Example operations
async function runExamples() {
  try {
    console.log("\n🚀 Running example operations...\n");

    // Example 1: User cache
    console.log("1️⃣ Using userCache:");
    await userCache.set("user:1", { name: "Alice", email: "alice@example.com" }, { ttl: 300 });
    await userCache.set("user:2", { name: "Bob", email: "bob@example.com" }, { ttl: 300 });
    const user1 = await userCache.get("user:1");
    console.log("   Retrieved user:", user1);

    // Example 2: Session cache
    console.log("\n2️⃣ Using sessionCache:");
    await sessionCache.set("session:abc123", { userId: "user:1", expires: Date.now() + 3600000 }, { ttl: 3600 });
    const session = await sessionCache.get("session:abc123");
    console.log("   Retrieved session:", session);

    // Example 3: Product cache
    console.log("\n3️⃣ Using productCache:");
    await productCache.mset([
      { key: "product:1", value: { name: "Laptop", price: 999 }, ttl: 600 },
      { key: "product:2", value: { name: "Mouse", price: 29 }, ttl: 600 },
      { key: "product:3", value: { name: "Keyboard", price: 79 }, ttl: 600 },
    ]);
    const products = await productCache.mget(["product:1", "product:2", "product:3"]);
    console.log("   Retrieved products:", Array.from(products.entries()));

    // Example 4: Get statistics for each cache
    console.log("\n4️⃣ Cache Statistics:");
    const userStats = await userCache.stats();
    const sessionStats = await sessionCache.stats();
    const productStats = await productCache.stats();

    console.log("   User cache:", {
      total: userStats.totalEntries,
      active: userStats.activeEntries,
    });
    console.log("   Session cache:", {
      total: sessionStats.totalEntries,
      active: sessionStats.activeEntries,
    });
    console.log("   Product cache:", {
      total: productStats.totalEntries,
      active: productStats.activeEntries,
    });

    // Show pool stats after operations
    console.log("\n");
    logPoolStats();

    // Example 5: Direct pool access
    console.log("\n5️⃣ Direct pool access (getting PostgreSQL version):");
    const result = await pool.query("SELECT version()");
    console.log("   PostgreSQL:", result.rows[0]?.version?.split(" ")[1]);

    console.log("\n✅ All examples completed successfully!\n");
  } catch (error) {
    console.error("❌ Error running examples:", error);
    throw error;
  }
}

// Graceful shutdown handler
async function gracefulShutdown(signal: string) {
  console.log(`\n🛑 Received ${signal}, starting graceful shutdown...`);

  // Stop monitoring
  clearInterval(monitorInterval);

  try {
    // Close all cache instances (this stops cleanup intervals)
    console.log("Closing cache instances...");
    await Promise.all([
      userCache.close(),
      sessionCache.close(),
      productCache.close(),
    ]);

    // Log final pool stats
    logPoolStats();

    // Close the pool (this closes all connections)
    console.log("\nClosing connection pool...");
    await pool.end();

    console.log("✅ Graceful shutdown completed");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error during shutdown:", error);
    process.exit(1);
  }
}

// Register shutdown handlers
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// Run the examples
runExamples()
  .then(() => {
    console.log("Examples are running. Press Ctrl+C to exit.");
  })
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
