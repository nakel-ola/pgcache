# Setup Guide

This guide will help you get started with the pgcache monorepo.

## Prerequisites

Ensure you have the following installed:

- **Node.js**: v20 or higher ([Download](https://nodejs.org/))
- **pnpm**: v9 or higher (`npm install -g pnpm`)
- **PostgreSQL**: v12 or higher ([Download](https://www.postgresql.org/download/))

Verify installations:

```bash
node --version  # Should show v20.x.x or higher
pnpm --version  # Should show 9.x.x or higher
psql --version  # Should show PostgreSQL 12 or higher
```

## Quick Start

### 1. Install Dependencies

```bash
pnpm install
```

This will install all dependencies for all packages and examples.

### 2. Build All Packages

```bash
pnpm build
```

This builds:
- `@pgcache/types`
- `@pgcache/core`
- `@pgcache/nest`

### 3. Set Up PostgreSQL

Create a development and test database:

```bash
# Create development database
createdb pgcache_dev

# Create test database
createdb pgcache_test
```

Set environment variables:

```bash
export DATABASE_URL="postgresql://localhost:5432/pgcache_dev"
export TEST_DATABASE_URL="postgresql://localhost:5432/pgcache_test"
```

Or create a `.env` file in the root:

```env
DATABASE_URL=postgresql://localhost:5432/pgcache_dev
TEST_DATABASE_URL=postgresql://localhost:5432/pgcache_test
```

### 4. Run Tests

```bash
pnpm test
```

All tests should pass ✅

### 5. Try the Examples

#### Node.js Example

```bash
cd examples/node
export DATABASE_URL="postgresql://localhost:5432/pgcache_dev"
pnpm dev
```

Visit http://localhost:3000

#### NestJS Example

```bash
cd examples/nest
export DATABASE_URL="postgresql://localhost:5432/pgcache_dev"
pnpm dev
```

Visit http://localhost:3001

## Development

### Running Tests in Watch Mode

```bash
pnpm test:watch
```

### Linting

```bash
pnpm lint
```

### Type Checking

```bash
pnpm typecheck
```

### Formatting

```bash
pnpm format
```

## Project Structure

```
pgcache/
├── packages/
│   ├── core/       # Main cache client
│   ├── nest/       # NestJS integration
│   └── types/      # Shared types
├── examples/
│   ├── node/       # Node.js/Express example
│   └── nest/       # NestJS example
├── .github/        # CI/CD workflows
└── .changeset/     # Version management
```

## Package Scripts

Each package has these scripts:

- `pnpm build` - Build the package
- `pnpm dev` - Build in watch mode
- `pnpm test` - Run tests
- `pnpm test:watch` - Run tests in watch mode
- `pnpm typecheck` - Type check without building

## Troubleshooting

### Tests Fail with Database Connection Error

Make sure PostgreSQL is running and the test database exists:

```bash
psql -c "SELECT 1" -d pgcache_test
```

If not, create it:

```bash
createdb pgcache_test
```

### Build Fails with Type Errors

Make sure you've built the dependencies in order:

```bash
pnpm clean
pnpm install
pnpm build
```

### pnpm install Fails

Try clearing the cache:

```bash
pnpm store prune
pnpm install
```

## Next Steps

1. **Read the Documentation**
   - [Main README](./README.md)
   - [@pgcache/core README](./packages/core/README.md)
   - [@pgcache/nest README](./packages/nest/README.md)

2. **Explore Examples**
   - [Node.js Example](./examples/node/README.md)
   - [NestJS Example](./examples/nest/README.md)

3. **Start Contributing**
   - Read [CONTRIBUTING.md](./CONTRIBUTING.md)
   - Check [open issues](https://github.com/yourusername/pgcache/issues)

## Getting Help

- **Documentation**: Check package READMEs
- **Issues**: [GitHub Issues](https://github.com/yourusername/pgcache/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/pgcache/discussions)

Happy coding! 🚀
