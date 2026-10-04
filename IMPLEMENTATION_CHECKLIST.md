# MetaMeet Production-Readiness Implementation Checklist

This checklist tracks the work required to move MetaMeet from a UI-heavy prototype to a production-ready meeting, review, signature, archive, and notification platform.

Status legend: `[ ]` not started, `[-]` in progress/partial, `[x]` implemented and verified.

## 1. Foundation and persistence

- [ ] Define persistent MongoDB schemas for users, organizations, memberships, sessions, meetings, participants, signatures, comments, templates, audit logs, notifications, invitations, and generated documents.
- [-] Add required indexes, uniqueness constraints, timestamps, and ownership/organization fields.
- [-] Replace process-memory users and sessions with MongoDB-backed persistence.
- [-] Store meetings, templates, members, signatures, audits, and invitations durably.
- [x] Prevent sample repository data from being used as a production fallback.
- [-] Keep in-memory fallback only as an explicit development mode.
- [x] Add startup validation for core production configuration.
- [x] Add centralized error handling and structured API responses.

## 2. Authentication and session security

- [x] Remove the unauthenticated default Owner session.
- [x] Require authentication for all protected API routes.
- [x] Persist sessions securely with expiration and revocation.
- [x] Use the configured session-cookie name.
- [x] Use secure production cookie settings.
- [x] Add logout-all-sessions support.
- [x] Validate registration and email uniqueness.
- [x] Implement production-safe password reset tokens.
- [x] Send password-reset emails through the configured provider.
- [x] Make password-reset tokens single-use and expiring.
- [-] Add authentication endpoint tests.
- [x] Use stable internal user IDs with unique, changeable phone numbers for login.
- [x] Use SMS as the primary password/signature OTP channel with provider failure handling.
- [x] Add member phone-number migration/update support without changing stable user IDs.

## 3. Server-side RBAC and organizations

- [x] Add authentication middleware that resolves the current user.
- [-] Add organization and membership middleware.
- [-] Enforce permissions on meeting, participant, template, signature, archive, audit, settings, and organization routes.
- [x] Stop trusting signer identity and role fields from request bodies.
- [x] Derive identity and role from authenticated sessions or verified guest tokens.
- [-] Implement role assignment and membership APIs.
- [x] Enforce Owner/Admin restrictions.
- [-] Add authorization tests for all roles and protected routes.

## 4. Meeting lifecycle

- [x] Enforce valid state transitions on the server.
- [x] Add an explicit archive endpoint and authorization.
- [x] Prevent edits to sealed and archived meetings.
- [x] Restrict review actions to users with the review permission.
- [x] Require all signatures before sealing.
- [x] Add optimistic-concurrency protection.
- [x] Validate meeting fields server-side.
- [x] Remove client-side mutation success fallbacks for meeting, create, signature, and sealing mutations.
- [-] Add clear loading and API error states.

## 5. Participants, invitations, and contacts

- [-] Persist organization members.
- [x] Implement persistent member invitations.
- [x] Implement invitation acceptance, expiration, and cancellation.
- [x] Send real invitation emails.
- [x] Persist member removal.
- [x] Persist meeting participant assignment.
- [x] Prevent duplicate participants.
- [-] Track invitation, acceptance, signing, and removal states.
- [-] Connect Contacts UI to APIs; listing/removal/invitation are connected, acceptance UI remains.
- [x] Connect ShareModal to the email invitation endpoint.

## 6. Digital signatures and OTP

- [x] Persist one signature record per signer.
- [x] Associate signatures with authenticated users or verified guests.
- [x] Prevent duplicate signatures for authenticated users.
- [x] Add idempotency keys to authenticated signature requests.
- [x] Validate signer authorization.
- [x] Persist signature metadata and verification method on meeting records.
- [x] Secure OTP storage, expiration, attempt limits, and delivery.
- [x] Remove demo OTP exposure and hard-coded OTP acceptance in production.
- [x] Add signature verification endpoint.
- [x] Generate deterministic canonical document hashes.
- [-] Add signature security tests.

## 7. Sealing and integrity

- [x] Require complete signatures and the correct lifecycle state.
- [x] Require finalization permission.
- [x] Canonically serialize the complete document.
- [x] Include signatures and signer identities in the seal content.
- [x] Store seal metadata and hash.
- [x] Make sealing idempotent and race-safe.
- [x] Add integrity verification endpoint.
- [x] Record sealing in the append-only audit trail.
- [x] Remove local sealing fallback.

## 8. Archive, certificates, and audit trail

