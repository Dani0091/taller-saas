# TallerAgil — Development Checklist

> Companion to `SKILL.md`. Read that first for the *why* behind each item — this file is the quick-reference checklist to run through on every change.

## Pre-development

- [ ] Read `SKILL.md` §1-3 if unfamiliar with the module you're touching
- [ ] Understand feature requirements — for anything touching facturas/vehículos/clientes CRUD, confirm whether it should be a new API route (majority convention) or a new Clean-Architecture use-case (correct convention, preferred for genuinely new resources — see `SKILL.md` §13)
- [ ] Check database schema impact — if adding a column, check `supabase/migrations/` directly, not `MASTER_SCHEMA.sql` (stale)
- [ ] Plan branch strategy — branch from `main`, name `feature/<name>`

## During development

- [ ] Follow naming conventions (`SKILL.md` §7) — match the casing of the file you're editing if it's inconsistent with the stated convention
- [ ] Keep functions small and single-responsibility — if you're about to add logic to an already-90+-line `listar()`, extract a helper instead
- [ ] Add error handling — try/catch async operations; route through `SupabaseErrorMapper` for new write-path code
- [ ] Write tests for new pure functions — the codebase currently has ~0% coverage on business logic, don't add to that gap for new code
- [ ] No new `any` types without checking whether the correct type already exists elsewhere in the same file
- [ ] Follow SOLID — in particular, don't add a new `switch`/if-chain where a lookup-table pattern (`ESTADOS_FACTURA`-style) would be open for extension instead
- [ ] Use `getAuthenticatedUser()` for any new API route — don't hand-roll the auth check
- [ ] Explicit `.eq('taller_id', tallerId)` in any new query — don't rely on RLS alone
- [ ] Any new debug `console.log` gets a clear, greppable tag (e.g. `[module-name]`) and a mental note to remove it before committing

## Before commit

- [ ] `npm run build` passes
- [ ] `npm run type-check` passes — diff against the known baseline of 8 pre-existing, unrelated errors so you're not chasing ones you didn't cause
- [ ] Tests passing (`npm run test:run`)
- [ ] Manual testing complete — for anything touching persistence, verify against real data (a throwaway Node script with the service-role key is the most reliable method used this session, faster than repeated browser round-trips)
- [ ] No `console.log` debug statements left in — grep for your own tags before staging
- [ ] Commit message follows `<type>(<scope>): <description>` (`SKILL.md` §18)

## Before merge

- [ ] Code review approved (or, if working solo/with AI assistance, a second independent verification pass — this session's most effective pattern was live-testing a claim rather than re-reading the same code a third time)
- [ ] All checks passing (build, type-check, tests)
- [ ] No breaking changes to existing callers — especially: if you added a `.default(...)` field to a Zod DTO, grep for every caller of the corresponding action (`SKILL.md` §3 DTO gotcha) and update any that don't pass it
- [ ] Database migrations present under `supabase/migrations/` with a `YYYYMMDD_description.sql` name, if any schema change is included

## Before deploy

- [ ] Backup created if the change includes a schema migration (`/Users/dani/Documents/DEV/BACKUPS/`, pattern: full-table JSON export + generated SQL `INSERT` statements via the service-role client)
- [ ] Migration applied to the live DB *before* merging the code that depends on it, and verified live (a `select` confirming the column/table exists) — not assumed from the migration file alone
- [ ] Environment variables ready (check `.env.local`/`.env.example` for anything new the change requires)
- [ ] Healthcheck / basic smoke test after Railway's auto-deploy completes — confirm the deployed app actually reflects the change, not just that the push succeeded
