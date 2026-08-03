---
name: talleragil-master
description: Comprehensive development guide for TallerAgil (taller-saas) — architecture, database schema, conventions, standards, and troubleshooting. Load when working on any part of this codebase.
---

# TallerAgil — Master Development Skill

> **Note on accuracy**: this document is grounded in a live codebase audit (two full-repo review passes) rather than aspiration. Where a stated "standard" isn't yet the current reality everywhere, that gap is called out explicitly instead of hidden — treat those as things to fix, not things to assume are already true.

## 1. Project overview

- **Vision**: multi-tenant SaaS for automotive repair workshops — invoicing (with Spanish VeriFactu compliance), repair orders, client and vehicle management, appointments.
- **Stack**: Next.js 16 (Turbopack), React 19, Tailwind, Supabase (Postgres + Auth + RLS), TypeScript (strict mode).
- **Architecture**: Clean Architecture (domain / application / infrastructure), applied consistently for reads, inconsistently for writes — see §3 and §15.
- **Database**: PostgreSQL via Supabase, multi-tenant via `taller_id` on every tenant-scoped table.
- **Deployment**: Railway, auto-deploys on push to `main`.

## 2. Database schema

**~28 tables** (source of truth is `supabase/migrations/`, **not** `supabase/MASTER_SCHEMA.sql` — that file is stale, see §15):

`talleres, usuarios, clientes, vehiculos, ordenes_reparacion, lineas_orden, facturas, detalles_factura, facturas_simplificadas, taller_config, taller_api_config, citas, tarifas_cliente, fotos_orden, google_calendar_tokens, google_calendar_events, api_usage, notificaciones, series_facturacion, planes, verifactu_registros, plantillas_rapidas, documentos_procesados, historial_cambios, logs_sistema_criticos, admin_logs, super_admins, uso_mensual, auditoria_facturas`

**Legacy trap**: `lineas_factura` also exists in the live DB (0 rows) — it's the pre-rename predecessor of `detalles_factura` (see commit `380d91a`). The app code uses `detalles_factura` exclusively. Don't write new code against `lineas_factura`.

**Key relationships** (all FK targets scoped by `taller_id` for multi-tenancy):
- `facturas.cliente_id → clientes`, `facturas.vehiculo_id → vehiculos` (nullable — added for the vehicle-linkage feature), `facturas.orden_id → ordenes_reparacion`, `facturas.matricula` (nullable TEXT — free-text plate when no `vehiculo_id` is linked; only ever set when `vehiculo_id IS NULL`)
- `ordenes_reparacion.{cliente_id, vehiculo_id} → clientes, vehiculos`
- `citas.{cliente_id, vehiculo_id, orden_id} → respective tables`
- `usuarios.taller_id → talleres`, `usuarios.auth_id → auth.users` (Supabase Auth)

**RLS**: enabled on every tenant table. The standard policy shape is `USING (taller_id = get_my_taller_id())`, where `get_my_taller_id()` is a `SECURITY DEFINER` function resolving `taller_id` from `usuarios WHERE auth_id = auth.uid()`. **Caveat**: RLS coverage for `detalles_factura` and `facturas_simplificadas` lives in separate later migration files, not in `MASTER_SCHEMA.sql` — always check `supabase/migrations/` directly when verifying RLS on a table, don't trust the master file alone.

**Indexes**: standard pattern is `idx_<table>_<column>` on every FK and on `taller_id` + frequently-filtered columns (e.g. `idx_facturas_vehiculo_id`, `idx_vehiculos_taller`).

## 3. Architecture patterns

- **Repository pattern**: `src/infrastructure/repositories/supabase/*.ts`, one per entity, implementing a port interface from `src/application/ports/*.ts`. Repositories map Supabase rows to domain entities — no raw `PostgrestError` or query-builder types should leak into a repository's return type.
- **Use cases**: `src/application/use-cases/<module>/*.ts`, one class per operation (e.g. `ListarFacturasUseCase`), constructor-injected with a repository interface (not a concrete class). This is genuinely respected — zero use-cases import Supabase or infrastructure directly.
- **DTOs**: `src/application/dtos/*.ts`, Zod schemas + inferred types. **Known type-modeling quirk**: schemas with `.default(...)` (e.g. `sortBy`, `page`, `pageSize`) produce an inferred type where that field is *required* for TypeScript callers, even though Zod would happily default it at runtime if omitted. Every caller of a `listarXAction` must pass every defaulted field explicitly, or TypeScript will error. This has bitten real work this session (adding a new defaulted `sortBy` field broke an unrelated caller elsewhere) — when adding a new defaulted DTO field, grep for every caller of the corresponding action first.
- **Entities**: `src/domain/entities/*.ts`, pure domain models with `.toDTO()` methods. Domain layer has zero outward dependencies (verified via import grep) — never add one.
- **RLS + application-level filtering, both**: every repository method takes an explicit `tallerId` parameter and applies `.eq('taller_id', tallerId)` in the query — this is **not** redundant with RLS, it's defense-in-depth, and existing code always does both. Keep doing both.

