---
title: "CI build failure from uncommitted shadcn/ui component files"
date: 2026-04-04
category: build-errors
module: ui-components
problem_type: build_error
component: frontend_stimulus
symptoms:
  - "TS2307: Cannot find module '@/components/ui/separator'"
  - "TS2307: Cannot find module '@/components/ui/tabs'"
  - "TS2307: Cannot find module '@/components/ui/skeleton'"
  - "CI lint-and-test and cypress jobs both fail on TypeScript compilation"
root_cause: incomplete_setup
resolution_type: code_fix
severity: medium
tags:
  - shadcn
  - build-error
  - untracked-files
  - ci-failure
  - typescript
  - nextjs
---

# CI build failure from uncommitted shadcn/ui component files

## Problem

PR #44 (feat/shadcn-earthy-design-system) failed both CI jobs because 4 shadcn/ui component files were generated locally but never committed to git. Pages importing these components compiled fine locally (files existed on disk) but failed in CI where only committed files are present.

## Symptoms

- CI `lint-and-test` job fails at `tsc --noEmit` / `next build` with multiple TS2307 errors
- CI `cypress` job fails with webpack build errors (same root cause)
- `git status` shows the component files as untracked:
  ```
  ?? src/components/ui/separator.tsx
  ?? src/components/ui/skeleton.tsx
  ?? src/components/ui/tabs.tsx
  ?? src/components/ui/tooltip.tsx
  ```
- Local dev server works fine (files exist on disk even though not tracked by git)

## What Didn't Work

No failed investigation attempts — the problem was diagnosed immediately from the CI error messages pointing to missing module paths, cross-referenced with `git status` showing the files as untracked.

## Solution

```bash
git add src/components/ui/separator.tsx \
        src/components/ui/skeleton.tsx \
        src/components/ui/tabs.tsx \
        src/components/ui/tooltip.tsx

git commit -m "fix: add missing shadcn UI component files"
```

Build and all 97 tests passed after committing.

## Why This Works

The shadcn/ui CLI (`npx shadcn@latest add <component>`) generates component source files directly into `src/components/ui/`. Unlike npm packages (resolved from `node_modules/` via `package.json`), these are **source files that must be committed**. The developer committed the page files that imported the components and the `package.json` changes for the underlying primitives, but missed the generated component files themselves. CI only has access to committed files, so the imports failed.

## Prevention

- **Check `git status` after running shadcn CLI commands.** The CLI generates files that won't be staged automatically. Make this part of the shadcn workflow: generate, review, stage, commit.
- **Run `npm run build` locally before pushing.** TypeScript compilation catches missing modules the same way CI does. A local build would have surfaced this before the push.
- **Look for untracked files in `src/components/ui/` specifically.** When a PR touches shadcn components, verify that any new component files are staged — they're easy to miss because the CLI creates them silently.

## Related Issues

- PR: dancj/meal-assistant#44
