/**
 * Canonical type for entity identifiers across the codebase (domain entities, DTOs,
 * repository interfaces, command/query payloads, decorators such as `@CurrentUserId`).
 *
 * Every ID in this project is a Postgres-generated UUID (`gen_random_uuid()` / `defaultRandom()`
 * in the Drizzle schemas), represented here as a plain string.
 *
 * This is a structural alias, not a branded/nominal type — `IdType` and `string` are
 * interchangeable to the compiler, so it does not prevent passing an arbitrary string (e.g. an
 * email or a token) where an id is expected. Its value is documentation and consistency: a single
 * place to repoint every id-typed signature in the project if the underlying representation ever
 * changes (e.g. to a branded type or a numeric id).
 *
 * Shared across apps/backend and apps/auth-service.
 */
export type IdType = string;
