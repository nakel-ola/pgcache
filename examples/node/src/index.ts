import express from "express";
import { PgCache } from "@pgcache/core";

const app = express();
app.use(express.json());

// Initialize PgCache
const cache = new PgCache({
  connectionString:
    process.env.DATABASE_URL || "postgresql://localhost:5432/pgcache_dev",
  cleanupInterval: 60000, // Cleanup every minute
});

console.log("Initializing cache...");
await cache.init();
console.log("Cache initialized successfully!");

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "pgcache-example" });
});

// Set a cache value
app.post("/cache/:key", async (req, res) => {
  try {
    const { key } = req.params;
    const { value, ttl } = req.body;

    await cache.set(key, value, ttl ? { ttl } : undefined);

    res.json({
      success: true,
      message: `Key "${key}" set successfully`,
      ttl: ttl || "none",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Get a cache value
app.get("/cache/:key", async (req, res) => {
  try {
    const { key } = req.params;
    const value = await cache.get(key);

    if (value === null) {
      res.status(404).json({
        success: false,
        message: `Key "${key}" not found or expired`,
      });
    } else {
      const ttl = await cache.ttl(key);
      res.json({
        success: true,
        key,
        value,
        ttl,
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Delete a cache value
app.delete("/cache/:key", async (req, res) => {
  try {
    const { key } = req.params;
    const deleted = await cache.del(key);

    res.json({
      success: true,
      deleted,
      message: deleted
        ? `Key "${key}" deleted successfully`
        : `Key "${key}" not found`,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Check if key exists
app.get("/cache/:key/exists", async (req, res) => {
  try {
    const { key } = req.params;
    const exists = await cache.exists(key);

    res.json({
      success: true,
      key,
      exists,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Get all keys matching pattern
app.get("/keys/:pattern", async (req, res) => {
  try {
    const { pattern } = req.params;
    const keys = await cache.keys(pattern);

    res.json({
      success: true,
      pattern,
      keys,
      count: keys.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Get cache statistics
app.get("/stats", async (req, res) => {
  try {
    const stats = await cache.stats();

    res.json({
      success: true,
      stats: {
        ...stats,
        approximateSizeMB: (stats.approximateSize / (1024 * 1024)).toFixed(2),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Clear all cache entries
app.delete("/cache", async (req, res) => {
  try {
    await cache.clear();

    res.json({
      success: true,
      message: "All cache entries cleared",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Manual cleanup of expired entries
app.post("/cleanup", async (req, res) => {
  try {
    const deleted = await cache.cleanup();

    res.json({
      success: true,
      deleted,
      message: `Cleaned up ${deleted} expired entries`,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Batch set
app.post("/batch/set", async (req, res) => {
  try {
    const { entries } = req.body;

    if (!Array.isArray(entries)) {
      res.status(400).json({
        success: false,
        error: "entries must be an array",
      });
      return;
    }

    await cache.mset(entries);

    res.json({
      success: true,
      message: `Set ${entries.length} entries`,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Batch get
app.post("/batch/get", async (req, res) => {
  try {
    const { keys } = req.body;

    if (!Array.isArray(keys)) {
      res.status(400).json({
        success: false,
        error: "keys must be an array",
      });
      return;
    }

    const values = await cache.mget(keys);

    res.json({
      success: true,
      values: Object.fromEntries(values),
      count: values.size,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`
🚀 PgCache Example Server Running!

Server: http://localhost:${PORT}

Available Endpoints:
  GET    /health                  - Health check
  GET    /stats                   - Cache statistics
  POST   /cache/:key              - Set cache value (body: { value, ttl? })
  GET    /cache/:key              - Get cache value
  DELETE /cache/:key              - Delete cache value
  GET    /cache/:key/exists       - Check if key exists
  GET    /keys/:pattern           - Get keys matching pattern
  DELETE /cache                   - Clear all cache
  POST   /cleanup                 - Manual cleanup
  POST   /batch/set               - Batch set (body: { entries })
  POST   /batch/get               - Batch get (body: { keys })

Example Usage:
  curl -X POST http://localhost:${PORT}/cache/user:1 \\
    -H "Content-Type: application/json" \\
    -d '{"value": {"name": "Lekan"}, "ttl": 60}'

  curl http://localhost:${PORT}/cache/user:1

  curl http://localhost:${PORT}/stats
  `);
});

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("SIGTERM received, closing cache connection...");
  await cache.close();
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("SIGINT received, closing cache connection...");
  await cache.close();
  process.exit(0);
});
