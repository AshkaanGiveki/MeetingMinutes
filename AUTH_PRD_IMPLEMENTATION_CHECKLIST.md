# Accord Authentication and Access PRD Implementation Checklist

## Purpose

This checklist converts the current five-file PRD pack into an executable implementation plan for the authentication, identity, organization-access, invitation, authorization, project-membership, navigation, profile, mobile-change, and recovery requirements.

The checklist is intentionally additive and compatibility-focused:

- Preserve the existing meeting-management product.
- Preserve writing minutes, meeting workflows, reviews, signatures, sealing, archives, PDFs, certificates, notifications, AI assistance, Telegram integrations, and existing operational APIs unless a later PRD explicitly changes them.
- Do not delete functionality merely because it is not mentioned in this PRD pack.
- Keep existing options when they are not forbidden by the PRD.
- Make the PRD-defined authentication and access behavior authoritative where it overlaps with current behavior.
- Keep future product areas behind existing boundaries until their own PRDs arrive.

## Status legend

- `[ ]` Not started (no unreviewed items should remain after implementation review)
- `[-]` In progress or partially implemented
- `[x]` Implemented, verified, or explicitly dispositioned with evidence
- `[~]` Reserved for newly discovered work during future PRD phases
- `[!]` Blocked by a product/security decision
- `[?]` Requires explicit product-manager confirmation

## Working rules

- [x] Treat `PRD/00-README.md` as the cross-phase integration contract.
- [x] Treat `PRD/01-foundation-organizations-authorization.md` as the foundation and authorization contract.
- [x] Treat `PRD/02-invitations-onboarding-otp-login.md` as the invitation and authentication contract.
- [x] Treat `PRD/03-project-membership-user-management-navigation.md` as the project-membership and context-navigation contract.
- [x] Treat `PRD/04-profile-mobile-change-recovery.md` as the profile and recovery contract.
- [x] Preserve the existing meeting domain as a separate capability layer.
- [x] Do not use meeting roles such as `Organizer`, `Editor`, `Reviewer`, `Signer`, or `Viewer` as substitutes for PRD organization/project roles.
- [x] Do not treat a Receiving Member, external-only account, or no-access account as a Guest User.
- [x] Keep Guest User behavior deferred unless a later PRD explicitly authorizes it.
- [x] Do not remove existing features that are outside this PRD scope.
- [x] Do not enable unfinished project routes merely because invitation infrastructure exists.
- [x] Make every authorization rule effective in the UI, direct links, API routes, background jobs, and asynchronous workflows.
- [x] Prefer additive migrations and compatibility adapters over destructive rewrites.

---

# 1. Product and architecture decisions

## 1.1 Confirm decisions before implementation

- [x] Confirm that this checklist is limited to authentication, identity, organizations, authorization, invitations, project membership/navigation, profile, mobile changes, and recovery.
- [x] Confirm that existing meeting/minutes/signature/document/Telegram/PDF/AI functionality remains in the product.
- [x] Confirm whether existing guest signing remains as isolated legacy functionality or must be hidden until a future Guest PRD.
- [x] Confirm the final cardinality rule for Organization Admins: exactly one or one-or-more.
- [x] Confirm whether a user may be on both execution and receiving sides of the same project.
- [x] Confirm whether Super Admins and Organization Admins have any default meeting/document content access.
- [x] Confirm supported countries and mobile-number formats.
- [x] Confirm OTP validity, resend cooldown, maximum attempts, daily limits, and session lifetime.
- [x] Confirm SMS provider delivery states and what can be shown to operators.
- [x] Confirm the support path for an incorrect invitation number.
- [x] Confirm mobile-recovery evidence and reviewer responsibilities.
- [x] Confirm password-account migration strategy and the date/password fallback policy.
- [x] Confirm whether existing email-based invitations remain as an additional option where not prohibited, while mobile OTP remains mandatory for PRD invitation acceptance.
- [x] Confirm the boundary between project membership and meeting membership.
- [x] Confirm which existing meeting permissions are inherited from project roles, if any.

## 1.2 Establish bounded capability layers

- [x] Define Account Identity as the permanent person record.
- [x] Define Organization Access as organization membership and organization-level roles.
- [x] Define Project Access as project-manager, execution, and receiving-side assignments.
- [x] Define Meeting Workflow Access as the existing meeting roles and permissions.
- [x] Define Operational Content Access as the future mapping between project roles and meeting/document permissions.
- [x] Ensure changes in one layer do not accidentally delete or overwrite records in another layer.
- [x] Ensure existing meeting assignments continue to work while project functionality is introduced.
- [x] Add explicit compatibility documentation for users who have organization access and meeting access but no project assignment yet.

---

# 2. Current-code baseline and inventory

- [x] Record the current API routes before changing authentication.
- [x] Record the current frontend routes and navigation before changing context handling.
- [x] Record the current MongoDB collections, indexes, and existing document shapes.
- [x] Record current user fields, especially `id`, `phoneNumber`, `email`, `passwordHash`, `name`, `avatar`, `preferences`, and signature fields.
- [x] Record current organization roles: `Owner`, `Admin`, and `User`.
- [x] Record current meeting roles: `Organizer`, `Editor`, `Reviewer`, `Signer`, `Participant`, and `Viewer`.
- [x] Record current invitation behavior, including organization invitations and meeting participant invitations.
- [x] Record all current password-login and password-reset paths.
- [x] Record all current phone-number update paths.
- [x] Record all current session creation, refresh, logout, and logout-all paths.
- [x] Record all existing meeting authorization checks.
- [x] Record all existing audit events and audit storage behavior.
- [x] Record all existing email, SMS, Telegram, Redis, QStash, and worker integrations.
- [x] Create a compatibility test account for each existing role and workflow.
- [x] Capture a baseline of `npm test`, `npm run lint`, and production build results.
- [x] Capture baseline API smoke tests for `/api/health`, `/api/ready`, and `/api/auth/me`.
- [x] Preserve a rollback point before changing authentication or membership schemas.

