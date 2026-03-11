---
"@pgcache/core": minor
"@pgcache/nest": minor
---

Add `delIfEquals` method for safe distributed lock releases. This method performs a compare-and-delete operation, only deleting a key if its value matches the expected value.

**Breaking Change in Best Practices:** The distributed lock examples have been updated to use the safer token-based pattern with `delIfEquals`. Using plain `del()` to release locks is now discouraged as it can lead to race conditions if the lock expires during processing.

**Safe Lock Pattern:**
```typescript
import { randomUUID } from "crypto";

const lockKey = "lock:resource:1";
const lockToken = randomUUID();

const acquired = await cache.setNX(lockKey, lockToken, { ttl: 30 });
if (acquired) {
  try {
    // Do work...
  } finally {
    await cache.delIfEquals(lockKey, lockToken);
  }
}
```

This prevents accidentally deleting a lock that was acquired by another process after your lock expired.
