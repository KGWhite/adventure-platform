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
3. Update [README.md](README.md).
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

Must check and update [README.md](README.md) and related files in `docs/`.

- Documentation must always remain synchronized with actual implementation.
- Never leave obsolete commands, architectural diagrams, directory trees, or configuration keys.
- Even when a task does not require modifying documentation, verify that existing documentation remains accurate.

## 4. README Maintenance

[README.md](README.md) is the primary entry point of this repository.

After any modification, verify that:
- Directory structure is up to date.
- Development instructions are accurate.
- Runtime architecture description is correct.
- Environment variable specifications are valid.
- Docker / Compose commands and descriptions match the current state.

Update [README.md](README.md) within the same commit/change if discrepancies exist.

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

See full specification in [docs/development/dependency-policy.md](docs/development/dependency-policy.md).

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
7. [README.md](README.md) is still accurate.
8. Relevant files under `docs/` are still accurate.
9. Documentation was updated if architecture, behavior, or configuration changed.

## 13. Commit Message Generation

# Commit message format

Use:

```text
<type>(<scope>): <summary>
```

Example:

```text
feat(web): add adventurer dashboard
```

## Line length

Follow common Git commit message conventions.

### Subject line

The first line must:

- be no longer than 72 characters
- preferably stay around 50-60 characters when practical
- remain concise and descriptive
- not end with a period

Example:

```text
feat(web): add local quest completion feedback
```

Avoid:

```text
feat(web): add a new local quest completion feedback animation system for mobile users
```

If the subject becomes too long, shorten it and move details into the body.

### Commit body

Separate the body from the subject with one blank line.

Each body line should be no longer than 72 characters where practical.

Prefer concise bullet points.

Example:

```text
feat(web): add local quest completion feedback

- add reusable game feedback overlay
- trigger animation after successful API response
- support reduced-motion presentation
```

Do not write unnecessarily long paragraphs in commit messages.

If more explanation is needed, wrap text to keep line length readable.

---

# Allowed commit types

Prefer:

```text
feat
fix
refactor
docs
test
chore
build
ci
perf
style
```

Use them according to standard Conventional Commit meaning.

Do not use `style` for visual UI features.

UI functionality or visual feature work should normally use:

```text
feat
```

---

# Scope

Use a short scope representing the main affected area.

Preferred scopes may include:

```text
web
api
db
auth
adventurer
quest
rank
credential
reward
promotion
docker
repo
docs
```

Keep scopes short and stable.

Do not create highly specific scopes unless clearly necessary.

---

# Summary rules

The summary must:

- be written in English
- use imperative/present-tense style
- start with a lowercase letter
- not end with a period
- describe the actual change
- remain within 72 characters
- avoid vague wording

Good:

```text
fix(auth): reject expired access tokens
```

Bad:

```text
fix(auth): Updated some authentication related files.
```

Bad:

```text
chore: changes
```

---

# Commit body

Add a body when the change contains multiple meaningful parts.

Format:

```text
<type>(<scope>): <summary>

- first meaningful change
- second meaningful change
- third meaningful change
```

Keep each line within 72 characters where practical.

Body bullets must describe only actual changes.

Do not invent implementation details.

---

# Breaking changes

If a change is actually incompatible with existing behavior, API,
configuration, or usage, mark it clearly.

Example:

```text
feat(api)!: change credential response format
```

or:

```text
BREAKING CHANGE: credential responses now use a normalized format
```

Do not mark non-breaking changes as breaking.

---

# Commit generation behavior

Generate the recommended commit message only after implementation is
complete.

Base the message on:

```text
actual diff
actual files changed
final implementation state
```

Do not base it only on the original task description.

If unrelated changes exist, recommend splitting them into separate commits.

Prefer one focused commit per logical change.

---

# Do not commit automatically

Do not run:

```bash
git commit
```

unless the user explicitly asks for the commit to be created.

By default, only provide the recommended commit message.

If the user asks to commit:

1. inspect the actual diff
2. generate the message from the real changes
3. commit only related files
4. avoid including unrelated modifications

---

# Final task summary

At the end of each completed coding task, include:

```text
Recommended commit message:

feat(web): add adventurer dashboard
```

If a body is useful:

```text
Recommended commit message:

feat(web): add adventurer dashboard

- add responsive adventurer profile summary
- show current rank and credential status
- add mobile navigation
```

Do not provide multiple alternatives unless the changes should genuinely
be split into separate commits.
