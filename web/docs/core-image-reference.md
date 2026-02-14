# Core Image Reference

This reference defines how to build high-performance, minimal "core" images for Companion environments.

## Objectives

- Small default image footprint
- Fast cold start
- No unnecessary background services
- Ready for both CLIs:
  - `@anthropic-ai/claude-code`
  - `@openai/codex`
- Latest major runtime streams for Node and Python

## Baseline requirements

- Linux amd64 and arm64 support
- Non-root default user
- Workspace mounted at `/workspace`
- Includes:
  - Node.js (latest current stable)
  - Python 3 (from `python:3-slim` base)
  - `git`, `ssh`, `ca-certificates`, `curl`
- No compilers/toolchains by default

## Default Dockerfile

Path: `docker/core/Dockerfile`

Design choices:

- Base from `python:3-slim` to track latest Python 3
- Install latest Node binary directly from nodejs.org index
- Install Claude Code and Codex CLIs globally with npm
- Remove apt/npm caches to keep size down

## Port model

Core images should not hardcode published host ports.

Companion maps ports dynamically at runtime:

- requested container ports: `[3000, 5173, ...]`
- docker publish mode: `-p 0:<containerPort>`
- final mapping persisted in `.companion/cloud/environments/<sessionId>.json`

## Extension pattern

Use the core image as a parent for language/framework-specific variants.

Examples:

- `FROM ghcr.io/<org>/companion-core:latest` + pnpm
- `FROM ghcr.io/<org>/companion-core:latest` + uv
- `FROM ghcr.io/<org>/companion-core:latest` + Playwright deps

Keep these extras out of the default core image.
