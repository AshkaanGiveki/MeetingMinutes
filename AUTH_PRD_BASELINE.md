# Auth PRD Implementation Baseline

## Existing product preserved

The repository remains a meeting-management application. The auth implementation is additive: meeting workflows, minutes, signature collection, sealing, archive/PDF/certificate behavior, notifications, Telegram actions, AI assistance, templates, and existing data models were not removed.

## Identity and session baseline

- Users remain the durable identity record in MongoDB.
- Existing fields such as `id`, `phoneNumber`, `email`, `passwordHash`, `name`, avatar, signature, Telegram, and preferences remain compatible.
- `firstName`, `lastName`, `platformRole`, `accountStatus`, `mobileVerifiedAt`, `createdAt`, and `updatedAt` were added as migration-safe fields.
- Sessions retain the existing cookie/token model and now include platform role and project-access state.
- Protected requests rehydrate the current user, organization membership, permissions, and project access rather than trusting stale session role data.

## Access collections and indexes

- Organization membership remains the organization-level access record.
- `projects` stores project identity, host organization, manager, and status.
- `project_memberships` stores project-role assignments.
- `project_manager_eligibility` stores organization-scoped eligibility separately from project assignment.
- `organization_invitations` stores organization and project invitation state, delivery metadata, token history, and acceptance account ID.
- `mobile_change_requests` stores pending mobile transitions and recovery review decisions.
- `access_audit_logs` stores sensitive access transitions.
- Indexes cover organization/project lookup, active membership lookup, PM eligibility, mobile-change workflow, audit queries, and active-membership uniqueness.

## API surface added or changed

- OTP login and invitation acceptance endpoints.
- Controlled organization invitation creation and management endpoints.
- Project creation, details, manager transfer, internal-member management, receiving-lead/member management, PM eligibility, and project invitations.
- Mobile-change initiation, old/new OTP verification, recovery review, and completion.
- Super Admin organization administration list.
- Public self-registration and legacy token-only acceptance paths are constrained or retired where they bypass the PRD flow.

## Frontend baseline

- Authentication is OTP-only for the migrated test accounts; password login and password recovery routes return 410. Password hashes remain stored for historical rollback safety.
- Project navigation and context-aware routing were added.
- No-access users see profile/sign-out-only state.
- Profile editing changes first/last name; mobile is not an ordinary profile field.
- Invitation UI keeps the destination mobile fixed and explains reissue support.
- Organization/project invitation lists do not expose raw tokens.

## Verification baseline

- TypeScript/lint has been run during implementation.
- Existing Vitest suite has previously passed 10 files and 57 tests.
- Production Vite builds pass in the current environment; Vite reports only the existing large-bundle warning.
