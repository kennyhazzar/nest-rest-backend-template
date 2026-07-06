# Nest REST Backend Template

Production-ready NestJS REST API template. Feature-module architecture with light DDD layering, CQRS command/query/event buses, RBAC via CASL, cookie/JWT hybrid authentication, and a YAML-first configuration system — built to be cloned and extended, not just demoed.

## Table of contents

- [Feature summary](#feature-summary)
- [Tech stack](#tech-stack)
- [Architecture](#architecture)
- [Project structure](#project-structure)
- [Quick start](#quick-start)
- [Configuration](#configuration)
- [Modules](#modules)
- [Authentication & security](#authentication--security)
- [Background jobs](#background-jobs)
- [i18n](#i18n)
- [Observability](#observability)
- [Database & migrations](#database--migrations)
- [Testing](#testing)
- [Deployment](#deployment)
- [Dependencies](#dependencies)
- [Roadmap](#roadmap)

## Feature summary

- NestJS 11 on Fastify
- Drizzle ORM over PostgreSQL, SQL-first migrations
- CQRS via `@nestjs/cqrs` — controllers only dispatch commands/queries
- RBAC with CASL, permissions seeded per role, checked via `@Policy()` + `PoliciesGuard`
- Cookie-based JWT auth (access + refresh), CSRF double-submit protection, brute-force lockout, passwordless magic-link login, password reset/change
- i18n-aware error responses and validation messages (`ru`/`en`)
- File storage via any S3-compatible backend (MinIO locally)
- Mail delivery via Handlebars templates + BullMQ queue, with retry
- In-app notifications, dispatched asynchronously
- Custom captcha module: SVG generation, Redis-backed pre-generated pool, admin authoring UI endpoints
- Admin module: dashboard stats, access-log audit trail, system settings
- Health checks (`@nestjs/terminus`), request IDs, structured Pino logs, optional Graylog/Elasticsearch/Zabbix
- Field-level AES-256-GCM encryption service for sensitive columns
- Docker Compose for local infra (Postgres, Redis, MinIO, Mailpit)

## Tech stack

| Concern            | Choice                                                             |
| ------------------ | ------------------------------------------------------------------- |
| Framework           | NestJS 11 + Fastify adapter                                        |
| Database / ORM      | PostgreSQL + Drizzle ORM (`drizzle-orm`, `drizzle-kit`)              |
| App-level pattern   | CQRS (`@nestjs/cqrs`) + feature modules with DDD-style layers       |
| Auth                | `@nestjs/jwt`, `@nestjs/passport` (JWT strategy), `argon2` hashing  |
| Authorization       | `@casl/ability` (RBAC, permission-based)                            |
| Queues              | BullMQ over Redis (`@nestjs/bullmq`)                                |
| Object storage      | S3-compatible (`nestjs-s3`, `@aws-sdk/client-s3`) — MinIO locally    |
| Mail                | `@nestjs-modules/mailer` + Handlebars templates                     |
| Logging             | `nestjs-pino` (Pino), optional Graylog/Elasticsearch transports     |
| Config              | `@nestjs/config` + custom YAML loader with `${VAR}` env substitution |
| Validation          | `class-validator` / `class-transformer`                             |
| API docs            | `@nestjs/swagger`, served at `/api/docs`                             |
| Tests               | Jest (unit / integration / e2e, separate configs)                   |
| Package manager     | pnpm (via Corepack) — see [Dependencies](#dependencies)              |

## Architecture

This is a single Nest application (`apps/backend`), not a multi-app monorepo, but it is organized like one internally.

**Feature modules** live under `apps/backend/src/modules/*` (`users`, `file`, `mail`, `notification`, `captcha`, `admin`, `health`, `migration`). Each non-trivial module is internally layered:

```
modules/<name>/
  domain/           # plain TS entities, abstract repository classes, interfaces — no ORM/framework imports
  application/       # CQRS commands, queries, handlers, domain events
  infrastructure/     # Drizzle repository implementations, adapters, Passport strategies, queue processors
  presentation/       # controllers, request/response DTOs, entity→DTO mappers
```

Rules that hold across the codebase:

- **Controllers never contain business logic.** They validate input (DTO + `ValidationPipe`) and dispatch a `CommandBus`/`QueryBus` call. All decision-making lives in a handler.
- **Domain entities are plain classes**, decoupled from Drizzle. Repository abstract classes (e.g. `UserRepository`) act as both the interface and the DI token; the concrete `*RepositoryDrizzle` implementation is bound in the module's `providers` (`{ provide: UserRepository, useClass: UserRepositoryDrizzle }`). Swapping persistence later means writing a new adapter, not touching application code.
- **Cross-module communication goes through the `EventBus`**, not direct service calls. E.g. `UserCreatedEvent` (published in `users`) is consumed independently by `mail` (welcome email) and `notification` (welcome notification).
- There is no separate `auth` module — authentication lives inside `UsersModule` (`presentation/controllers/auth.controller.ts`) because it's tightly coupled to the user aggregate (login attempts, lockout state, roles).
- Global cross-cutting pieces (guards, decorators, exceptions, interceptors, i18n, config, CASL ability factory) live directly under `apps/backend/src/*`, not inside a module.

## Project structure

```
apps/backend/
  src/
    main.ts                  # Fastify bootstrap, Swagger, security headers, global pipes/filters
    app.module.ts             # root module wiring
    config/                   # YAML config loader
    common/
      drizzle/                 # DB connection, schema (all tables), migration module
      crypto/                   # AES-256-GCM field encryption service
    decorators/                # @CurrentUserId, @CurrentRoleId, @CurrentRoleType, @Policy
    guards/                    # JwtAuthGuard, PoliciesGuard, CsrfGuard
    factories/                 # CaslAbilityFactory
    i18n/                      # translation files (ru/en) + i18n service
    interceptors/, exceptions/ # response shaping, global exception filter
    enums/, interfaces/        # shared enums (RoleType, Actions, Subjects, AuthMode…) and types
    options/                   # async module option factories (bullmq, mailer, s3, throttler, logger)
    modules/
      users/                   # accounts, roles/permissions, auth, magic link, password reset
      file/                    # S3-backed file storage with versioning
      mail/                    # templated email delivery via queue (no HTTP surface)
      notification/            # in-app notifications
      captcha/                 # SVG captcha challenges + admin authoring
      admin/                   # dashboard, access logs, system settings
      health/                  # liveness/readiness checks
      migration/               # boot-time seeding (roles, admin user, templates)
  scripts/                    # migrate.cjs, load-config.cjs
drizzle/migrations/           # generated SQL migrations
docker/                       # docker-compose.yaml, Dockerfile, .env.example, config.docker.yaml
test/                         # e2e harness, integration tests, shared setup
config.yaml.example           # documented local config template
config.production.yaml.example
config.test.yaml              # used by unit/integration/e2e test runs
```

## Quick start

Requirements: Node `^22.17` or `^24`, pnpm (via Corepack — `corepack enable`), Docker.

```bash
pnpm install
copy docker\.env.example docker\.env      # cp on macOS/Linux
pnpm docker                                # postgres, redis, minio, mailpit, backend
pnpm drizzle:migrate                       # apply SQL migrations
```

The API is now at `http://localhost:3000/api/v1`, Swagger UI at `http://localhost:3000/api/docs`.

**On first boot the app self-seeds** (see `modules/migration/migration.module.ts`, runs in `onModuleInit`):

- 4 roles: `admin`, `manager`, `user`, `public` (`modules/migration/configs/roles.config.ts`), each with a fixed permission set
- One admin user, built from `ADMIN_EMAIL` / `ADMIN_PASSWORD` in `docker/.env` — password must satisfy `isStrongPassword` (8+ chars, upper/lower/number/symbol) or boot fails
- Default notification and mail templates

Re-running seeding is idempotent — it only inserts when the corresponding table is empty.

For a bare-metal (non-Docker) dev loop:

```bash
copy config.yaml.example config.yaml   # edit DB/Redis connection to point at local services
pnpm drizzle:migrate
pnpm start:dev
```

## Configuration

Config is **YAML-first**, not raw `process.env` reads scattered through the code. `apps/backend/src/config/configuration.ts` loads a YAML file and substitutes `${VAR}` placeholders from the environment before parsing:

- `${VAR}` — replaced with the env var, or empty string if unset
- `${VAR:-default}` — falls back to `default` if unset
- `${VAR:?message}` — **throws at boot** if unset (used for every secret)

Which file loads is controlled by `CONFIG_FILE` (defaults to `config.yaml`, or `config.test.yaml` when `NODE_ENV=test`). Access values via `ConfigService.get('jwt.access.token')`-style dot paths — never `process.env.X` directly in application code.

| File                              | Used for                                                        |
| ---------------------------------- | ---------------------------------------------------------------- |
| `config.yaml.example`               | Documented template — copy to `config.yaml` for local, non-Docker dev |
| `config.production.yaml.example`    | Documented template for a production deployment                  |
| `config.test.yaml`                  | Fixed config for unit/integration/e2e test runs (checked in)     |
| `docker/config.docker.yaml`         | Mounted into the `backend` container by `docker-compose.yaml`    |
| `docker/.env.example`               | Secrets/ports consumed by `docker-compose.yaml` and `config.docker.yaml` |

Key top-level config sections (see `config.yaml.example` for the full annotated list):

| Section     | Controls                                                                 |
| ----------- | ------------------------------------------------------------------------- |
| `host`      | hostname/port/origin/environment                                         |
| `database`  | Postgres connection (or a single `uri`)                                  |
| `redis`     | Redis connection, backs BullMQ and the captcha pool                      |
| `jwt`       | access/refresh secrets, algorithms, expiry                               |
| `auth`      | `mode` (`HYBRID`/`COOKIES_ONLY`/`RESPONSE_ONLY`), cookie flags, CSRF toggle |
| `security`  | `encryptionKey` for field-level AES-256-GCM encryption                    |
| `admin`     | bootstrap admin email/password                                            |
| `swagger`   | enable + optional Basic Auth in front of `/api/docs`                      |
| `s3`        | object storage credentials/endpoint (optional — file uploads no-op without it) |
| `mailer`    | SMTP credentials (optional — mail sending no-ops without it)              |
| `throttle`  | global rate-limit window/limit                                            |
| `graylog`   | optional GELF log shipping                                                |
| `kibana`    | optional Elasticsearch log shipping (via `pino-elasticsearch`)            |

## Modules

### Users (accounts, roles, auth)

Owns the `user`, `user_role`, `role_permission`, `refresh`, `password_reset_token`, `magic_link_token` tables.

| Method | Path                        | Auth        | Purpose                                   |
| ------ | ---------------------------- | ----------- | ------------------------------------------ |
| GET    | `/auth/me`                  | JWT         | Current authenticated user                 |
| POST   | `/auth/login`                | —           | Email/password login (rate-limited)        |
| POST   | `/auth/refresh`              | refresh cookie/body | Rotate access+refresh token pair   |
| POST   | `/auth/logout`               | refresh cookie/body | Revoke refresh token               |
| POST   | `/auth/forgot-password`      | —           | Send password-reset email (rate-limited)   |
| POST   | `/auth/reset-password`       | —           | Consume reset token, set new password      |
| POST   | `/auth/change-password`      | JWT         | Change password (requires current one)     |
| POST   | `/auth/magic-link/request`   | —           | Email a one-time passwordless login link   |
| POST   | `/auth/magic-link/authenticate` | —        | Exchange magic-link token for a session    |
| CRUD   | `/users`, `/users/roles`     | JWT + policy | User & role management                    |

See [Authentication & security](#authentication--security) below for how login, lockout, tokens and RBAC actually work.

### File

Owns the `file` (+ version) tables; storage itself lives in S3/MinIO, not the DB.

| Method | Path                              | Auth   | Purpose                                  |
| ------ | ----------------------------------- | ------ | ------------------------------------------ |
| POST   | `/file/users/me`                    | JWT    | Multipart upload, one or more files        |
| GET    | `/file/:fileId[/:versionId]`        | JWT    | Download a private file (ownership/role checked) |
| GET    | `/file/public/:fileId[/:versionId]` | —      | Download a public file, no auth            |

Files are versioned (`file_version`), streamed through the backend rather than redirecting to a signed S3 URL — see `infrastructure/adapters/s3.adapter.ts`.

### Mail

**No HTTP controller** — it's an internal service used by other modules (auth flows, notifications) via `CommandBus`. Templates are Handlebars, stored in Postgres (not the filesystem) and seeded at boot from `mail/infrastructure/services/template-seed.service.ts`. Sending is asynchronous via a BullMQ `mail` queue (`mail.processor.ts`), with delivery status tracked per message and up to 5 retry attempts on failure.

The `mail_template` name enum already includes `oauth-first-login` and `oauth-account-linked` alongside the templates actually in use (`welcome`, `reset-password`, `magic-link-login`, …) — placeholders left for the third-party auth work in the [roadmap](#roadmap), not yet sent by any handler.

### Notification

In-app notifications for the current user, dispatched asynchronously via a BullMQ `notifications` queue.

| Method | Path                          | Auth        | Purpose                       |
| ------ | ------------------------------ | ----------- | -------------------------------- |
| GET    | `/notifications`               | JWT + policy | List current user's notifications |
| GET    | `/notifications/unread-count`  | JWT + policy | Unread count                     |
| PATCH  | `/notifications/:id/read`      | JWT + policy | Mark one as read                 |
| PATCH  | `/notifications/read-all`      | JWT + policy | Mark all as read                 |
| DELETE | `/notifications/:id`           | JWT + policy | Delete a notification            |

### Captcha

Home-grown SVG text captcha — no third-party captcha service dependency.

| Method | Path                                       | Auth        | Purpose                                  |
| ------ | --------------------------------------------- | ----------- | ------------------------------------------- |
| POST   | `/captcha/challenges`                        | —           | Issue a challenge from the pre-generated pool |
| GET    | `/captcha/challenges/:id/image`              | —           | Stream the challenge image                  |
| POST   | `/captcha/challenges/:id/verify`             | —           | Verify a submitted answer                    |
| CRUD   | `/admin/captcha/templates`, `/configs`, `/pools`, `/metrics` | JWT + policy | Author templates/configs, trigger batch pre-generation, inspect the Redis pool |

Design: challenge images are **pre-generated in bulk** into an S3-backed pool and tracked in Redis (`RedisCaptchaPool`), rather than generated synchronously per request — batch generation runs through a BullMQ `captcha-generation` queue/processor. Answers are hashed with HMAC (`HmacCaptchaHashingService`), never stored in plaintext. This is what the login lockout flow (see below) points users at once `requiresCaptcha` is returned.

> **Note**: unlike roles/admin/mail templates, **captcha templates are not seeded automatically**. Challenge creation defaults to template code `svg-text-ru-v1` and 404s if it doesn't exist and isn't `ACTIVE`. On a fresh environment, an admin must create it (and an active config) via `POST /admin/captcha/templates` + `.../configs` + `.../activate` before any captcha-gated flow works.

### Admin

| Method | Path                     | Auth               | Purpose                          |
| ------ | -------------------------- | -------------------- | ----------------------------------- |
| GET    | `/admin/dashboard`         | JWT + `ADMIN_DASHBOARD` | System-wide stats                  |
| GET    | `/admin/access-logs`       | JWT + `ADMIN_ACCESS_LOG` | Paginated audit trail             |
| GET    | `/admin/system-settings`   | JWT + `ADMIN_SETTINGS` | Read key/value system settings     |
| PATCH  | `/admin/system-settings`   | JWT + `ADMIN_SETTINGS` | Upsert a system setting            |

The access-log audit trail is populated by event handlers (`admin/application/handlers/events/auth-audit.handlers.ts`) reacting to `UserLoginSucceededEvent`/`UserLoginFailedEvent`/etc. published from the `users` module — admin doesn't know about login internals directly, it just listens.

### Health

| Method | Path            | Checks                                          |
| ------ | ---------------- | -------------------------------------------------- |
| GET    | `/health`         | DB ping + heap/RSS memory thresholds (`@nestjs/terminus`) |
| GET    | `/health/ready`   | DB ping only                                       |
| GET    | `/health/live`    | Process liveness (no dependencies)                 |

Exempt from global rate limiting (`@SkipThrottle()`) and from the global `/api/v1` prefix (see `main.ts` — `internal/v1/*` is excluded), so orchestrators can hit it predictably.

### Migration

Not a REST module — an `OnModuleInit` hook that runs seeding (roles, permissions, admin user, notification/mail templates) every time the app boots. See [Quick start](#quick-start).

## Authentication & security

- **Token issuance/verification** is centralized in `AuthServiceAdapter` (`modules/users/infrastructure/adapters/auth-service.adapter.ts`) — access tokens (short-lived, `jwt.access.*`) and refresh tokens (long-lived, separate secret/algorithm, `jwt.refresh.*`) are signed independently. Every issued refresh token is persisted in the `refresh` table with fingerprint + user-agent, so tokens can be revoked server-side (logout, or bulk-revoked on password change).
- **Three delivery modes** (`auth.mode` config): `HYBRID` (httpOnly cookies *and* tokens in the response body — default), `COOKIES_ONLY` (web-only, cookies only), `RESPONSE_ONLY` (body only, e.g. for native mobile clients that can't rely on cookies).
- **CSRF**: double-submit cookie pattern (`CsrfGuard`) — a non-httpOnly `csrf-token` cookie must match an `X-CSRF-Token` header on unsafe methods, when `auth.csrf.enabled` is on. A path allowlist (`/auth/login`, `/auth/refresh`, `/auth/logout`, `/auth/magic-link/*`) bypasses this for the endpoints that establish the session in the first place.
- **Brute-force protection**: `LoginUserHandler` tracks `failedLoginAttempts` in a rolling 15-minute window. 3rd failure sets `requiresCaptcha: true` in the response (frontend should then require solving a `/captcha/challenges` challenge); 5th failure locks the account for 30 minutes and emails an admin security alert.
- **Passwordless login**: magic link (`magic_link_token` table) — a signed one-time token emailed to an *existing* user, valid for a configurable TTL, bound to a request fingerprint. This is not a registration path; the user must already exist.
- **RBAC**: `user_role` + `role_permission` tables define `(roleType, action, subject)` triples, seeded from `modules/migration/configs/roles.config.ts`. `CaslAbilityFactory` builds a CASL `Ability` per role (cached — see `PoliciesService`/`clearCache()`); routes are protected declaratively with `@Policy(Actions.READ, Subjects.NOTIFICATION)` + `@UseGuards(JwtAuthGuard, PoliciesGuard)`. Unauthenticated requests are evaluated against the `public` role rather than always rejected, so some endpoints can define public-tier policies.
- **Field-level encryption**: `EncryptionService` (`common/crypto/encryption.service.ts`) does AES-256-GCM for sensitive columns that need to be stored reversibly, plus a one-way SHA-256 mode for values that only need equality lookups (e.g. device tokens). Not currently wired into the `user` table's own fields — available for any module that needs it.
- **Logs never leak secrets**: the Pino redact list (`options/logger.module.options.ts`) strips `Authorization`/`Cookie` headers and any `password`/`*Token` field from both requests and log messages before they reach any transport.

## Background jobs

Three BullMQ queues, all backed by the same Redis instance (`redis.*` config):

| Queue                | Producer                          | Consumer                                 |
| --------------------- | ------------------------------------ | ------------------------------------------- |
| `mail`                 | `MailService` (any module, via `SendMailCommand`) | `MailProcessor` — renders template, sends via SMTP, tracks status, retries up to 5x |
| `notifications`        | `NotificationDispatchService`        | `NotificationDispatchProcessor` — fans out to enabled channels |
| `captcha-generation`   | Admin "generate batch" endpoint      | `CaptchaGenerationProcessor` — pre-renders SVG challenges into the pool |

## i18n

Translation files live under `apps/backend/src/i18n/{ru,en}/*.json`, split by namespace: `common`, `user`, `notification`, `validation`. Default language/locale/country come from `settings.*` in config; a request-scoped `LanguageInterceptor` resolves the active language per request. `class-validator` errors are translated by `createValidationException` (`i18n/validation-exception.factory.ts`) before reaching the client — validation failures are never raw English `class-validator` strings in production.

## Observability

- **Logging**: `nestjs-pino`, pretty-printed in dev, JSON in prod. Optional additional transports, toggled purely by config presence: file (`log.file.*`), Graylog/GELF (`graylog.*`), Elasticsearch (`kibana.host`, via `pino-elasticsearch`).
- **Health checks**: see [Health module](#health) above.
- **Zabbix**: no Zabbix client code exists in the app itself — `observability.zabbix.enabled` is a config flag that makes `main.ts` log a warning at boot when monitoring isn't wired up. The integration is a **separate, optional** `docker/docker-compose.zabbix.yaml` stack (zabbix-server/web/agent2) that attaches to the same Docker network and monitors the backend by tailing the same `./logs` volume the backend writes to when `LOG_FILE_ENABLED=true`. It is not started by `pnpm docker` and must be brought up explicitly.
- **Request IDs**: every response carries `X-Request-Id` (respects an inbound `x-request-id` header if it matches a safe pattern, otherwise generates one) — correlate a client-reported issue with server logs.

## Database & migrations

Schema is Drizzle, defined in `apps/backend/src/common/drizzle/schema/*.schema.ts` (one file per bounded area, barrelled in `schema/index.ts`). Domain entities are separate plain classes — nothing in `domain/` imports Drizzle.

```bash
pnpm drizzle:generate     # diff schema/*.schema.ts against drizzle/migrations, write new SQL
pnpm drizzle:migrate       # apply pending migrations (apps/backend/scripts/migrate.cjs)
pnpm drizzle:migrate:test  # same, against config.test.yaml
```

Migrations are plain SQL files under `drizzle/migrations/`, applied via a custom runner (not `drizzle-kit migrate`) that tracks applied hashes in `drizzle.__drizzle_migrations` — this runs automatically as the first step of the Docker image's container command (see [Deployment](#deployment)).

> **Known drift**: `0000_initial.sql`/`0001_file_version_optional_s3_version.sql` are the only committed migrations, but the live schema (`schema/*.schema.ts`) has grown well beyond them (captcha_*, notification, mail, access_log, system_setting, role_permission, refresh, etc. — most of the schema isn't represented in a migration file). Running `pnpm drizzle:generate` against the current schema will surface this as one large diff. The tables already exist in real deployments, most likely applied via `drizzle-kit push` rather than a generated migration. Regenerating migrations to match the schema should be treated as a separate, deliberate task rather than a side effect of unrelated changes.

## Testing

Three independent Jest configs:

```bash
pnpm test / test:unit       # colocated *.spec.ts next to source, mocked repositories — no DB/HTTP
pnpm test:unit:cov          # same, with coverage
pnpm test:integration       # NODE_ENV=test, real DB via config.test.yaml, --runInBand
pnpm test:e2e                # full Nest app + Fastify + real DB, supertest agent
pnpm test:all                # all three tiers in sequence
```

Unit tests mock repository/service abstract classes directly (`jest.Mocked<T>`), following the pattern in `modules/users/application/handlers/*.spec.ts`. The e2e harness (`test/setup/app.ts`) boots the real `AppModule` once and reuses it across specs; currently only a health-check e2e spec exists (`test/e2e/app-health.e2e-spec.ts`) — most coverage today is at the unit level.

`test/integration/` has its own Jest config (`NODE_ENV=test`, real DB) but currently contains **no spec files**. `pnpm test:integration` — and therefore `pnpm test:all`, which chains it before `test:e2e` — fails with Jest's "No tests found, exiting with code 1" rather than passing trivially. Only one e2e spec exists. Both tiers are scaffolded but not populated; add a spec or pass `--passWithNoTests` before relying on `test:all` in CI.

One behavior worth knowing before running tests against a shared database: `UserSeedService.seedIfEmpty()` **truncates `user`, `role_permission`, `user_role`, `refresh`** whenever `NODE_ENV=test`, then reseeds — never point `config.test.yaml` at a database you care about.

`pnpm test:e2e`/`test:integration` connect to whatever `config.test.yaml` points at (`localhost:5432`/`localhost:6380` by default) — that is **not** the same Postgres/Redis the Docker Compose stack exposes (`docker/.env` commonly remaps those to different host ports, e.g. `5440`/`6390`). Point `config.test.yaml` at a real local Postgres/Redis (or temporarily re-map Compose's ports to match) before relying on these commands outside CI.

## Deployment

`docker/docker-compose.yaml` defines the full local/production-shaped stack:

| Service      | Image                    | Purpose                                    |
| ------------- | --------------------------- | ---------------------------------------------- |
| `postgres`     | `postgres:17-alpine`        | primary database                                |
| `redis`        | `redis:8-alpine`            | BullMQ queues + captcha pool                    |
| `minio`        | `minio/minio`               | S3-compatible object storage                    |
| `minio-init`   | `minio/mc`                  | one-shot bucket creation + versioning           |
| `mailpit`      | `axllent/mailpit`           | local SMTP catcher + web UI (dev/test only)     |
| `backend`      | built from `docker/backend.Dockerfile` | the API itself                       |

The backend image (`docker/backend.Dockerfile`) is a two-stage build (build → slim `node:22-alpine` runtime). Its container command runs migrations before starting the server: `node apps/backend/scripts/migrate.cjs && node dist/apps/backend/main.js` — **migrations apply automatically on every container start**, so a fresh deploy never needs a manual migration step.

Steps for a real deployment:

1. Copy `config.production.yaml.example` → your production config; mount it wherever `CONFIG_FILE` points (see `docker-compose.yaml`'s `backend.volumes` for the pattern).
2. Provide every `${VAR:?...}` referenced in that file as a real secret — the app **refuses to boot** if any required one is missing (fail-fast by design, not a runtime surprise).
3. Set `host.environment: production`, `auth.cookies.*.secure: true`, `auth.cookies.*.sameSite: strict`, `auth.csrf.enabled: true`.
4. Set real `swagger.user`/`swagger.password` (Basic Auth in front of `/api/docs`) or disable Swagger entirely in production.
5. Point `s3.*` at your real object storage and `mailer.*` at a real SMTP relay — both modules silently no-op without them, which is fine for a demo but not for production.
6. `docker compose --env-file docker/.env -f docker/docker-compose.yaml up -d` (or run the built image directly against your own Postgres/Redis/S3).

## Dependencies

Package management is **pnpm** (via Corepack, pinned in `package.json#packageManager`). Override and build-script configuration lives in `pnpm-workspace.yaml`: `overrides` forces specific versions for transitive dependencies (pnpm's equivalent of Yarn's `resolutions`), and `allowBuilds` is an explicit allowlist of packages permitted to run native/postinstall build scripts — a pnpm 11 security feature that silently skips unlisted packages.

Dependencies track their latest published version, with the following exceptions:

| Package              | Pinned at | Reason                                                                 |
| --------------------- | --------- | ------------------------------------------------------------------------ |
| `sonic-boom`           | `^4.2.0`  | `pino@10` depends on `sonic-boom@^4.0.1` internally, and the custom GELF transport (`utils/pino-gelf.mts`) constructs `SonicBoom` directly; kept aligned with pino's own dependency rather than ahead of it. |
| `@swc/cli`             | `^0.7.10` | Not used by the build or test pipeline (`nest build` compiles via `tsc`, tests run via `ts-jest`); the 0.8 line was not taken since 0.x version bumps are semver-breaking by convention. |

Two dependencies were removed rather than upgraded:

- **`uuid`** — v12+ releases are ESM-only and do not `require()` from this project's CommonJS build output. The only usages (`uuid.v4()` for refresh-token JWT IDs and CSRF tokens, and the `NIL` constant) were replaced with `node:crypto`'s `randomUUID()` and a literal string.
- **`@golevelup/ts-jest`** — declared in `package.json` but not referenced anywhere in the codebase; removed.

Two upgrades required source changes beyond the version bump:

- **`@casl/ability` 6→7** removed the `PureAbility` export in favor of a single `Ability` class. `CaslAbilityFactory` builds on `Ability` instead; behavior is unchanged.
- **TypeScript 5→6** removed `baseUrl` (path aliases already resolve relative to the config file without it), requires `"ignoreDeprecations": "6.0"` to keep `esModuleInterop: false`, and requires an explicit `rootDir` alongside `outDir` in `apps/backend/tsconfig.app.json`.

Two pre-existing defects, unrelated to any specific dependency version, were also identified and fixed: a phantom `jsonwebtoken`/`ms` dependency (imported in source but never declared in `package.json`, working previously only because Yarn's flat `node_modules` hoisted them), and an incorrect relative import path in `mail/infrastructure/services/mail.service.ts` that caused template-file-fallback emails (any template without DB-stored content, e.g. the welcome email) to fail silently.

## Roadmap

- Third-party OAuth login (Google, Yandex — VK deferred pending its VK ID/OAuth2+PKCE migration) as an additional entry into the existing `AuthServiceAdapter`/cookie session flow, alongside password and magic-link login.