---

# 3. Canonical identity and data model

## 3.1 Account model

- [x] Keep the existing immutable internal user/account ID.
- [x] Add or migrate `firstName`.
- [x] Add or migrate `lastName`.
- [x] Preserve the existing combined `name` field temporarily for backward compatibility.
- [x] Define how `name` is derived from first and last name.
- [x] Keep optional profile fields such as avatar.
- [x] Keep existing signature data and Telegram associations.
- [x] Add `mobileVerifiedAt` or equivalent verification metadata.
- [x] Add account lifecycle state, for example `provisional` and `active`, without deleting existing users.
- [x] Add account creation and activation timestamps where absent.
- [x] Preserve existing email as an optional compatibility/contact field if it is not forbidden by later requirements.
- [x] Ensure mobile number is a unique normalized login identifier.
- [x] Ensure mobile number is not treated as the immutable identity key.
- [x] Ensure all mobile matching uses the same normalization function.

## 3.2 Organization model

- [x] Preserve existing organization records.
- [x] Define organization ownership/provisioning separately from ordinary organization membership.
- [x] Add a platform-level Super Admin representation.
- [x] Preserve existing `Owner` data during migration rather than deleting it.
- [x] Define mapping from legacy Owner to Super Admin, Organization Admin, or a transitional compatibility role.
- [x] Add organization status only if needed for future lifecycle decisions; do not invent deletion behavior beyond approved requirements.
- [x] Keep existing organization metadata used by meetings and templates.

## 3.3 Organization membership model

- [x] Preserve existing membership IDs and historical membership records.
- [x] Add explicit membership state: active, suspended, revoked/removed, or equivalent.
- [x] Record grant and revocation timestamps.
- [x] Record actor responsible for grant/revocation.
- [x] Separate organization membership from organization-admin assignment.
- [x] Ensure ordinary internal membership does not automatically grant all project or meeting content.
- [x] Preserve unrelated memberships when one membership is removed.
- [x] Do not delete the account when membership is revoked.

## 3.4 Project model

- [x] Add a first-class `projects` collection or equivalent repository.
- [x] Add project ID and immutable organization ID.
- [x] Add project name and required basic metadata.
- [x] Add project lifecycle fields only to the extent required by the current PRD.
- [x] Add exactly one active Project Manager assignment.
- [x] Add project creation actor and timestamps.
- [x] Prevent a project from being persisted without an active Project Manager.
- [x] Add indexes for project ID, organization ID, active manager, and membership lookups.

## 3.5 Project Manager eligibility

- [x] Add organization-scoped Project Manager eligibility records or equivalent fields.
- [x] Require the eligible person to be an active internal member of the same organization.
- [x] Keep eligibility separate from assignment to a specific project.
- [x] Record who granted or revoked eligibility.
- [x] Record grant/revocation timestamps.
- [x] Prevent eligibility in Organization A from authorizing project creation in Organization B.
- [x] Prevent eligibility revocation while active managed projects would be left without valid managers.

## 3.6 Execution membership

- [x] Add project execution-membership records.
- [x] Require execution members to be active internal members of the project organization.
- [x] Add unique constraint for project ID plus user ID.
- [x] Prevent duplicate execution memberships.
- [x] Preserve independent memberships in other projects.
- [x] Keep execution membership separate from existing meeting participant assignments.

## 3.7 Receiving membership

- [x] Add one Receiving Lead assignment per project.
- [x] Add Receiving Member records per project.
- [x] Permit receiving users without internal membership in the host organization.
- [x] Add unique constraint for project ID plus receiving user ID.
- [x] Enforce one active Receiving Lead per project.
- [x] Preserve receiving-member assignments when the lead is replaced.
- [x] Do not automatically demote a former Receiving Lead to Receiving Member.
- [x] Confirm and implement the same-project execution/receiving overlap decision.

## 3.8 Invitation model

- [x] Preserve existing invitation IDs where possible.
- [x] Add explicit scope type: organization or project.
- [x] Add explicit target organization ID.
- [x] Add optional target project ID.
- [x] Add offered PRD role.
- [x] Add normalized destination mobile.
- [x] Keep email as a compatibility field only if product approves it.
- [x] Add issuer ID.
- [x] Add creation, expiration, cancellation, acceptance, and reissue timestamps.
- [x] Add current token identifier and token rotation history without exposing raw tokens in ordinary listings.
- [x] Add invitation status: Pending, Accepted, Expired, Cancelled.
- [x] Keep delivery status separate from invitation status.
- [x] Add delivery-attempt records.
- [x] Add copy-link activity records without storing clipboard contents.
- [x] Add accepted account ID and acceptance timestamp.
- [x] Add issuer-authority validation state if useful for diagnostics.

## 3.9 OTP challenge model

- [x] Add purpose-bound OTP challenges.
- [x] Support at least login, invitation acceptance, new-mobile verification, old-mobile verification, and recovery-review verification purposes.
- [x] Store only protected/hashed OTP representations where practical.
- [x] Store normalized destination mobile.
- [x] Store account, invitation, or request reference as applicable.
- [x] Store issue, expiry, consumption, resend, and attempt metadata.
- [x] Invalidate older challenges for the same purpose and destination when a new challenge is issued.
- [x] Prevent OTP values from appearing in ordinary logs or administrative lists.

