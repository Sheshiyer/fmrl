# Remote-Safe Validation Blocker

_Last updated: 2026-03-08_

## Status
Remote-safe validation against a hosted non-production Selemene-like Supabase environment is currently **blocked**.

## What Craft Agent verified
### Supabase CLI auth
Running:
- `supabase projects list -o json`

Result:
- `Unauthorized`

### Local CLI auth state
Observed:
- no usable local Supabase CLI profile/auth state on disk

### Current Supabase source
The connected Craft source is:
- authenticated
- **read-only**
- exposed through hosted MCP with `read_only=true`

This is sufficient for schema exploration, but **not** for applying or validating remote migrations.

## Why this blocks remote-safe validation
To perform remote-safe validation, Craft Agent needs at least one of:
1. a write-capable authenticated Supabase CLI session
2. a non-production project ref or preview branch ref
3. the remote DB connection details / password for the non-production target

Without one of those, Craft Agent cannot safely:
- create or inspect preview branches
- link to a remote non-production project
- apply the drafted migrations remotely
- run hosted RLS/storage verification

## Recommended unblock path
Provide one of the following:
- authenticate Supabase CLI with a PAT
- share a non-production project ref and DB password
- share a preview branch ref for the target project

## After unblock
The next remote-safe sequence should be:
1. confirm target is non-production
2. link or target the branch/project
3. apply migrations in the approved order
4. verify RLS/storage on hosted Supabase
5. run the guarded backend smoke flow against that hosted environment
