# Dependency and Version Policy

Use versions that are **modern, stable, actively maintained, and reasonably recent**.

The goal is not to use the absolute newest version available.

Prefer stability over bleeding-edge features.

## General Rules

When selecting dependencies:

1. Prefer the latest stable release that is suitable for production use.
2. Prefer actively maintained release lines.
3. Prefer LTS versions when an LTS release model exists.
4. Do not use prerelease versions unless explicitly required.

Avoid versions marked as:

```text
alpha
beta
rc
canary
next
experimental
preview
nightly
```

Do not automatically select a new major version only because it is numerically newer.

Evaluate whether it is already considered stable and production-ready.

---

## Node.js

Use the latest stable LTS release.

Do not use the Node.js Current release for the MVP when a mature LTS release is available.

At project initialization, verify the current official Node.js release status before choosing the version.

Pin the chosen Node.js major version consistently across:

```text
local development documentation
Dockerfile
package.json engines if used
CI configuration if introduced later
```

Do not allow different services to silently use unrelated Node.js major versions.

---

## pnpm

Use a recent stable pnpm release.

Do not use prerelease versions.

Record the exact selected version in the root `package.json`:

```json
{
  "packageManager": "pnpm@<selected-stable-version>"
}
```

Use the actual selected version.

Keep the same pnpm version between local development and Docker builds where practical.

---

## PostgreSQL

Use a recent stable PostgreSQL major release that is fully supported.

Within the selected major release, prefer the latest stable minor release.

Do not use beta, RC, or development PostgreSQL releases.

For Docker Compose, pin at least the PostgreSQL major version.

Example:

```yaml
image: postgres:18
```

A more specific minor version may be used when reproducibility is preferred.

Do not use:

```yaml
image: postgres:latest
```

---

## React, Vite, NestJS, Prisma and Other Dependencies

Use current stable production releases.

Before selecting a major version:

- confirm it is stable
- confirm it supports the selected Node.js LTS version
- confirm the surrounding ecosystem supports it
- avoid unnecessary migration complexity

Do not intentionally install older versions only because they appear in tutorials or generated examples.

Do not blindly upgrade to a newly released major version without compatibility verification.

---

## Locking Dependencies

Commit:

```text
pnpm-lock.yaml
```

Use the lockfile to keep dependency resolution reproducible.

Do not manually edit the lockfile.

Avoid broad dependency ranges where a stable project configuration would benefit from predictable versions.

---

## Docker Image Version Policy

Do not use floating `latest` tags for core runtime dependencies.

Prefer versions such as:

```text
node:<LTS-major>-alpine
postgres:<stable-major>
```

or equivalent stable variants.

When choosing Alpine images, verify that required native dependencies and Prisma compatibility work correctly.

If Alpine creates unnecessary compatibility problems, prefer a standard slim Debian-based image instead of adding workarounds.

Stability and maintainability are more important than minimizing image size.

---

## Upgrade Policy

Do not upgrade dependencies unrelated to the current task.

When intentionally upgrading a major dependency:

1. verify compatibility
2. run existing tests/builds
3. verify Docker Compose
4. update documentation if runtime requirements changed
5. record important migration considerations

Prefer incremental dependency upgrades over upgrading the entire stack at once.