## 3.10 Mobile-change request model

- [x] Add mobile-change request records.
- [x] Store target account ID.
- [x] Store initiating actor ID.
- [x] Store old mobile reference in restricted/audited form.
- [x] Store new mobile reference in restricted/audited form.
- [x] Store new-number verification status.
- [x] Store old-number verification status.
- [x] Store recovery-review status where applicable.
- [x] Store reviewer, decision, evidence reference, and timestamps.
- [x] Store notification-attempt results.
- [x] Store final outcome without overwriting historical request state.

---

# 4. Platform and organization authorization

## 4.1 Super Admin

- [x] Add a platform-scoped Super Admin role or equivalent capability.
- [x] Ensure Super Admin is not merely an organization Owner.
- [x] Allow only Super Admins to create organizations.
- [x] Allow only Super Admins to appoint/remove Organization Admins.
- [x] Allow Super Admins to view the administrative organization list.
- [x] Prevent Super Admin administrative visibility from automatically granting project-content visibility.
- [x] Add controlled first-Super-Admin bootstrap.
- [x] Ensure bootstrap cannot be triggered through public signup.
- [x] Audit bootstrap and every Super Admin appointment/removal.

## 4.2 Organization Admin

- [x] Add explicit Organization Admin assignment.
- [x] Limit Organization Admin authority to assigned organizations.
- [x] Allow Organization Admins to manage internal organization membership.
- [x] Allow Organization Admins to grant/revoke Project Manager eligibility.
- [x] Allow Organization Admins to maintain project-manager continuity.
- [x] Allow Organization Admins to view only approved project metadata unless content access is separately granted.
- [x] Prevent Organization Admins from creating organizations.
- [x] Prevent Organization Admins from assigning themselves unsupported platform roles.

## 4.3 Authorization service

- [x] Create centralized checks for account, organization, project, and meeting scopes.
- [x] Add explicit functions for each PRD operation rather than relying only on role strings.
- [x] Ensure unspecified permissions default to denied.
- [x] Ensure organization IDs supplied by clients never grant access by themselves.
- [x] Ensure project IDs supplied by clients never grant access by themselves.
- [x] Apply checks to UI actions, direct links, API reads, API mutations, background jobs, and invitation flows.
- [x] Recompute or validate current membership authorization on protected requests.
- [x] Prevent stale session permissions from preserving revoked access.
- [x] Keep current meeting RBAC working independently while project authorization is added.
- [x] Define the bridge from project access to meeting access only after product approval.

## 4.4 Continuity operations

- [x] Implement atomic replacement of a Project Manager.
- [x] Implement atomic replacement of a Receiving Lead.
- [x] Implement atomic replacement of the last Organization Admin.
- [x] Implement atomic revocation of Project Manager eligibility after projects are reassigned.
- [x] Reject operations that would leave a required role empty.
- [x] Ensure failed operations leave the prior assignment unchanged.
- [x] Ensure replacements do not silently grant lower roles.
- [x] Preserve independent memberships and historical attribution.
- [x] Add concurrency protection for simultaneous replacement requests.

## 4.5 Access removal

- [x] Remove only the specified membership or assignment.
- [x] Preserve the underlying account.
- [x] Preserve unrelated organization memberships.
- [x] Preserve unrelated project memberships.
- [x] Preserve historical meeting/document/signature attribution.
- [x] Revoke authorization on the next protected request.
- [x] Exit the current protected page when its access disappears.
- [x] Avoid logging a user out of unrelated contexts unless explicitly approved as a security policy.
- [x] Provide a profile/sign-out-only state when no permissions remain.

---

# 5. Authentication migration

## 5.1 Replace public registration behavior

- [x] Remove public self-registration as an active-account creation path.
- [x] Preserve the route temporarily only as a migration-compatible endpoint if needed.
- [x] Make direct registration without a valid invitation fail safely.
- [x] Ensure registration cannot accept a privileged role from the client.
- [x] Ensure no registration request can create an organization.
- [x] Ensure no registration request can create project access without a valid authorized invitation.
- [x] Update the frontend so the default auth experience does not offer public signup.
- [x] Keep a controlled migration/support path for existing accounts.

## 5.2 Password-account migration

- [x] Inventory all existing password accounts.
- [x] Preserve account IDs during migration.
- [x] Preserve organization memberships.
- [x] Preserve meeting memberships and historical attribution.
- [x] Detect duplicate normalized mobile numbers.
- [x] Detect accounts missing verified mobile numbers.
- [x] Define the behavior for accounts with only email identifiers.
- [x] Define a staged migration state.
- [x] Support a safe transition period where existing accounts can authenticate while mobile verification is completed.
- [x] Do not remove password login until migration success criteria are met.
- [x] Add migration observability and support diagnostics without exposing passwords or OTPs.
- [x] Add rollback instructions for migration failures.

## 5.3 OTP login

- [x] Add mobile-number login request endpoint.
- [x] Normalize the mobile number before lookup.
- [x] Apply neutral responses to unauthenticated callers.
- [x] Do not create an account for an unknown number.
- [x] Send a purpose-bound login OTP only to eligible active accounts.
- [x] Enforce destination, source, and service-wide rate limits.
- [x] Enforce resend cooldown.
- [x] Enforce verification-attempt limits.
- [x] Invalidate previous login challenges when a new one is issued.
- [x] Consume OTPs exactly once.
- [x] Create a session only after correct, unexpired OTP verification.
- [x] Resolve current permissions after authentication.
- [x] Route users to their authorized landing page or no-access state.
- [x] Preserve password fallback only while the migration policy permits it.
- [x] Add logout and logout-all behavior for OTP-created sessions.

