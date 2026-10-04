# Organization-Based Access Model Checklist

## Foundation

- [x] Replace global user role/organization fields with organization memberships.
- [x] Add organizations collection and organization CRUD APIs.
- [x] Add membership permissions and active-organization session context.
- [x] Add organization invitation records and lifecycle states.
- [x] Add organization switcher and invitation center UI.

## Meeting access

- [x] Add meeting-specific member assignments and capabilities.
- [x] Add organization visibility policies for meetings.
- [x] Enforce organization membership on every meeting query.
- [x] Enforce meeting access on view, edit, review, share, sign, seal, archive, PDF, AI, and audit endpoints.
- [x] Prevent cross-organization template/member/notification access.

## Workflows

- [x] Implement organization creation and first-owner enrollment.
- [x] Implement invite by phone/email, accept, reject, cancel, expire, and leave organization.
- [x] Implement meeting participant/assignment management.
- [x] Update Telegram notifications and signature actions to use meeting assignments.
- [x] Update external guest links to be meeting-scoped and capability-scoped.
- [x] Update frontend to use active organization and meeting access state.

## Data and migration

- [x] Migrate seeded users, organizations, memberships, invitations, and meeting assignments.
- [x] Remove obsolete global role/organization assumptions.
- [x] Add MongoDB indexes and idempotent migration/seed behavior.

## Verification

- [x] Add authorization tests for organization and meeting isolation.
- [x] Test invitation and organization switching flows.
- [x] Test Telegram/signature access rules.
- [x] Run lint, tests, build, and production smoke checks.
- [ ] Push the completed implementation to `main`.
