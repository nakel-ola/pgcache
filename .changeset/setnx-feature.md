---
"@pgcache/core": minor
"@pgcache/nest": minor
---

Add setNX method for atomic set-if-not-exists operations. This Redis-style command is useful for distributed locks and preventing race conditions. Returns true if the key was set, false if it already exists. Expired keys are treated as non-existent.
