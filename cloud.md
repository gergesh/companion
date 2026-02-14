# Cloud Environments (Phase 1)

This document defines the first implementation step for isolated development environments in The Companion.

## Goals

- Launch fully isolated Docker environments per Companion session.
- Expose selected container ports and map each to a random host port.
- Persist an environment manifest file so Companion has machine-readable state.
- Keep the default image minimal while supporting Claude Code and Codex.
- Publish the core image automatically to GitHub Container Registry (GHCR).

## Current behavior introduced in Phase 1

When a session is created with `container` options (`POST /api/sessions/create`), Companion now writes:

- `.companion/cloud/environments/<sessionId>.json`

inside the project directory (`cwd`).

This file contains:

- Requested image, ports, env key names, and volumes
- Resolved runtime port mappings (`containerPort -> hostPort`)
- Backend (`claude` or `codex`) and session metadata
- Container ID/name/cwd

This manifest is the bridge for later cloud orchestration (Modal, remote workers, etc.).

## How to create an environment

From the UI/session creation request, pass container settings:

```json
{
  "cwd": "/path/to/project",
  "backend": "claude",
  "container": {
    "image": "ghcr.io/<org>/companion-core:latest",
    "ports": [3000, 5173],
    "volumes": ["/tmp/cache:/cache"],
    "env": {
      "NODE_ENV": "development"
    }
  }
}
```

Docker publishes ports using random host ports (`-p 0:<port>`). Companion persists the final mapping in the manifest.

The same flow is supported with `backend: "codex"`.

## Manifest contract (v1)

```json
{
  "version": 1,
  "environmentId": "session-123",
  "sessionId": "session-123",
  "backend": "claude",
  "createdAt": "2026-02-13T00:00:00.000Z",
  "cwd": "/path/to/project",
  "image": "ghcr.io/<org>/companion-core:latest",
  "container": {
    "id": "abc123",
    "name": "companion-abc123",
    "cwd": "/workspace",
    "portMappings": [
      { "containerPort": 3000, "hostPort": 49152 }
    ]
  },
  "requested": {
    "ports": [3000],
    "volumes": ["/tmp/cache:/cache"],
    "env": ["NODE_ENV"]
  }
}
```

## Core image reference

See `web/docs/core-image-reference.md` for:

- Minimal image requirements
- Build constraints for size/performance
- Runtime expectations for Claude Code + Codex
- Extension patterns

## CI publishing (GHCR)

The workflow `.github/workflows/core-image.yml` publishes `docker/core/Dockerfile` to GHCR.

Default image name:

- `ghcr.io/<owner>/companion-core`

Tags include:

- `latest` on default branch
- branch ref tags
- commit SHA tags

## Provider planning endpoint

Companion exposes a first provider planning endpoint:

- `GET /api/cloud/providers/modal/plan?cwd=<projectCwd>&sessionId=<sessionId>`

It reads the persisted manifest and returns a Modal command preview that can be used by the next deployment phase.

## Known constraints in Phase 1

- Manifest is persisted for container-backed sessions only.
- No remote scheduler integration yet (Modal/Kubernetes is next phase).