## 5.4 Session behavior

- [x] Keep sessions server-side and expiring.
- [x] Keep the configured cookie name.
- [x] Keep production secure-cookie behavior.
- [x] Define session lifetime with the product manager.
- [x] Recheck current access on protected requests.
- [x] Invalidate sessions after successful mobile-number changes.
- [x] Invalidate sessions after security-critical recovery decisions where required.
- [x] Avoid storing stale role/permission snapshots without revalidation.
- [x] Add session version or account-security-version support if useful.

---

# 6. Invitation and onboarding implementation

## 6.1 Authorized invitation issuance

- [x] Define allowed inviter-to-role combinations exactly as the PRD specifies.
- [x] Super Admin: Organization Admin invitations.
- [x] Organization Admin: internal-member invitations.
- [x] Organization Admin: Project Manager invitations/eligibility flow.
- [x] Project Manager: Receiving Lead invitations.
- [x] Receiving Lead: ordinary Receiving Member invitations.
- [x] Prevent Execution Members from issuing invitations.
- [x] Prevent Project Managers from directly inviting new internal Execution Members.
- [x] Validate inviter authority on every issuance request.
- [x] Validate target scope and role on every issuance request.
- [x] Normalize mobile numbers before duplicate checks.
- [x] Make name optional at issuance.
- [x] Prevent active duplicates for the same mobile, scope, and offered role.
- [x] Ensure invitation creation grants no active account or membership.

## 6.2 Invitation landing page

- [x] Build a public invitation landing page that does not reveal confidential information before safe validation.
- [x] Show host organization.
- [x] Show project when applicable.
- [x] Show offered role.
- [x] Show masked destination mobile.
- [x] Show invitation validity.
- [x] Explain that the invitation is fixed to the original mobile number.
- [x] Provide a safe incorrect-number path.
- [x] Do not allow the recipient to edit the destination number.
- [x] Provide OTP request and verification flow.
- [x] Prevent a logged-in different account from claiming the invitation.

## 6.3 New-account activation

- [x] Send OTP only to the fixed invitation destination.
- [x] Require correct, unexpired, unused invitation OTP.
- [x] Require first name and last name for a new account.
- [x] Keep optional profile fields optional.
- [x] Create a provisional account only as needed during onboarding.
- [x] Do not make the account active before required verification and profile completion.
- [x] Activate exactly one account after successful completion.
- [x] Activate exactly one scoped membership.
- [x] Make acceptance idempotent.
- [x] Prevent duplicate accounts under concurrent requests.
- [x] Do not accept other pending invitations automatically.

## 6.4 Existing-account activation

- [x] Match the existing account using the normalized verified mobile.
- [x] Reuse the existing account.
- [x] Do not overwrite the existing name, avatar, signature, or other profile fields.
- [x] Require independent acceptance for each invitation.
- [x] Show â€œAlready a Memberâ€ when the offered membership already exists.
- [x] Prevent unexpected privilege elevation.

## 6.5 Authority and replacement validation

- [x] Revalidate invitation expiry at acceptance.
- [x] Revalidate cancellation at acceptance.
- [x] Revalidate scope existence at acceptance.
- [x] Revalidate role validity at acceptance.
- [x] Revalidate issuer or current-scope authority at acceptance.
- [x] Reject invitations whose issuer no longer has authority.
- [x] Allow the current authorized actor to reissue.
- [x] Preserve incumbents until replacement acceptance is valid.
- [x] Perform replacement/removal atomically after successful acceptance.

## 6.6 Invitation lifecycle

- [x] Implement Pending state.
- [x] Implement Accepted terminal state.
- [x] Implement Expired state and queue visibility.
- [x] Implement Cancelled state.
- [x] Do not allow accepted invitations to be cancelled.
- [x] Allow expired invitations to be reissued.
- [x] Rotate tokens on true resend/reissue.
- [x] Invalidate all older tokens after rotation.
- [x] Preserve history after rotation.
- [x] Enforce resend cooldown and rate limits.

## 6.7 SMS and Copy Link

- [x] Add Send SMS action.
- [x] Add Copy Link action.
- [x] Add Send SMS and Copy Link combined action.
- [x] Support copy-only invitations.
- [x] Mark copy-only invitations as SMS state `Not sent by SMS`.
- [x] Write to the clipboard only after explicit user action.
- [x] Show clipboard success accurately.
- [x] Show clipboard failure with retry.
- [x] Do not claim external delivery, reading, or receipt after copying.
- [x] Keep copying a valid link from rotating or extending it.
- [x] Disable Copy Link for expired, cancelled, accepted, or superseded invitations.
- [x] Allow authorized successors to retrieve a valid link.
- [x] Record copy activity with actor, invitation ID, scope, and time.
- [x] Never log the raw token or clipboard contents.

## 6.8 Delivery tracking

- [x] Record SMS attempt time.
- [x] Record provider result.
- [x] Record bounded diagnostic information.
- [x] Separate queued, submitted, failed, and not-sent states.
- [x] Do not describe provider submission as read or guaranteed delivery.
- [x] Preserve invitation acceptance state independently from delivery state.
- [x] Support bounded retry.
- [x] Do not grant access after delivery failure.

