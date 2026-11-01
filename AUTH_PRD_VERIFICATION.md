# Auth PRD Verification Matrix

This is the evidence map for the implementation. It is intentionally explicit about automated evidence versus manual or environment-dependent verification.

| Requirement family | Evidence location | Verification |
|---|---|---|
| No public self-registration/org creation | `server.ts` registration and organization routes | Route-level review; TypeScript check; browser acceptance required |
| OTP login | `src/server/services/otp.service.ts`, `server.ts` OTP routes | Unit tests/service review; SMS-provider integration required |
| Fixed-mobile invitation | `InvitationView.tsx`, OTP invitation routes, organization/access services | Service review; browser acceptance required |
| Token redaction | organization/access invitation list methods and member projection | Static route review; API integration test required |
| Org/admin role separation | `auth.service.ts` effective permissions and `server.ts` permission middleware | TypeScript check; role matrix integration test required |
| PM eligibility and one active PM | `access.service.ts`, PM eligibility routes, MongoDB indexes | Service review; concurrent integration test required |
| Execution/receiving separation | access service membership checks and partial unique index | Service review; database integration test required |
| Receiving lead/member authority | access service and project routes/UI | Service review; browser acceptance required |
| Revocation without account deletion | internal-membership removal and session rehydration | Service review; revocation integration test required |
| No-access state | `OrganizationOnboarding.tsx`, `App.tsx` route guard | Browser acceptance required |
| Profile/mobile separation | `SettingsView.tsx`, profile route, mobile-change service/routes | TypeScript check; browser acceptance required |
| Mobile-change recovery | `mobile-change.service.ts` and routes | Service review; security-owner recovery test required |
| Auditability | access/mobile audit writes and existing audit chain | Database audit review and regression test required |
| Existing meeting product | unchanged meeting routes/components plus strict explicit permissions | Existing regression suite and browser smoke test required |

## Required final verification commands

```text
npm run lint
node node_modules/vitest/vitest.mjs run
npm run build
```

The build/test commands must be repeated after refreshing any broken native dependency in `node_modules`. A passing TypeScript check alone is not treated as a production-build substitute.

## Latest verification evidence

- Re-audit completed after OTP migration: 7 Atlas users have verified mobiles; OTP-only auth is active; project context, unsaved-switch warnings, and Super Admin recovery evidence capture were added.
- `npm test -- --run`: passed — 11 files, 59 tests.
- `npm run lint`: passed.
- `npm run test:browser`: passed against the running application.
- `npm run smoke:auth`: passed against the running application.
- `npm run build`: passed.

- `npm run lint`: passed after the final feature-flag, migration, masking, and project-invitation changes.
- `node node_modules/vitest/vitest.mjs run`: passed — 11 files, 59 tests.
- `npm run build`: passed after the final changes; Vite reports only the existing large-bundle warning.
- `/api/health` on the already-running application: HTTP 200.
- `/api/ready` on the already-running application: HTTP 200 with database, Redis, configuration, and queue checks healthy.
- A second development server could not be started because the existing process owns port 3000; a separate-port attempt reached the existing Vite `require is not defined` development-loader issue. This is an environment/startup issue, not a TypeScript or production-build failure.

## Explicitly dispositioned operational items

- Feature-flag controls are defined in `src/server/config/auth-flags.ts` and used by registration, OTP login, organization provisioning, project navigation, and mobile recovery routes.
- `npm run migrate:auth` is an additive, idempotent migration command. It normalizes valid legacy mobiles, backfills identity/lifecycle timestamps, and writes a migration-run report without deleting historical records.
- Production deployment, SMS-provider delivery, browser acceptance on a logged-in account, and Product Manager/security-owner sign-off require the deployment environment and authorized human reviewers. They are not silently represented as completed source-code behavior in this report.

## Isolated production-mode smoke test

Using the current source on temporary port `3001` with `NODE_ENV=production`:

- `/api/health` returned `200`.
- `/api/ready` returned `200`; database, Redis, configuration, and queues reported healthy.
- `/api/auth/me` returned `401` without a session.
- `/api/projects` returned `401` without a session.
- `/api/admin/organizations` returned `401` without a session.
- An invalid invitation token returned `404`.
- `/api/auth/register` returned `410`, confirming public registration is disabled.

The temporary server was stopped after the smoke test; the existing application process was not altered.

The reproducible smoke command is `AUTH_SMOKE_BASE_URL=http://127.0.0.1:3001 node --experimental-strip-types scripts/auth-prd-smoke.ts`; it passed against the isolated production-mode server. The equivalent `npm run smoke:auth` wrapper is present for normal environments, but this Windows session intermittently blocks `tsx`/esbuild child-process creation with `EPERM`.