## 4. API conventions

**Reality, not aspiration**: naming and auth patterns are **not** uniform across the codebase — two competing patterns coexist:

| Pattern | Where | Auth |
|---|---|---|
| Server Actions (`'use server'` → use-case → repository) | Most *listing/reading* flows | `obtenerUsuarioConFallback()` or `getAuthenticatedUser()` inside the action |
| Ad-hoc API routes (`src/app/api/**/route.ts`, direct Supabase calls, no use-case) | Most *creating/mutating* flows | Inconsistent — some use `getAuthenticatedUser()` (`src/lib/auth/middleware.ts`), most (18 of 28 route files) hand-roll an identical inline `supabase.auth.getUser()` check, and **one confirmed route has no auth check at all** (`api/facturas/desde-orden/route.ts` — trusts `taller_id` from the request body) |

**Standard to converge on** (not yet universal): use `getAuthenticatedUser()` / `isAuthError()` / `authErrorResponse()` from `src/lib/auth/middleware.ts` for every new API route, don't hand-roll the check.

Endpoint naming is closer to `/api/<resource>/<action>` for facturas (`facturas/crear`, `facturas/emitir`, `facturas/generar-pdf`) but plain REST-method-based for vehiculos/clientes (`GET/POST/PATCH /api/vehiculos`). Match whichever pattern the resource already uses; don't mix both within one resource.

**Validation**: Zod schemas exist and are used properly in the use-case layer (`FiltrosFacturaSchema.safeParse(...)` etc.). The API-route write path mostly does **not** use Zod — it destructures `body` and applies inline `|| null` fallbacks. Not a hard rule violation since these routes were never built against the DTO layer, but new write-path code should prefer defining a Zod schema over inline destructuring.

**Error handling**: `SupabaseErrorMapper` (`src/infrastructure/errors/`) is the correct error-mapping layer and is used in ~73% of `src/actions/` files. It is used in **zero** API-route write-path files, which instead pass raw `error.message`/`error.code` straight to the client — in at least one case (`facturas/crear/route.ts`) also echoing the entire failed insert payload back. Low real-world severity for an internal tool, but new code should route through `SupabaseErrorMapper`, not raw passthrough.

## 5. Frontend patterns

- `'use client'` at the top of any interactive component (forms, selectors with local state).
- Server actions (`src/actions/**`) for server-side reads that don't need a full API route.
- State: plain React hooks (`useState`/`useEffect`/`useMemo`). No global state library in use — `TallerContext` (`src/contexts/`) is the one shared client-side context, for `taller_id`/session.
- Component structure: `src/components/<feature>/ComponentName.tsx` — **mostly** consistent, with two known exceptions: `ConfirmacionFacturaModal` lives at `src/components/facturas/` (not `src/components/dashboard/facturas/`) and `editar-orden-sheet.tsx` similarly at `src/components/ordenes/`. Don't add a third exception; new components go under `src/components/dashboard/<feature>/`.
- Forms: controlled inputs + `useState`, validated inline (not react-hook-form as a rule, though `@hookform/resolvers` is a dependency — check the specific form before assuming a pattern).
- **Known anti-pattern to not repeat**: `src/app/dashboard/facturas/nueva/page.tsx` is 933 lines — form state, client quick-create, vehicle selection, line-item CRUD, and submit orchestration all in one component. Don't grow a page component past a few hundred lines; extract sub-components (picker/editor/orchestrator) as it grows.

## 6. Styling guide

