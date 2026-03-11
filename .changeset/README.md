# Changesets

This folder contains changeset files that track version changes and generate changelogs.

## How to add a changeset

When you make changes to the codebase that should be released, run:

```bash
pnpm changeset
```

This will prompt you to:
1. Select which packages have changed
2. Choose the type of change (major, minor, patch)
3. Write a summary of the changes

The changeset will be saved as a file in this directory.

## How releases work

1. When changesets are merged to the main branch, a PR is automatically created to version the packages
2. When the version PR is merged, packages are automatically published to npm

## Learn more

- [Changesets documentation](https://github.com/changesets/changesets)
