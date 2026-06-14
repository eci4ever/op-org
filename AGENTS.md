# AGENTS.md

This file contains instructions for AI coding agents working in this repository.
Follow these rules before making changes.

## Project Overview

This is a TypeScript strict full-stack project using:

* TanStack Start
* TanStack Router
* TanStack Query
* TanStack Form
* TanStack Table
* Zod
* Drizzle ORM
* PostgreSQL
* Bun
* Resend
* shadcn/ui
* Biome
* Better Auth
* Project-specific agent skills in `.agents/`

Assume the codebase values correctness, simplicity, strong typing, readable code, and safe database/auth behavior.

## First Steps for Every Task

Before editing code:

1. Read the nearest relevant `AGENTS.md` file.
2. Inspect `package.json`, `tsconfig.json`, `biome.json`, `drizzle.config.*`, and route structure when relevant.
3. Check `.agents/` for task-specific skills or instructions.
4. Prefer existing project patterns over introducing new patterns.
5. Do not start a dev server unless the user explicitly asks.
6. Do not run long-running watch commands unless explicitly requested.
7. Do not modify generated files unless the task specifically requires it.
8. Do not add dependencies without a clear reason.

## Project Skills in `.agents/`

This repository may include local skills under `.agents/`.

When a task matches a skill:

1. Read the relevant skill instructions first.
2. Follow the skill workflow exactly unless it conflicts with this file or user instructions.
3. Prefer project-local skills over generic assumptions.
4. If multiple skills apply, use the most specific one.
5. If a skill asks for validation commands, run only the targeted commands needed.
6. If a skill is outdated or conflicts with current code, explain the conflict and follow the safer project pattern.

Do not invent skills. Only use skills that actually exist in `.agents/`.

## Commands

Use Bun by default.

Common commands:

```bash
bun install
bun run build
bun run typecheck
bun run check
bun run format
bun run lint
bun run test
```

Before submitting changes, prefer the smallest useful validation:

```bash
bun run typecheck
bun run check
```

If database schema changed, also run the project-specific Drizzle validation or migration generation command from `package.json`.

Never run these unless explicitly asked:

```bash
bun run dev
bun run start
bun --watch
bun run db:push
bun run db:reset
bun run db:drop
```

Database destructive commands require explicit user confirmation.

## Coding Principles

Write code in a simple, direct style.

Prefer:

* Clear names over clever abstractions
* Plain functions over unnecessary classes
* Explicit control flow over hidden magic
* Small modules with obvious boundaries
* Early returns over deeply nested branches
* Composition over inheritance
* Boring, predictable code over clever code
* Readable types over complex type gymnastics

Avoid:

* Premature abstractions
* Large generic helpers without clear reuse
* Over-engineered state machines
* Global mutable state
* Barrel files that hide dependency direction
* Unnecessary runtime dependencies
* `any`, unsafe casts, and suppressed TypeScript errors

Code should be easy to delete, easy to debug, and easy to review.