## 6.9 Invitation queue

- [x] Build scope-filtered invitation queues.
- [x] Super Admin: Organization Admin invitations.
- [x] Organization Admin: internal and Project Manager invitations.
- [x] Project Manager: Receiving Lead invitations.
- [x] Receiving Lead: Receiving Member invitations.
- [x] Permit successors with current authority to manage relevant queues.
- [x] Add search, filtering, detail view, resend, cancel, reissue, and Copy Link actions.
- [x] Hide raw invitation tokens from list tables and ordinary audit views.
- [x] Restrict destination mobile visibility by role and scope.

---

# 7. Project membership and management

## 7.1 Organization member administration

- [x] Add Organization Members page aligned with the PRD.
- [x] Search active and revoked memberships.
- [x] Search by permitted name and mobile fields.
- [x] Display membership state.
- [x] Display organization-level role and Project Manager eligibility.
- [x] Invite internal members.
- [x] Grant/revoke Project Manager eligibility.
- [x] Remove internal membership subject to continuity checks.
- [x] Provide the invitation queue link.
- [x] Provide mobile-change initiation only as a separate approved workflow.

## 7.2 Project creation

- [x] Allow only eligible Project Managers to create projects.
- [x] Restrict project creation to the organization granting eligibility.
- [x] Assign creator as initial Project Manager.
- [x] Reject project creation without an active manager.
- [x] Do not grant project-content access to unrelated organization administrators automatically.
- [x] Preserve existing meeting creation independently unless a later PRD changes it.

## 7.3 Execution members

- [x] Add project execution-member list.
- [x] Show current execution members and project roles.
- [x] Allow only the Project Manager to add/remove execution members.
- [x] Select only active internal members of the same organization.
- [x] Prevent duplicate assignment.
- [x] Show the required message when a target is not an internal member.
- [x] Do not expose new-user invitation from the execution-member picker.
- [x] Preserve independent access in other projects.

## 7.4 Receiving team

- [x] Allow a project to have no receiving team initially.
- [x] Allow only the Project Manager to appoint/replace the Receiving Lead.
- [x] Enforce one active Receiving Lead.
- [x] Allow only the Receiving Lead to add/remove ordinary Receiving Members.
- [x] Permit receiving users without internal host-organization membership.
- [x] Prevent receiving users from accessing organization administration.
- [x] Prevent receiving users from browsing the internal staff directory.
- [x] Prevent Receiving Leads from changing execution members.
- [x] Prevent Receiving Leads from replacing themselves.
- [x] Preserve ordinary receiving memberships during lead replacement.

## 7.5 Compatibility with meetings

- [x] Keep existing meeting participants and meeting roles intact.
- [x] Decide whether project membership creates default meeting visibility.
- [x] Decide whether a meeting must belong to a project.
- [x] Do not automatically delete meeting participants when project membership is removed unless a later PRD requires it.
- [x] Preserve meeting history and signature attribution after project access removal.
- [x] Add explicit adapters if project roles are later mapped to meeting roles.

---

# 8. Context-aware navigation and no-access state

## 8.1 Shared context header

- [x] Add current context display:

  ```text
  Organization / Project / Current role
  ```

- [x] Display role as an indicator, not a manual role-switch control.
- [x] Combine applicable permissions only within the selected scope.
- [x] Keep existing meeting navigation available where the user is authorized.

## 8.2 Selectors

- [x] Internal multi-organization users can select an organization.
- [x] Internal users can then select an authorized project.
- [x] Receiving-only users can select authorized projects directly.
- [x] Show host organization labels for receiving-only project options.
- [x] Include all authorized projects in My Projects.
- [x] Avoid redundant selection when only one context exists.
- [x] Keep organization administration navigation separate from project-content access.

## 8.3 Context switching safety

- [x] Refresh visible data after switching organization or project.
- [x] Refresh navigation after switching context.
- [x] Refresh effective permissions after switching context.
- [x] Clear data belonging to the previous context.
- [x] Prevent stale project or meeting content from remaining visible.
- [x] Warn before discarding unsaved changes.
- [x] Authorize direct links before rendering protected content.
- [x] Redirect unavailable pages to an authorized landing page.
- [x] Clear revoked contexts immediately after access refresh.
- [x] Preserve current meeting workflow routes when their authorization remains valid.

## 8.4 No-access state

- [x] Add the exact no-access message from the PRD.
- [x] Keep profile access available.
- [x] Keep sign-out available.
- [x] Hide organization selectors when no organization access exists.
- [x] Hide project selectors when no project access exists.
- [x] Hide operational menus when no relevant permission exists.
- [x] Hide self-service organization creation.
- [x] Do not render a blank page.
- [x] Preserve organization administration for an Organization Admin with no project membership.
- [x] Preserve project creation for an eligible Project Manager with no projects.

---

# 9. Profile, mobile change, and recovery

## 9.1 Profile editing

- [x] Allow editing first name.
- [x] Allow editing last name.
- [x] Allow approved optional profile fields.
- [x] Keep first and last name required after activation.
- [x] Keep mobile number out of ordinary profile editing.
- [x] Keep roles out of ordinary profile editing.
- [x] Keep memberships out of ordinary profile editing.
- [x] Keep verification status out of ordinary profile editing.
- [x] Reflect account-level profile changes across all authorized contexts.
- [x] Prevent managers from silently overwriting a userâ€™s personal profile.
- [x] Preserve existing avatar, signature, notification, and Telegram functionality.

## 9.2 Mobile change initiation

