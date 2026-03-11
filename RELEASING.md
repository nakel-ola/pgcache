# Release Guide for Maintainers

This guide provides detailed instructions for maintainers on how to release pgcache packages to npm.

## Table of Contents

- [Overview](#overview)
- [Initial Setup](#initial-setup)
- [Release Process](#release-process)
- [Manual Publishing](#manual-publishing)
- [Troubleshooting](#troubleshooting)
- [Security Best Practices](#security-best-practices)

## Overview

pgcache uses an automated release workflow powered by:
- **Changesets**: Version management and changelog generation
- **GitHub Actions**: Automated building, testing, and publishing
- **npm**: Package registry

The release process is triggered automatically when a "Version Packages" PR is merged to the main branch.

## Initial Setup

Before packages can be published automatically, you need to configure npm authentication.

### Prerequisites

- npm account with publishing rights to `@pgcache/*` packages
- Admin access to the GitHub repository
- 2FA enabled on your npm account (recommended)

### Step 1: Create npm Access Token

#### Option A: Granular Access Token (Recommended)

Granular tokens provide fine-grained control and better security.

1. **Log in to npm**
   - Go to https://www.npmjs.com
   - Sign in to your account

2. **Navigate to Access Tokens**
   - Click your avatar (top right)
   - Select **Access Tokens**
   - Or go directly to: https://www.npmjs.com/settings/YOUR_USERNAME/tokens

3. **Generate New Token**
   - Click **Generate New Token**
   - Select **Granular Access Token**

4. **Configure Token Settings**
   ```
   Token Name: pgcache-github-actions
   Expiration: 90 days (or custom based on security policy)

   Packages and scopes:
     ✓ Read and write

   Packages:
     - @pgcache/core
     - @pgcache/nest
     - @pgcache/types

   IP Ranges: (optional, GitHub Actions IPs if you want to restrict)
   ```

5. **Generate and Copy Token**
   - Click **Generate Token**
   - **CRITICAL**: Copy the token immediately
   - Store it securely (you won't see it again!)

#### Option B: Classic Token (Legacy)

Classic tokens are simpler but less secure:

1. Go to https://www.npmjs.com/settings/YOUR_USERNAME/tokens
2. Click **Generate New Token → Classic Token**
3. Select **Automation** type
4. Copy the token

### Step 2: Add Token to GitHub

1. **Go to Repository Settings**
   - Navigate to: https://github.com/YOUR_ORG/pgcache
   - Click **Settings** tab

2. **Add Secret**
   - Go to **Secrets and variables → Actions**
   - Click **New repository secret**

3. **Configure Secret**
   ```
   Name: NPM_TOKEN
   Secret: (paste your npm token here)
   ```

   **IMPORTANT**: The name MUST be exactly `NPM_TOKEN`

4. **Save**
   - Click **Add secret**

### Step 3: Verify Configuration

The release workflow (`.github/workflows/release.yml`) is already configured to use the token:

```yaml
env:
  NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
  NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

No workflow changes are needed!

## Release Process

### Standard Release (Automated)

1. **Contributors Create Changesets**
   ```bash
   pnpm changeset
   ```
   - Select which packages changed
   - Choose version bump type (major/minor/patch)
   - Write changelog entry

2. **Merge PRs to Main**
   - Contributors' PRs are merged with their changesets

3. **Version Packages PR Created**
   - Changesets bot automatically creates a "Version Packages" PR
   - This PR updates:
     - Package versions in `package.json`
     - CHANGELOG.md files
     - Removes consumed changeset files

4. **Review Version PR**
   - Check that versions are correct
   - Review changelog entries
   - Ensure all desired changes are included

5. **Merge Version PR**
   - Merging triggers the release workflow
   - Workflow automatically:
     - Builds all packages
     - Runs tests
     - Publishes to npm
     - Creates GitHub releases

6. **Verify Release**
   - Check npm: https://www.npmjs.com/package/@pgcache/core
   - Check GitHub releases
   - Test installation: `npm install @pgcache/core@latest`

### Creating a Pre-release

For testing before official release:

1. **Create Pre-release Changeset**
   ```bash
   pnpm changeset --snapshot next
   ```

2. **Publish Snapshot**
   ```bash
   pnpm changeset version --snapshot next
   pnpm build
   pnpm changeset publish --tag next
   ```

3. **Install Pre-release**
   ```bash
   npm install @pgcache/core@next
   ```

## Manual Publishing

If the automated workflow fails or for the first publish:

### First-Time Package Publish

1. **Ensure You're Logged In**
   ```bash
   npm login
   ```

2. **Build Packages**
   ```bash
   pnpm build
   ```

3. **Publish Each Package**
   ```bash
   # Publish types first (dependency of others)
   cd packages/types
   npm publish --access public

   # Publish core
   cd ../core
   npm publish --access public

   # Publish nest
   cd ../nest
   npm publish --access public
   ```

4. **Verify Publication**
   ```bash
   npm info @pgcache/core
   npm info @pgcache/nest
   npm info @pgcache/types
   ```

### Emergency Manual Publish

If automation is broken and you need to publish urgently:

1. **Update Versions Manually**
   - Edit `package.json` in each package
   - Update CHANGELOG.md files

2. **Build and Test**
   ```bash
   pnpm build
   pnpm test
   pnpm typecheck
   pnpm lint
   ```

3. **Publish with Changeset**
   ```bash
   pnpm changeset publish
   ```

4. **Create Git Tags**
   ```bash
   git tag @pgcache/core@1.0.0
   git tag @pgcache/nest@1.0.0
   git tag @pgcache/types@1.0.0
   git push --tags
   ```

## Troubleshooting

### Error: ENEEDAUTH

**Symptom**: Release fails with "This command requires you to be logged in"

**Causes**:
- NPM_TOKEN secret not set in GitHub
- Token expired
- Token has insufficient permissions

**Solutions**:
1. Verify secret exists: GitHub → Settings → Secrets → Actions
2. Check token expiration on npm
3. Generate new token with correct permissions
4. Update GitHub secret with new token

### Error: E403 Forbidden

**Symptom**: "You do not have permission to publish"

**Causes**:
- Token lacks publish permission
- Not a member of @pgcache organization
- Package already published with same version

**Solutions**:
1. Ensure token has "Read and write" permission
2. Check npm org membership
3. Verify version number is incremented

### Error: E404 Package Not Found

**Symptom**: "Package @pgcache/core not found"

**Causes**:
- First publish of package
- Package name typo
- Registry sync issues

**Solutions**:
1. For first publish, do manual publish (see above)
2. Check package name in package.json
3. Wait a few minutes for registry sync

### Workflow Fails on Build

**Symptom**: Build or test step fails in CI

**Solutions**:
1. Test locally first: `pnpm build && pnpm test`
2. Check for environment-specific issues
3. Review CI logs for specific errors
4. Fix issues and push fix commit

### Version PR Not Created

**Symptom**: No "Version Packages" PR after merging changesets

**Causes**:
- No changesets in .changeset folder
- Changesets bot not installed
- Branch protection rules blocking bot

**Solutions**:
1. Verify changeset files exist in `.changeset/`
2. Check GitHub App installation
3. Review branch protection settings

## Security Best Practices

### Token Management

1. **Use Granular Tokens**
   - Limit scope to specific packages
   - Set reasonable expiration (90 days)
   - Use "Automation" type for CI/CD

2. **Rotate Tokens Regularly**
   - Set calendar reminders before expiration
   - Generate new token before old one expires
   - Update GitHub secret promptly

3. **Limit Access**
   - Only repository admins should have access to secrets
   - Use GitHub environment protection rules
   - Enable 2FA on npm account

### Monitoring

1. **Watch Release Activity**
   - Monitor GitHub Actions runs
   - Check npm download stats
   - Review GitHub security alerts

2. **Audit Trail**
   - Review npm publish history
   - Check GitHub Actions logs
   - Monitor package access logs

### Incident Response

If a token is compromised:

1. **Immediately Revoke Token**
   - Go to npm → Access Tokens
   - Revoke the compromised token

2. **Generate New Token**
   - Create new token with different name
   - Update GitHub secret

3. **Audit Recent Activity**
   - Check recent npm publishes
   - Review package versions on npm
   - Unpublish malicious versions if needed:
     ```bash
     npm unpublish @pgcache/core@BAD_VERSION
     ```

4. **Notify Users**
   - Create GitHub security advisory
   - Post on npm package page
   - Update README with security notice

## Additional Resources

- [Changesets Documentation](https://github.com/changesets/changesets)
- [npm Token Documentation](https://docs.npmjs.com/about-access-tokens)
- [GitHub Actions Secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [Semantic Versioning](https://semver.org/)

## Support

For questions about releasing:
- Open a GitHub Discussion
- Contact repository maintainers
- Check GitHub Actions logs for errors

---

**Last Updated**: 2026-03-11
**Maintained by**: pgcache maintainers