- Tailwind, utility-first. Primary action color is `sky-600`/`sky-700` (hover), used consistently across all four main modules.
- **Two incompatible page-shell systems currently coexist**: facturas/clientes use a plain desktop card layout (`space-y-6`, `<Card>`-wrapped filters); órdenes/vehículos use a mobile-first layout (`min-h-screen bg-gray-50 pb-24 sm:pb-8`, sticky header, filter chips). When building a new list page, pick one deliberately rather than defaulting to whichever you copy from — ideally converge toward the mobile-first pattern since it's the more complete one.
- shadcn/ui-style primitives live in `src/components/ui/`.
- PDF-specific colors are centralized in `src/lib/facturas/pdf-theme.ts` — `PDF_VEHICLE_THEME` (fixed neutral gray, intentionally brand-independent) and `PDF_BRAND_THEME_DEFAULT` (fallback for `taller_config.color_primario`/`color_secundario`, which are the *actual* per-taller configurable brand colors, set via the Ajustes UI). Never hardcode a new color literal in `pdf-generator.tsx` — add it to `pdf-theme.ts`.

## 7. Naming conventions

- Files: kebab-case (`vehiculo-selector.tsx`) — **mostly** consistent; some older files use PascalCase filenames (e.g. `VehiculoSelector.tsx`, `NuevoVehiculoModal.tsx` both exist as PascalCase). Match the existing file's casing when editing; use kebab-case for genuinely new files.
- Components: PascalCase (`VehiculoSelector`).
- Functions/variables: camelCase.
- Constants: `UPPER_SNAKE_CASE` (`DEFAULT_IVA`, `ESTADOS_FACTURA` in `src/lib/constants.ts`) — exists and is correctly used in the use-case layer, but the API-route write path frequently uses raw string/number literals instead (24 raw `'borrador'`/`'emitida'`/etc. literals, 7 hardcoded `21`s for IVA, found in `src/app/api/**`) rather than importing the constant. Prefer the constant in new code.
- Database columns: `snake_case` (`cliente_id`, `created_at`, `fecha_emision`).
- Types/DTOs: PascalCase, DTO suffix for application-layer transfer objects (`FacturaListadoDTO`, `VehiculoSeleccionado` for a smaller UI-local shape).

## 8. Code quality standards (target, with current gaps noted)