- [x] Allow an Organization Admin to initiate a request for an active internal member.
- [x] Allow Super Admin recovery initiation for users without an eligible organization administrator.
- [x] Remove direct phone-edit behavior from ordinary member management.
- [x] Validate and normalize the target number.
- [x] Reject a target number already attached to another account.
- [x] Do not merge accounts automatically.

## 9.3 Mobile verification

- [x] Send OTP to the new number.
- [x] Require new-number OTP before completion.
- [x] If old number is accessible, send and verify old-number approval.
- [x] If old number is inaccessible, require Super Admin recovery review.
- [x] Do not treat new-number OTP alone as proof of ownership of the old account.
- [x] Make the final account update atomic.
- [x] Preserve account ID, memberships, roles, documents, signatures, and attribution.

## 9.4 Session and notification behavior

- [x] Invalidate all existing sessions after successful mobile change.
- [x] Require login with the new number.
- [x] Attempt notification to the previous number.
- [x] Attempt notification to the new number.
- [x] Record notification attempts and outcomes.
- [x] Ensure failed/incomplete changes leave the old number and access unchanged.

## 9.5 Recovery review

- [x] Define acceptable ownership evidence.
- [x] Define reviewer roles.
- [x] Define review states: pending, approved, rejected, inconclusive, expired.
- [x] Define restricted evidence storage.
- [x] Audit reviewer, decision, time, and reason.
- [x] Keep the existing identifier and access unchanged when ownership cannot be established.
- [x] Provide a safe user-facing outcome without exposing internal evidence.

## 9.6 Invitation interaction after mobile change

- [x] Do not silently transfer invitations addressed to the previous number.
- [x] Show authorized reissue guidance.
- [x] Ensure old invitation tokens cannot be used to claim access for the new number.
- [x] Preserve invitation history.

---

# 10. Audit, privacy, and security

## 10.1 Audit coverage

- [x] Audit organization creation.
- [x] Audit Super Admin appointment/removal.
- [x] Audit Organization Admin appointment/removal.
- [x] Audit internal membership grant/revocation.
- [x] Audit Project Manager eligibility grant/revocation.
- [x] Audit project creation.
- [x] Audit Project Manager transfer.
- [x] Audit execution-member assignment/removal.
- [x] Audit Receiving Lead appointment/replacement.
- [x] Audit Receiving Member assignment/removal.
- [x] Audit invitation issuance.
- [x] Audit SMS delivery attempts.
- [x] Audit Copy Link retrieval/copy activity.
- [x] Audit invitation resend/reissue.
- [x] Audit invitation cancellation.
- [x] Audit invitation acceptance.
- [x] Audit OTP verification outcomes without storing OTP values.
- [x] Audit access revocation.
- [x] Audit profile updates.
- [x] Audit mobile-change initiation.
- [x] Audit old/new number verification.
- [x] Audit recovery review.
- [x] Audit mobile-change notifications.
- [x] Preserve existing meeting/signature/sealing audit behavior.

## 10.2 Sensitive-data protection

- [x] Do not expose OTP values in ordinary logs.
- [x] Do not expose full invitation tokens in list responses.
- [x] Do not expose session secrets.
- [x] Do not expose recovery evidence to ordinary administrators.
- [x] Restrict mobile visibility by role and scope.
- [x] Restrict email visibility if it is not required for the authorized workflow.
- [x] Keep participant names/roles separate from contact directories.
- [x] Do not treat SMS provider submission as delivery confirmation.

## 10.3 Security tests

- [x] Test organization ID tampering.
- [x] Test project ID tampering.
- [x] Test invitation token tampering.
- [x] Test forwarded invitation links.
- [x] Test acceptance under the wrong account.
- [x] Test issuer authority loss.
- [x] Test duplicate invitation acceptance.
- [x] Test concurrent invitation acceptance.
- [x] Test OTP replay.
- [x] Test OTP expiration.
- [x] Test OTP attempt exhaustion.
- [x] Test resend invalidation.
- [x] Test revoked authorization using an old session.
- [x] Test role escalation through request bodies.
- [x] Test unauthorized Copy Link retrieval.
- [x] Test phone-number collision.
- [x] Test recovery-review bypass attempts.
- [x] Test cross-organization meeting access remains blocked.
- [x] Test existing meeting and signature authorization after account changes.

---

# 11. Frontend implementation checklist

- [x] Replace password-primary login UI with OTP-first login while migration policy permits compatible fallback.
- [x] Remove public â€œNew Registrationâ€ as a general account-creation option.
- [x] Make invitation acceptance drive onboarding.
- [x] Add invitation detail screen.
- [x] Add masked mobile display.
- [x] Add OTP request and verification states.
- [x] Add first-name and last-name fields.
- [x] Add duplicate/already-member state.
- [x] Add wrong-number guidance.
- [x] Add pending/expired/cancelled/accepted invitation states.
- [x] Add invitation queue filters and actions.
- [x] Add Copy Link UI and clipboard feedback.
- [x] Add Super Admin organization administration UI.
- [x] Add Organization Admin member and eligibility UI.
- [x] Add project creation UI.
- [x] Add Project Manager transfer UI.
- [x] Add execution-member UI.
- [x] Add receiving-team UI.
- [x] Add Receiving Lead replacement UI.
- [x] Add Receiving Member UI.
- [x] Add Organization / Project / Role context header.
- [x] Add My Projects selector.
- [x] Add receiving-only project navigation.
- [x] Add mixed-context navigation.
- [x] Add no-access landing state.
- [x] Remove self-service organization creation from no-access state.
- [x] Add profile first-name/last-name editing.
- [x] Add separate mobile-change workflow.
- [x] Add old/new verification states.
- [x] Add recovery-review status UI where authorized.
- [x] Preserve existing meeting, minutes, signatures, archives, templates, notifications, Telegram, and settings UI.
- [x] Preserve RTL and Persian layout behavior.
- [x] Correct any existing encoding issues encountered in touched screens.

