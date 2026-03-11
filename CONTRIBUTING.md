# Contributing to pgcache

Thank you for your interest in contributing to pgcache! This document provides guidelines and instructions for contributing.

## Code of Conduct

Please be respectful and constructive in all interactions. We're building a welcoming community.

## Getting Started

### Prerequisites

- Node.js 20 or higher
- PostgreSQL 12 or higher
- pnpm 9 or higher
- Git

### Development Setup

1. **Fork and clone the repository**

```bash
git clone https://github.com/yourusername/pgcache.git
cd pgcache
```

2. **Install dependencies**

```bash
pnpm install
```

3. **Set up PostgreSQL for testing**

```bash
# Create a test database
createdb pgcache_test

# Set the test database URL
export TEST_DATABASE_URL="postgresql://localhost:5432/pgcache_test"
```

4. **Build all packages**

```bash
pnpm build
```

5. **Run tests**

```bash
pnpm test
```

## Project Structure

```
pgcache/
├── packages/
│   ├── core/              # @pgcache/core - Main cache client
│   │   ├── src/           # Source code
│   │   ├── tests/         # Tests
│   │   └── package.json   # Package config
│   ├── nest/              # @pgcache/nest - NestJS integration
│   └── types/             # @pgcache/types - Shared types
├── examples/              # Example applications
├── .github/               # GitHub workflows
└── .changeset/            # Version management
```

## Development Workflow

### 1. Create a Branch

```bash
git checkout -b feature/my-new-feature
# or
git checkout -b fix/bug-description
```

Branch naming conventions:
- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation changes
- `refactor/` - Code refactoring
- `test/` - Test improvements

### 2. Make Your Changes

- Write clear, readable code
- Follow existing code style
- Add tests for new functionality
- Update documentation as needed

### 3. Code Quality

#### Linting

```bash
pnpm lint
```

#### Type Checking

```bash
pnpm typecheck
```

#### Formatting

```bash
pnpm format
```

### 4. Testing

#### Run All Tests

```bash
pnpm test
```

#### Run Tests for Specific Package

```bash
cd packages/core
pnpm test
```

#### Run Tests in Watch Mode

```bash
pnpm test:watch
```

#### Coverage

```bash
pnpm test:coverage
```

**Testing Guidelines:**
- Write tests for all new features
- Maintain or improve code coverage
- Test edge cases and error conditions
- Use descriptive test names

### 5. Commit Your Changes

We use conventional commits for clear history:

```bash
git commit -m "feat(core): add pattern matching to keys method"
git commit -m "fix(nest): resolve module initialization issue"
git commit -m "docs: update installation instructions"
```

**Commit format:**
```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Types:**
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation
- `refactor` - Code refactoring
- `test` - Tests
- `chore` - Maintenance

**Scopes:**
- `core` - @pgcache/core
- `nest` - @pgcache/nest
- `types` - @pgcache/types
- `examples` - Example applications

### 6. Create a Changeset

For changes that should be released, create a changeset:

```bash
pnpm changeset
```

This will prompt you to:
1. Select which packages changed
2. Choose the type of version bump (major, minor, patch)
3. Write a summary for the changelog

**When to create a changeset:**
- New features (minor version)
- Bug fixes (patch version)
- Breaking changes (major version)

**When NOT to create a changeset:**
- Documentation updates
- Test improvements
- Internal refactoring without API changes
- Example updates

### 7. Push and Create Pull Request

```bash
git push origin feature/my-new-feature
```

Then create a pull request on GitHub.

## Pull Request Guidelines

### PR Title

Use conventional commit format:
```
feat(core): add batch delete operation
fix(nest): resolve dependency injection issue
```

### PR Description

Include:
1. **What** - What changes were made
2. **Why** - Why these changes were needed
3. **How** - How the changes work (if complex)
4. **Testing** - How you tested the changes
5. **Breaking Changes** - Any breaking changes (if applicable)

**Template:**

```markdown
## Description
Brief description of the changes

## Motivation
Why these changes are needed

## Changes
- Change 1
- Change 2

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing completed

## Breaking Changes
None / List any breaking changes

## Checklist
- [ ] Code follows project style
- [ ] Tests pass locally
- [ ] Documentation updated
- [ ] Changeset created (if needed)
```

### Review Process

1. Automated checks must pass (CI, tests, linting)
2. At least one maintainer approval required
3. Address review feedback
4. Keep PR focused and reasonably sized

## Code Style

### TypeScript

- Use strict TypeScript mode
- Provide explicit types for public APIs
- Use JSDoc comments for public methods
- Avoid `any` type

**Example:**

```typescript
/**
 * Set a value in the cache with optional TTL
 *
 * @param key - The cache key
 * @param value - The value to cache
 * @param options - Options including TTL
 *
 * @example
 * ```typescript
 * await cache.set("user:1", { name: "Lekan" }, { ttl: 60 });
 * ```
 */
async set<T>(key: string, value: T, options?: PgCacheSetOptions): Promise<void> {
  // Implementation
}
```

### Naming Conventions

- **Files**: `kebab-case.ts`
- **Classes**: `PascalCase`
- **Functions/Methods**: `camelCase`
- **Constants**: `UPPER_SNAKE_CASE`
- **Interfaces/Types**: `PascalCase`

### Error Handling

- Use custom error classes from `@pgcache/types`
- Provide descriptive error messages
- Include relevant context in errors

```typescript
throw new PgCacheQueryError(
  "Failed to get cache entry",
  query,
  originalError
);
```

## Documentation

### Code Documentation

- Add JSDoc comments to all public APIs
- Include examples in JSDoc
- Document parameters and return types
- Explain complex logic with inline comments

### Package Documentation

When adding features, update:
- Package README
- Main project README (if applicable)
- Examples (if applicable)

## Testing Guidelines

### Test Organization

```typescript
describe("PgCache", () => {
  describe("set()", () => {
    it("should set a value", async () => {
      // Test implementation
    });

    it("should set a value with TTL", async () => {
      // Test implementation
    });

    it("should throw error for invalid key", async () => {
      // Test implementation
    });
  });
});
```

### Test Coverage

- Aim for 80%+ code coverage
- Test happy paths and error cases
- Test edge cases and boundary conditions
- Test async behavior and race conditions

### Database Tests

- Use a dedicated test database
- Clean up after each test
- Don't rely on test execution order
- Use transactions when appropriate

## Releasing

Releases are automated using Changesets and GitHub Actions:

1. Create changesets for your changes (`pnpm changeset`)
2. Merge PR to main/master branch
3. Changesets creates a "Version Packages" PR
4. Merge the version PR to trigger release

Maintainers handle the release process.

## Getting Help

- **Questions**: Open a GitHub Discussion
- **Bugs**: Open a GitHub Issue
- **Security**: Email maintainers directly

## Recognition

Contributors are recognized in:
- GitHub contributors page
- Release notes
- Special mentions for significant contributions

## Thank You!

Your contributions make pgcache better for everyone. We appreciate your time and effort! 🎉