- [x] Load archive data from APIs.
- [x] Load meeting-specific audit records from the audit endpoint.
- [x] Remove sample audit data from production behavior.
- [x] Add audit filtering and pagination.
- [ ] Record all lifecycle, membership, signing, sealing, and verification events.
- [ ] Add audit integrity metadata.
- [x] Build a real certificate of authenticity.
- [x] Add certificate verification.
- [x] Add archive download/export actions.

## 9. PDF and document storage

- [ ] Replace browser print as the primary export.
- [x] Implement server-side PDF generation.
- [x] Include content, signatures, hash, and certificate metadata.
- [-] Store generated PDFs using the configured local storage provider; cloud provider abstraction remains.
- [x] Add authorized document download endpoints.
- [x] Add expiring download URLs where appropriate.
- [-] Track generation status and retries.
- [ ] Add PDF rendering and visual verification.

## 10. Queues and workers

- [x] Add QStash callback endpoints.
- [x] Verify QStash signatures when signing keys are configured.
- [x] Register all production handlers.
- [x] Implement real PDF generation jobs.
- [x] Implement real email and Telegram jobs.
- [x] Persist failed jobs or the DLQ.
- [x] Add retry, replay, and idempotency support.
- [x] Add queue health diagnostics.

## 11. Email integration

- [x] Complete SMTP provider implementation.
- [x] Validate email configuration.
- [-] Send invitations, signature requests, password-reset messages, and review notifications.
- [x] Escape user-provided email content.
- [x] Persist delivery status and provider IDs.
- [ ] Add email integration tests.

## 12. Telegram integration

- [x] Verify the Telegram webhook secret when configured.
- [x] Process Telegram `/link` and callback-query webhook updates.
- [x] Implement account linking and persistent chat associations.
- [x] Send a completely Persian PM with Accept, Reject, and View Website buttons.
- [x] Use a regular website URL button; no Telegram Mini App/WebApp is used.
- [x] Verify callback ownership against the linked Telegram chat and stable application user ID.
- [x] Assign the linked application user's signature to the meeting on Accept.
- [x] Audit Reject actions and prevent callback replay/duplicate signatures.
- [ ] Configure Telegram webhook URL and bot commands in deployment.

## 13. AI assistant

- [x] Validate AI requests and input limits.
- [ ] Add authentication and permission checks.
- [x] Validate structured Gemini responses.
- [x] Persist AI suggestions and conversion history.
- [ ] Label AI-generated content.
- [x] Require user confirmation before applying AI changes.
- [x] Prevent changes to sealed documents.
- [ ] Add usage limits, timeouts, and failure handling.
- [ ] Add AI tests.

## 14. Settings and notifications

- [x] Persist user notification and auto-seal preferences.
- [x] Connect profile editing to an API.
- [x] Persist notification and auto-seal settings.
- [x] Add notification API and unread state.
- [x] Replace the notification button's search-modal behavior.
- [ ] Add event-specific notification preferences.

## 15. Frontend reliability and UX

- [ ] Remove hard-coded fallback hashes, timestamps, audit records, and statuses.
- [-] Add loading, empty, error, retry, and unauthorized states.
- [ ] Refresh state from server responses after mutations.
- [ ] Hide or disable unauthorized actions.
- [ ] Disable editing for sealed and archived meetings.
- [ ] Add destructive-action confirmations.
- [ ] Add unsaved-change protection.
- [ ] Preserve RTL and accessibility behavior.
- [ ] Resolve Persian text encoding issues.

## 16. Testing and verification

- [x] Install and lock dependencies.
- [x] Pass TypeScript checks.
- [x] Pass the production build.
- [x] Pass all existing unit tests (19 tests; elevated Windows process permissions required).
- [ ] Add API integration tests.
- [ ] Add lifecycle, invitation, membership, signature, sealing, audit, queue, email, Telegram, AI, and settings tests.
- [ ] Add browser-level end-to-end tests for the complete meeting workflow.
- [ ] Add security tests for IDOR, replay, tampering, and privilege escalation.
- [ ] Add visual verification for RTL layout, certificates, and PDFs.

## 17. Production readiness

- [x] Document production environment configuration.
- [x] Remove demo OTP responses and hard-coded OTP acceptance.
- [x] Validate secrets at startup.
- [-] Configure HTTPS and secure cookies; HTTPS is deployment-owned, cookies are production-secure.
- [x] Prevent secret and OTP leakage in logs.
- [x] Add health and readiness endpoints.
- [x] Add dependency health checks.
- [x] Document backup, restore, migration, deployment, and rollback procedures.
- [ ] Add monitoring for failed jobs, email, signatures, and database connectivity.
- [ ] Perform final security and production-readiness review.