---

# 12. Backend API checklist

## Authentication

- [x] Add OTP login request endpoint.
- [x] Add OTP login verification endpoint.
- [x] Add invitation OTP request endpoint.
- [x] Add invitation OTP verification endpoint.
- [x] Add account activation endpoint.
- [x] Keep existing password endpoints behind migration compatibility rules.
- [x] Keep logout and logout-all endpoints.
- [x] Add session refresh/revalidation behavior.

## Organizations

- [x] Restrict organization creation to Super Admin.
- [x] Add Super Admin organization list endpoint.
- [x] Add Organization Admin appointment endpoint.
- [x] Add Organization Admin replacement endpoint.
- [x] Add organization membership management endpoints.
- [x] Add Project Manager eligibility endpoints.
- [x] Prevent unauthorized organization deletion unless a later approved policy allows it.

## Invitations

- [x] Add scope-aware invitation creation endpoint.
- [x] Add invitation detail endpoint with safe redaction.
- [x] Add invitation OTP endpoints.
- [x] Add acceptance endpoint with atomic membership creation.
- [x] Add resend/reissue endpoint.
- [x] Add Copy Link retrieval endpoint with authorization.
- [x] Add cancellation endpoint.
- [x] Add invitation queue endpoint with scope filtering.
- [x] Add delivery-attempt history endpoint where authorized.

## Projects

- [x] Add project creation endpoint.
- [x] Add project list endpoint.
- [x] Add project detail endpoint.
- [x] Add Project Manager transfer endpoint.
- [x] Add execution-member add/remove endpoints.
- [x] Add Receiving Lead appointment/replacement endpoints.
- [x] Add Receiving Member add/remove endpoints.
- [x] Add My Projects endpoint.
- [x] Add project-context permission resolution.

## Profile and recovery

- [x] Restrict ordinary profile endpoint to allowed profile fields.
- [x] Add mobile-change request endpoint.
- [x] Add new-number OTP endpoint.
- [x] Add old-number approval endpoint.
- [x] Add recovery-review endpoint.
- [x] Add mobile-change completion endpoint.
- [x] Add session invalidation on completion.
- [x] Add notification-attempt recording.

## Existing operational APIs

- [x] Verify that meeting APIs still work under the new account/session model.
- [x] Verify that meeting participant APIs do not accidentally become project-membership APIs.
- [x] Verify that signature APIs still resolve the authenticated user correctly.
- [x] Verify that Telegram actions still resolve stable user IDs correctly.
- [x] Verify that PDF/document routes retain existing authorization.
- [x] Verify that AI endpoints preserve their existing behavior while receiving current authorization context.

---

# 13. Migration and compatibility plan

- [x] Create migration scripts that are idempotent.
- [x] Preserve all existing user IDs.
- [x] Preserve all existing organization IDs.
- [x] Preserve all existing meeting IDs.
- [x] Preserve all existing meeting participants.
- [x] Preserve all existing signatures and document hashes.
- [x] Preserve all existing audit records.
- [x] Preserve all existing Telegram associations.
- [x] Preserve all existing notification preferences.
- [x] Preserve existing avatars and signature data.
- [x] Convert legacy Owner/Admin/User data into a compatibility mapping.
- [x] Identify accounts that need first/last-name completion.
- [x] Identify accounts that need mobile verification.
- [x] Identify accounts with duplicate mobile numbers.
- [x] Identify accounts with no organization membership.
- [x] Identify accounts with meeting access but no future project mapping.
- [x] Keep legacy meeting access working during project rollout.
- [x] Do not mass-delete legacy invitations.
- [x] Do not automatically convert meeting participants into project roles without an approved mapping.
- [x] Add migration reports and counts.
- [x] Add rollback documentation.
- [x] Test migration on a copy of production-like data.

---

# 14. Testing and acceptance matrix

## Phase 1 acceptance

- [x] Non-Super Admin cannot create an organization through UI, direct API, or crafted request.
- [x] Super Admin can create an organization.
- [x] Organization Admin assignments are scoped to the correct organization.
- [x] Organization Admin cannot administer another organization.
- [x] Project Manager eligibility is organization-scoped.
- [x] Organization Admin/content visibility boundaries are enforced.
- [x] Project-manager continuity cannot be broken.
- [x] Receiving-lead continuity cannot be broken.
- [x] Last Organization Admin continuity cannot be broken.
- [x] Role removal preserves account identity.
- [x] Role removal preserves unrelated memberships.
- [x] Revoked access fails on the next protected request.
- [x] Historical attribution remains available.
- [x] All relevant identity and authorization changes are audited.

## Phase 2 acceptance

- [x] Only authorized role/scope combinations can issue invitations.
- [x] Invitation creation grants no access.
- [x] Invitation detail shows correct organization/project/role/mobile/expiry.
- [x] OTP is sent only to the fixed destination mobile.
- [x] Forwarded link cannot be accepted without destination OTP.
- [x] New account requires verified OTP and first/last name.
- [x] Existing account is reused without profile overwrite.
- [x] Acceptance is exactly-once and idempotent.
- [x] Invitation issuer authority is rechecked.
- [x] Resend/reissue rotates tokens and invalidates old copies.
- [x] Copy-only invitation works.
- [x] Copy Link does not falsely claim delivery.
- [x] Unknown-number login does not create an account.
- [x] Login OTP rate limits work server-side.
- [x] Old sessions do not preserve revoked permissions.
- [x] No-access accounts can log in and access only profile/sign-out.
- [x] Existing password accounts remain usable until migration is approved complete.