- **TypeScript strict mode**: ON (`tsconfig.json`). **Current gap**: 241 occurrences of `: any`/`<any>`/`as any` across `src/`, concentrated in `app/` (50), `actions/` (30), and `components/` (24) — i.e. concentrated exactly where the architecture is weakest, not in `domain/`/`infrastructure/` (1 each). Don't add new `any` in these areas; the correct DTO type usually already exists elsewhere in the same file.
- **Function length target**: aim small, single-responsibility. **Current reality**: several repository `listar()` methods run 96-171 lines doing filter-building + sorting + pagination + shaping in one method (`orden.repository.ts::listar()`, `factura.repository.ts::listar()`). `desde-orden/route.ts` is a single 360-line function. Don't add a 5th long `listar()` — extract filter-building into a helper if you're touching one of these.
- **Error handling**: wrap async operations in try/catch; log with `console.error`; map errors through `SupabaseErrorMapper` in the actions layer.
- **Logging**: no enforced `[MODULE]` prefix convention currently exists in the codebase — this session used ad-hoc bracketed tags (`[facturas/crear]`, `[VehiculoSelector]`) for temporary debug logging, which were all removed before merging (debug logs should never survive to a commit). If adopting a permanent prefix convention going forward, do it project-wide in one pass, not file-by-file.
- **Comments**: explain WHY, not WHAT — this is genuinely followed in most of the codebase (including this session's additions), keep doing it.
- **No dead code**: current known dead code is inventoried in §15 — don't let it grow; when you find a route/action with zero callers, delete it rather than leaving it "just in case."

## 9. SOLID principles — current adherence

- **S**: violated in the large repository `listar()` methods (§8). Followed everywhere else checked.
- **O**: `src/lib/constants.ts`'s lookup-array pattern (`ESTADOS_ORDEN`, `ESTADOS_FACTURA` — arrays of `{value, label, color, icon}`) is genuinely open for extension: a new estado is a one-line array addition, no logic changes elsewhere. **This session's `sortBy` implementation did not follow this pattern** — it's a `switch` statement inside each repository, meaning a new sort option requires editing repository code. If extending sortBy again, consider migrating to a lookup-table of `{value, column, ascending}` instead.
- **L**: no violations found — repository implementations honor their port interfaces.
- **I**: port interfaces (`IFacturaRepository`: 10 methods, `IClienteRepository`: 9, `IVehiculoRepository`: 11) are entity-scoped and reasonably focused. Not a current pain point.
- **D**: genuinely respected in the use-case layer (zero direct Supabase/infrastructure imports, verified). The API-route write path sits outside this by construction — it's a separate, undisciplined path, not a DI violation within the disciplined one.

## 10. Testing strategy

**Current state**: `src/tests/` has exactly 4 files — `setup.ts`, `ocr/matricula-patterns.test.ts`, `utils/formatters.test.ts`, `api/validation.test.ts`. **Zero tests exist for any use-case, repository, or server action**, despite use-cases being constructor-injected specifically to be mock-friendly. Tool: **Vitest** (`npm run test` / `test:run` / `test:coverage`), already configured — no tooling setup needed, just tests.

Target structure going forward:

**Unit tests** (highest-leverage, currently-empty gap):
- Pure functions with zero I/O — concrete untested candidates identified: `calcularHuellaFS()` (`api/facturas/rapida/route.ts`, pure SHA-256), `traducirMetodoPago()` (`generar-pdf/route.ts`, pure lookup), the IVA/total calculation logic currently embedded in `nueva/page.tsx`'s submit handler (extract to a pure function first, then test it).
- Use cases with a mocked repository (the constructor-injection pattern makes this straightforward — nothing structural is blocking this, it's simply not been done).

**Integration tests**:
- API routes against a real (test) database.
- Repository queries against real Supabase.

**E2E tests**: Playwright is not currently set up in this project — would be new tooling, not an extension of anything existing.

**Realistic target**: given the current 0% baseline on business logic, treat "70% coverage on critical paths" as a multi-phase goal, not a single PR — start with the pure-function candidates above (cheapest, highest immediate value) before attempting use-case or integration coverage.

## 11. Code review checklist

- [ ] `npm run type-check` passes with no new errors (8 pre-existing, unrelated errors exist as of this writing — know the baseline before you check, don't chase pre-existing ones in an unrelated PR)
- [ ] `npm run build` passes
- [ ] No new `any` types introduced without a specific reason (generic coercion utilities are the one legitimate case seen in this codebase; "avoiding a type error" is not)
- [ ] New code that touches a defaulted Zod DTO field checked against every existing caller (see §3 DTO gotcha)
- [ ] New API routes use `getAuthenticatedUser()`, not a hand-rolled auth check
- [ ] New write-path code routes errors through `SupabaseErrorMapper`, not raw `error.message` passthrough
- [ ] No `console.log` debug statements left in (this session added and removed several — always grep for your own debug tags before committing)
- [ ] RLS/`taller_id` filtering applied explicitly in any new repository method, not assumed from RLS alone
- [ ] No N+1 query patterns
- [ ] Mobile-responsive if touching a page component (check which of the two layout systems, §6, the page already uses)
- [ ] Live-tested against real data where the change touches persistence — this session's most reliable debugging technique was a real insert/fetch/render, not code review alone; prefer it over assuming code is correct

## 12. Deployment checklist

**Before pushing to `main`**:
- [ ] Feature branch built and type-checked locally
- [ ] No console errors from a manual smoke test
- [ ] Commit messages are descriptive, follow the format in §18
- [ ] Any schema migration has been applied to the live DB *before* the code that depends on it is merged (this session: the `facturas.matricula` column was applied manually via the Supabase SQL editor before the dependent code was written)

**Before a schema-changing merge specifically**:
- [ ] Manual backup taken (`/Users/dani/Documents/DEV/BACKUPS/`, pattern: `backup_YYYYMMDD.sql` + per-table JSON — see the script approach used this session, not currently saved as a reusable script but easy to recreate: fetch all rows per table via the service-role client, write both JSON and generated `INSERT` statements)
- [ ] Migration file added under `supabase/migrations/` with a `YYYYMMDD_description.sql` name, matching existing convention

**Railway**: auto-deploys on push to `main`. No separate manual deploy step observed in this session — the deploy is the push.

## 13. Common patterns & solutions

**Pattern 1 — new API endpoint** (write-path style, matching current majority convention):
```
1. Destructure + validate request body (prefer a Zod schema for new code)
2. getAuthenticatedUser() for auth — do not hand-roll
3. Build the Supabase query, always .eq('taller_id', ...) explicitly
4. Map/handle errors through SupabaseErrorMapper
5. Return NextResponse.json(...)
```
Example to follow: `src/app/api/facturas/rapida/route.ts` (has both Zod-adjacent validation and `getAuthenticatedUser()`).
Example to avoid replicating: `src/app/api/facturas/desde-orden/route.ts` (no auth check, 360-line single function).

**Pattern 2 — new API endpoint, Clean-Architecture style** (matches the *read* path, and the dead-but-correct `crearBorradorFacturaAction`):
```
1. Define/extend a Zod schema in src/application/dtos/
2. Add a method to the port interface in src/application/ports/ if new
3. Implement it in the Supabase repository in src/infrastructure/repositories/supabase/
4. Add/extend a use-case in src/application/use-cases/
5. Expose via a server action in src/actions/
```
This is the architecturally correct pattern and should be preferred for **new** resources — don't add a 3rd resource to the ad-hoc-API-route pile if you can help it.

**Pattern 3 — adding a form to the UI**:
```
1. useState for form fields
2. Inline validation or a Zod schema shared with the backend
3. Submit handler → fetch() to the API route or a server action
4. toast.success()/toast.error() (sonner) for feedback
```

**Pattern 4 — database join + filtering** (as done in `factura.repository.ts::listar()`):
```
.from(table).select('*, related:foreign_key(*)', { count: 'exact' })
.eq('taller_id', tallerId)   // always, explicitly
.eq(...)                      // other filters, conditionally chained
.order(column, { ascending })
.range(from, to)              // pagination
```

## 14. Troubleshooting guide

| Problem | Likely cause / first check |
|---|---|
| RLS returns empty results | Check `taller_id` filtering in the query *and* confirm the calling user's `usuarios.taller_id` actually matches the data's `taller_id` — don't assume the auth session context is what you expect; verify with a real query. |
| A search/filter feature returns nothing for valid data | Check whether a filter is unintentionally *exclusive* rather than a ranking hint — this was the actual root cause of a real bug this session (`/api/vehiculos` excluded vehicles not pre-linked to the selected client instead of just ranking them lower). |
| Type errors with `any` | Check if the correct DTO type already exists elsewhere in the same file before reaching for `any` — in this codebase it usually does. |
| API route 500 error | Check the terminal running `npm run dev` (server-side logs never appear in the browser console — a real point of confusion this session). Add a temporary log, reproduce, remove the log before committing. |
| A form field's value isn't reaching the backend | Trace the exact chain: does the component's `onChange` actually fire on the interaction you expect (e.g. does clicking a dropdown suggestion fire it, or only typing)? Verify with a live browser test, not just code reading — this session spent significant effort before finding the real gap was a search filter, not the form wiring, which required live DB queries to prove. |
| Uncertain whether a claimed bug is real | Reproduce with a live insert/fetch against the actual DB (using the service-role key from a throwaway Node script) before trusting either "it's broken" or "it's already fixed" — both were asserted incorrectly multiple times this session until live data settled it. |

## 15. Tech debt & improvements

**Current issues** (from the two audits this session):
- Write path (API routes) bypasses the Clean Architecture use-case layer — already caused a real bug.
- 241 `any` types, concentrated in `app/`, `actions/`, `components/`.
- Dead server actions: `crear-borrador-factura.action.ts`, `crear-borrador-desde-orden.action.ts`, `emitir-factura.action.ts`, `obtener-factura.action.ts` (all confirmed zero callers).
- Dead API routes: `clientes/eliminar`, `ordenes/clientes`, `factura/lineas/agregar`, `factura/lineas/obtener`, `diagnostico`, `ocr/process`, `image/proxy`, `taller/usuarios`, plus the 4 `DISABLED_*`-prefixed routes and one leftover `.bak` file (`DetalleOrdenSheet.refactored.tsx.bak`) and one leftover `DISABLED_backup_old/` directory.
- `~0% test coverage` on the use-case/repository/action layer specifically (not literally 0% overall — 3 real test files exist for OCR patterns, formatters, and validation utilities).
- `supabase/MASTER_SCHEMA.sql` is stale — still shows `lineas_factura` as canonical, missing RLS policies that live in later migration files only.
- No email/notification infrastructure exists at all (the only outbound notification is one hardcoded, fire-and-forget Telegram call in `facturas/emitir/route.ts`).

**Quick wins (1 day each)**:
- Remove the dead actions/routes/`.bak` file/`DISABLED_*` remnants listed above.
- Add the missing auth check to `desde-orden/route.ts`.
- Swap hand-rolled auth blocks for `getAuthenticatedUser()`.
- Replace raw estado/IVA literals with the existing enum/constants.
- Extract the 3 duplicated sort `<select>` blocks (facturas/clientes/vehículos pages) into one shared component.

**Medium effort (3-5 days)**:
- Break the long repository `listar()` methods into filter/map helper functions.
- Split `nueva/page.tsx` into sub-components.
- Reconcile `MASTER_SCHEMA.sql` against actual migrations.
- Add unit tests for the identified pure-function candidates + a first use-case.

**Long-term / higher-risk**:
- Retire `facturas/crear/route.ts`'s duplicated logic in favor of the already-built `crearBorradorFacturaAction` → `CrearBorradorFacturaUseCase` path. Highest-leverage fix on this whole list, also the riskiest since it changes the live invoice-creation flow — do this with the same live-data-verification discipline used throughout this session, not code review alone.
- Build email notification infrastructure from scratch (no existing code to extend).
- Wire the already-working Google Calendar backend into the Citas UI (backend risk already retired, this is UI-only work).

## 16. UX/design guidelines

**Current state**: functional, Tailwind-consistent color usage (`sky-600` primary throughout), órdenes/vehículos are mobile-responsive by design; facturas/clientes are desktop-oriented with breakpoints added on top rather than mobile-first. No dark mode, no formal design system, no accessibility audit performed (a quick scan found `<select>`/`<input>` elements without explicit `aria-label`/`htmlFor` pairing in several places, including this session's own additions).

**Future improvements** (not yet started, no code to reference): formal design system/typography scale, WCAG 2.1 audit, dark mode, consolidating the two page-shell systems into one.

## 17. Branch strategy

**As actually observed in this repo** (verified via `git branch -a`):
- `main` — production, Railway auto-deploys on push.
- `develop` exists (local + remote) but this session's entire workflow branched directly from and merged directly to `main` via `feature/facturas-mejoras-final` — `develop` was not used. Treat it as effectively deprecated unless the team decides otherwise; don't assume it's part of the active workflow without checking with whoever maintains it.
- Feature branches: `feature/<name>` (e.g. `feature/facturas-mejoras-final`, `feature/dashboard-real-data`, `feature/fixes-crear-orden` — all present in the repo). Branch from `main`, merge back to `main`.
- A number of `claude/*`-prefixed remote branches exist from prior AI-assisted sessions (`claude/fix-critical-bugs-features-pIejP`, `claude/refactor-saas-architecture-5fW7k`, etc.) — these appear to be historical, not part of the active workflow; verify before building on one.
- Hotfix branches: `hotfix/<issue-name>`, for production bugs only, per the user's stated convention (not yet observed in actual repo history, but a reasonable convention to adopt going forward).

## 18. Commit message format

Observed and confirmed convention from this session's actual commits: `<type>(<scope>): <description>`, e.g. `fix(facturas): vehicle search no longer excludes unlinked vehicles`, `feat: add sort dropdown to facturas, clientes and vehiculos lists`, `refactor(facturas): merge matrícula fields into one smart input`. Scope in parentheses is common but not universal (a few commits omit it, e.g. `refactor: make PDF colors configurable...`).

Types in active use: `feat`, `fix`, `refactor`, `style`, `chore`. `docs`/`test` types are conventional additions, not yet observed in this repo's actual history but reasonable to adopt.

Every commit this session ended with a `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>` trailer — continue this convention for AI-assisted commits.

## 19. Version control workflow

1. Create feature branch from `main`.
2. Implement, with live-data verification for anything touching persistence (not just `type-check`/`build` — this session's repeated lesson).
3. `npm run type-check` and `npm run build` — both must pass, and check the diff against the known 8 pre-existing errors so you're not chasing unrelated ones.
4. Manual testing, ideally against real data via a throwaway script using the service-role key (see `.env.local` for `SUPABASE_SERVICE_ROLE_KEY`) when browser access isn't available.
5. Commit with a descriptive message (§18 format).
6. For schema changes: create the migration file, apply it manually (or via Supabase CLI if linked), verify live before writing dependent app code.
7. Push to origin.
8. Merge to `main` (this session merged directly without a formal PR review step — adjust if your team requires PR review).
9. Railway auto-deploys from `main`.

## 20. Skill maintenance

Update this document:
- After any feature that establishes a new pattern (add it to §13).
- After any bug fix whose root cause wasn't obvious (add it to §14).
- After any audit finds new tech debt (update §15 — don't let it silently grow stale).
- When a "current gap" noted here (any `any` count, dead-code list, test coverage) actually gets fixed — remove the caveat, don't leave stale warnings once they're resolved.
