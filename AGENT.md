# Agent Guidelines

These guidelines define the development standards, architectural principles, and operating constraints for working on the `adventure-platform` repository.

## 1. General Principles

- **Keep the project simple**: Always prefer the simplest solution that satisfies current requirements.
- **No premature infrastructure**: Do not introduce infrastructure or abstractions without an immediate, concrete requirement.
- **Maintain extension points**: Preserve reasonable extension points for future development without over-engineering.
- **Avoid premature optimization**: Build straightforward, working solutions first.
- **Avoid premature microservice decomposition**: The platform follows a **Modular Monolith** architecture, not microservices.

## 2. Repository Structure

Respect the existing repository structure. Do not create new top-level directories without explicit justification.

If a new top-level directory is genuinely needed:
1. Explain the rationale clearly.
2. Confirm that the existing directory structure cannot reasonably accommodate the files.
3. Update [README.md](file:///home/abUC/adventure-platform/README.md).
4. Update relevant documentation in `docs/`.

## 3. Documentation Rule

Documentation integrity is mandatory. Any change affecting:
- Architecture
- Directory structure
- API contracts
- Database schemas or migrations
- Deployment processes
- Development workflows
- Environment variables
- Dependencies
- Build processes
- Runtime behavior
- Major feature behavior

Must check and update [README.md](file:///home/abUC/adventure-platform/README.md) and related files in `docs/`.

- Documentation must always remain synchronized with actual implementation.
- Never leave obsolete commands, architectural diagrams, directory trees, or configuration keys.
- Even when a task does not require modifying documentation, verify that existing documentation remains accurate.

## 4. README Maintenance

[README.md](file:///home/abUC/adventure-platform/README.md) is the primary entry point of this repository.

After any modification, verify that:
- Directory structure is up to date.
- Development instructions are accurate.
- Runtime architecture description is correct.
- Environment variable specifications are valid.
- Docker / Compose commands and descriptions match the current state.

Update [README.md](file:///home/abUC/adventure-platform/README.md) within the same commit/change if discrepancies exist.

## 5. Empty Directories

- Empty directories that must be preserved in Git must contain a `.gitkeep` file.
- Once a directory contains actual tracked files, remove `.gitkeep` if it is no longer necessary.

## 6. Code Formatting

All text files must adhere to the following:
- UTF-8 encoding.
- LF (`\n`) line endings.
- No trailing whitespace on any line.
- Exactly one trailing newline at the end of the file.

## 7. Naming Conventions

- Use `kebab-case` for file and directory names by default, unless programming language conventions dictate otherwise.
- Names should express domain concepts rather than implementation details.
- For player identification mechanisms, core domain abstractions must not be tied to physical hardware terms (e.g., avoid naming core entities `nfc`). Prefer abstract concepts such as `credential` or other appropriate domain models.
- Hardware technologies such as NFC, RFID, and QR Code should be treated as interchangeable implementations or providers.

## 8. Architecture Principles

- Game logic must not depend directly on physical input hardware such as NFC, RFID, or QR Code.
- Future input methods (NFC, RFID, QR Code) should feed into a unified credential and event processing pipeline.
- Do not implement premature abstraction layers ahead of time. Introduce abstractions only when implementing the concrete features.

## 9. Docker & Infrastructure

- Container runtime: **Docker**.
- Local orchestration: **Docker Compose**.
- Do not introduce Kubernetes configurations at this stage.
- Application design must not rely on Docker Compose-specific networking quirks.
- Application configuration must prioritize environment variables over hardcoded values or static container IPs.

## 10. Dependency and Version Policy

See full specification in [docs/development/dependency-policy.md](file:///home/abUC/adventure-platform/docs/development/dependency-policy.md).

- **Core Principle**: Use versions that are modern, stable, actively maintained, and reasonably recent. Prefer stability over bleeding-edge features.
- **General Rules**:
  - Prefer the latest stable release suitable for production use; prefer LTS lines.
  - Never use prerelease tags (`alpha`, `beta`, `rc`, `canary`, `next`, `experimental`, `preview`, `nightly`).
  - Do not automatically select a new major version only because it is numerically newer.
  - Do not add dependencies based on speculative future requirements; add only when an active feature directly requires them.
  - Before introducing a new dependency, evaluate necessity, existing alternatives, and operational overhead.
- **Node.js**:
  - Use the latest stable LTS release.
  - Pin the chosen Node.js major version consistently across local development documentation, Dockerfile, `package.json` `engines`, and CI.
  - Services must not silently use unrelated Node.js major versions.
- **pnpm**:
  - Use a recent stable release (no prereleases).
  - Record the exact selected version in root `package.json` (`packageManager`).
  - Keep the same pnpm version between local development and Docker builds.
- **PostgreSQL**:
  - Use a recent stable major release that is fully supported (e.g. `postgres:16-alpine`).
  - Pin at least the major version in Docker Compose. Never use `postgres:latest`.
- **React, Vite, NestJS, Prisma**:
  - Use current stable production releases.
  - Confirm stability and Node.js LTS compatibility before selecting major versions.
  - Avoid unnecessary migration complexity.
- **Locking Dependencies**:
  - Always commit `pnpm-lock.yaml`. Never edit the lockfile manually.
  - Avoid broad dependency ranges where predictable versions are beneficial.
- **Docker Image Version Policy**:
  - Never use floating `latest` tags for core runtime dependencies (`node:<LTS-major>-alpine`, `postgres:<stable-major>`).
  - If Alpine creates compatibility issues with native dependencies or Prisma, prefer standard slim Debian-based images over fragile workarounds.
- **Upgrade Policy**:
  - Do not upgrade dependencies unrelated to the current task.
  - When intentionally upgrading a major dependency: verify compatibility, run tests/builds, verify Docker Compose, and update documentation.

## 11. Scope Discipline

When working on a task:
- Modify only files relevant to the requested task.
- Do not perform unrelated refactoring.
- Do not unilaterally expand task requirements.
- Do not implement future features prematurely.
- Suggest non-scoped improvements separately rather than bundling unsolicited changes into the task.

## 12. Completion Checklist

Before finalizing any task, check off the following:
1. Requested change is complete and verified.
2. Project structure remains consistent.
3. No unnecessary files or artifacts were added.
4. No trailing whitespace exists in any modified file.
5. All text files end with exactly one newline.
6. Empty directories that must be tracked contain `.gitkeep`.
7. [README.md](file:///home/abUC/adventure-platform/README.md) is still accurate.
8. Relevant files under `docs/` are still accurate.
9. Documentation was updated if architecture, behavior, or configuration changed.