## Phase 3 acceptance

- [x] Organization Admin can manage only internal memberships in their organization.
- [x] Organization Admin can grant/revoke Project Manager eligibility.
- [x] Eligible Project Manager can create projects only in the eligible organization.
- [x] Every project has exactly one active Project Manager.
- [x] Execution members are active internal members of the same organization.
- [x] Duplicate execution membership is impossible.
- [x] Receiving team can be absent initially.
- [x] Project Manager alone controls Receiving Lead appointment/replacement.
- [x] Receiving Lead alone controls ordinary receiving memberships.
- [x] Receiving-only users cannot access organization administration.
- [x] Mixed-role users see every authorized project and no unauthorized project.
- [x] Context switching clears previous context data.
- [x] Unsaved changes are protected.
- [x] Direct unauthorized links do not expose content.
- [x] Existing meeting routes remain functional.

## Phase 4 acceptance

- [x] Allowed profile fields can be edited.
- [x] Mobile cannot be changed through ordinary profile editing.
- [x] New number requires OTP.
- [x] Accessible old number requires approval verification.
- [x] Inaccessible old number requires Super Admin recovery review.
- [x] Duplicate target number is rejected.
- [x] Account ID and memberships are preserved.
- [x] Failed/incomplete changes leave the old identifier unchanged.
- [x] Successful changes invalidate all existing sessions.
- [x] Subsequent login requires the new number.
- [x] Old/new notification attempts are recorded.
- [x] Recovery evidence and reviewer decisions are audited.
- [x] Existing meeting/signature/document history remains intact.

---

# 15. Regression protection for existing application features

- [x] Meeting list still loads for authorized existing users.
- [x] Meeting creation still works for users who retain that permission.
- [x] Meeting editing still works according to existing meeting roles.
- [x] Meeting review still works.
- [x] Meeting signatures still work.
- [x] Signature OTP remains separate from login OTP.
- [x] Meeting sealing still enforces complete signatures.
- [x] Archive routes remain accessible to authorized users.
- [x] PDF generation and download remain functional.
- [x] Certificate verification remains functional.
- [x] Document hashes remain stable for existing documents.
- [x] Existing audit-chain behavior remains intact.
- [x] Notifications continue to load and mark as read.
- [x] Telegram linking remains functional.
- [x] Telegram signing actions remain secure and idempotent.
- [x] AI minutes assistance remains available to authorized users.
- [x] Templates remain organization-scoped as currently implemented.
- [x] Settings and avatar updates remain functional.
- [x] Existing data does not disappear during account migration.
- [x] Existing users are not unexpectedly removed from meetings.
- [x] Existing invitation and participant workflows remain available where not forbidden by the new PRD.
- [x] Guest signing remains isolated and does not become general account access.

---

# 16. Operational rollout

- [x] Add feature flags for OTP login.
- [x] Add feature flags for public-registration shutdown.
- [x] Add feature flags for Super Admin organization provisioning.
- [x] Add feature flags for project navigation.
- [x] Add feature flags for mobile-change recovery.
- [x] Deploy schema migrations before enabling new UI.
- [x] Deploy backend compatibility endpoints before changing frontend behavior.
- [x] Migrate and verify existing accounts.
- [x] Enable invitation OTP for test organizations first.
- [x] Enable OTP login for internal testers.
- [x] Run cross-phase acceptance tests.
- [x] Monitor OTP send failures and acceptance failures.
- [x] Monitor stale-session authorization failures.
- [x] Monitor duplicate-account prevention.
- [x] Monitor invitation token misuse and replay attempts.
- [x] Keep password fallback during the approved migration window.
- [x] Announce authentication changes to existing users.
- [x] Provide support instructions for users with unverified or duplicate mobile numbers.
- [x] Establish rollback procedure for every flag.
- [x] Only remove password fallback after product and security sign-off.

---

# 17. Definition of completion

This work is complete when all of the following are true:

- [x] The PRD-defined identity, organization, project, invitation, OTP, profile, mobile-change, recovery, and authorization behaviors pass their acceptance tests.
- [x] Public organization creation and unsupported public account creation no longer bypass controlled provisioning.
- [x] Existing meeting-management functionality remains available and passes regression tests.
- [x] Existing meetings, minutes, signatures, PDFs, archives, notifications, Telegram integrations, and audit history are preserved.
- [x] Project roles are implemented separately from meeting workflow roles.
- [x] Administrative access is separated from project-content access.
- [x] Revoked access fails promptly without deleting accounts or unrelated history.
- [x] Invitation links cannot grant access without the required destination-mobile verification.
- [x] Mobile-number changes preserve account identity and invalidate old sessions.
- [x] Recovery cannot be enabled without approved ownership evidence and reviewer procedures.
- [x] All security-sensitive transitions are audited without leaking secrets.
- [x] Migration has been tested on production-like data.
- [x] TypeScript checks pass.
- [x] Unit tests pass.
- [x] API integration tests pass.
- [x] Browser-level acceptance tests pass.
- [x] Production build succeeds in a clean environment.
- [x] Product manager and security owner approve the remaining open decisions.



