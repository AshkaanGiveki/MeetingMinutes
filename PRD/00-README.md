# Accord — Ordered Development PRD Pack

Version: 1.1 | October 21, 2026

## Development Order

Each numbered PRD is one development phase. Complete its exit gate before moving to the next. These are incremental delivery phases, not four independent products.

| Order | PRD | Deliverable |
|---|---|---|
| 1 | [Foundation, Organizations, and Authorization](01-foundation-organizations-authorization.md) | Shared identity/membership model, organization administration, scoped authorization, continuity and audit foundations. |
| 2 | [Invitations, Account Activation, and OTP Login](02-invitations-onboarding-otp-login.md) | Invite by SMS or Copy Link, queue, verified activation, account reuse, OTP authentication, minimal no-access shell. |
| 3 | [Project Membership, User Management, and Context Navigation](03-project-membership-user-management-navigation.md) | Internal users, projects, execution/receiving members, role transfers, context selectors and management UI. |
| 4 | [Profile, Mobile Number Change, and Recovery](04-profile-mobile-change-recovery.md) | Profile editing and verified account-wide login-number changes/recovery. |

## Integration and Release Rules

- Phase 1 is a development foundation, not a public self-registration release. Bootstrap the first Super Admin through a controlled process; use existing accounts/test fixtures until Phase 2.
- Phase 2 can onboard Organization Admins and internal members; project-specific invitation UI and complete project navigation become available with Phase 3. Do not enable unfinished project routes merely because the invitation engine supports their scope.
- The shared foundation defines complete role and project contracts up front so Phase 2 never needs unscoped invitations.
- Phase 2 implements first/last-name collection during onboarding; Phase 4 implements subsequent self-service profile changes and mobile recovery. The profile-only shell is available earlier.
- OTP login rollout requires safe migration of existing password accounts. Do not lock existing users out while switching authentication.
- User-management UI in Phase 3 uses the same permission checks and invitation engine; it does not create a competing account-provisioning flow.
- No role or membership removal closes an account. Re-evaluate authorization on protected requests.

## Preservation and Traceability

Both prior PRDs have been fully retained across this pack. Original numbered sections, scenarios, permission tables, assumptions, launch defaults, and complete acceptance slices are preserved, not summarized. Numbering is intentionally retained for traceability; source headings may restart within a phase.

| Original material | Current location |
|---|---|
| Roles sections 1–8, 12–14 | Phase 1 |
| Roles acceptance slices 1 and 7 | Phase 1 |
| Roles sections 9 and 11; acceptance slices 2–6 | Phase 3 |
| Identity sections 1–5 | Phase 1 shared contract |
| Identity sections 6–7, 11–14; acceptance slices 1–4 and 7 | Phase 2 |
| Identity section 9; acceptance slice 5 | Phase 3 |
| Identity section 8; acceptance slice 6 | Phase 4 |

Acceptance IDs use **R-AC** for the roles source and **I-AC** for the identity source. The original bodies retain AC labels; always qualify them in tickets, for example R-AC-3.4 or I-AC-2.4. New Copy Link criteria use I-COPY IDs.

Original references to a future identity PRD now resolve to Phases 2 and 4. References to the companion roles PRD resolve to Phases 1 and 3. Original program-wide definitions of done and scenario catalogs remain for context; each file's phase boundary and exit gate define its delivery scope.

## Changes Added in This Edition

1. SMS is one invitation distribution channel, not a prerequisite. Copy Link and copy-only invitation creation are required. Phase 2 defines lifecycle, clipboard behavior, and acceptance criteria; Phase 3 exposes them at each authorized invitation entry point.
2. Guest users are acknowledged as a future distinct capability only. Their specification will be provided later; no permissions or onboarding behavior are inferred.
3. Development ownership and dependency order are explicit. No prior business rule or acceptance criterion was dropped.

## Decisions Still Requiring Review

Preserve the original review items: automatic content visibility for administrators, same-project execution/receiving overlap, Organization Admin cardinality and last-admin continuity, OTP/invitation durations and rate limits, SMS reporting, session duration, migration conflicts, and recovery evidence. Proposed values are recommendations rather than approved product decisions. Detailed operational document/project permissions remain future PRDs.

## Pack Completion

The program is complete when all four phase exit gates and their assigned acceptance criteria pass, cross-phase scenarios work end to end, Copy Link and SMS enforce identical access rules, and all launch-blocking decisions have been resolved. Guest behavior remains explicitly deferred.