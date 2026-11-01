# Phase 2 PRD — Invitations, Account Activation, and OTP Login

Version: 1.1 — Development sequence edition  
Date: October 21, 2026  
Status: Draft for product review

## Phase Objective and Delivery Boundary

Depends on Phase 1. Implement invitation issuance and tracking, SMS and Copy Link distribution, OTP verification, explicit acceptance, account reuse, new-account activation, OTP login, sessions, and the no-access landing page. Invitation destinations for projects use the Phase 1 model; their full project UI integrates in Phase 3. Required first/last-name onboarding belongs here; self-service profile editing belongs to Phase 4.

Exit gate: an authorized invitation can be distributed by SMS or copied link, accepted only after destination OTP, and produce exactly one correct account/membership; login and revocation enforcement work. Current passwords must not be removed before existing-user migration is verified. Program-wide user-management and recovery references below are contracts for Phases 3 and 4, not claims those phases are already delivered.

## Reading Rules

This PRD is one development phase. Read 00-README.md first. Original requirement text is retained below without shortening. Source section numbers and acceptance IDs remain stable; prefix IDs with R- (roles) or I- (identity) to avoid collisions. Cross-phase references identify contracts or later delivery, not extra scope for the current phase. New distribution and guest notes in this edition take precedence over older SMS-only wording and future-document references.

### Source: Identity I6

## 6. End-to-end Invitation and Activation Flow

1. Authorized actor opens Invite New from the relevant organization or project page.
2. Actor enters a mobile number; name is optional and not required for issuance. Scope and allowed role are explicit or fixed by the entry point.
3. System validates authority, mobile format, scope constraints, and duplicate invitations.
4. System records a pending invitation and queues an SMS containing a unique invitation link.
5. Recipient opens the link and sees the host organization, project when applicable, offered role, masked mobile, and invitation validity.
6. Recipient requests and verifies an OTP sent only to the invitation's destination number.
7. If no active account exists, recipient supplies first and last name. Optional profile fields can be skipped.
8. Recipient explicitly accepts the offered membership/role.
9. System revalidates invitation and authority, activates/reuses the account, and grants the scoped membership exactly once.
10. Recipient lands in the newly accessible context with the organization/project and role visible.

### Existing account

- Reuse the verified account associated with the destination number.
- Preserve existing profile data.
- Accept each invitation independently; one acceptance must not accept other invitations automatically.
- A signed-in session for a different number must not claim the invitation. Offer a clear switch-account/verify-invited-number path.
- If the offered membership already exists, show Already a Member without creating duplicates or elevating privileges unexpectedly.

### Incorrect invitation number

- Recipient cannot replace the destination number on the acceptance page.
- Provide “This number is incorrect or has changed” guidance to contact the inviter.
- Inviter cancels the incorrect invitation and creates a new one for the corrected number.
- Pending invitation correction is separate from changing the number of an existing active account.

### Replacement assignments

- For a Project Manager transfer, Receiving Lead replacement, or last Organization Admin replacement, retain the incumbent until the incoming appointment is valid and accepted where an invitation is required.
- Complete replacement and removal atomically; failure preserves the incumbent.
- Replacing the Receiving Lead preserves ordinary receiving-team memberships.
- The former role holder is not automatically demoted to a lower role. Independent explicit memberships remain.

---

### Source: Identity I7

## 7. OTP Login and Session Behavior

### Login flow

1. Person enters their mobile number on the login page.
2. System normalizes the number and applies send limits.
3. Eligible active accounts receive a purpose-bound login OTP.
4. Correct OTP creates an authenticated session.
5. System resolves current permissions and opens an authorized landing page or the no-access state.

### Login rules

- Login is not a public account-creation route. Unknown numbers do not receive an active account or arbitrary membership.
- A person with an outstanding invitation completes onboarding through that invitation.
- Use neutral request responses to avoid disclosing account existence to unauthenticated callers. Authenticated administrators may see only account/membership information necessary for their authorized workflow.
- OTPs are short-lived, single-use, purpose-bound, and protected by resend and verification-attempt limits.
- A newly issued OTP invalidates older OTPs for the same challenge purpose and destination.
- An expired, consumed, incorrect, or exhausted challenge cannot authenticate the person.
- OTP values and invitation secrets must not appear in administrative screens or ordinary logs.
- Sign out ends the current session. General inactivity/session duration is centrally configured before launch.
- Protected requests re-evaluate current access; an old session must not preserve revoked authorization.

### No-access account

An active account without roles or memberships can still log in and sees:

> You do not currently have access to an organization or project. Your workspace will appear here when an administrator grants you access.

Only profile and sign out are available; organization/project selectors and self-service creation actions are absent. A user with organization administration or Project Manager eligibility retains those functions even if they have no project memberships.

---

### Source: Identity I11

## 11. User Scenarios

| Scenario | Expected result |
|---|---|
| Organization Admin invites a new internal member | Recipient verifies mobile, completes name, accepts, and becomes an internal member; no project access is implied. |
| Organization Admin invites a new Project Manager | Acceptance activates internal membership and organization-scoped Project Manager eligibility; project creation becomes available. |
| Project Manager needs a new Execution Member | Requests Organization Admin onboarding; can add the person only after active internal membership exists. |
| Project Manager invites Receiving Lead | Recipient accepts the project-scoped appointment without internal organization membership. |
| Receiving Lead invites an existing account | Acceptance adds receiving membership to the existing account without replacing profile data. |
| Same person has several invitations | Each scope/role is accepted separately and appears under the same account. |
| Invitation was sent to the wrong number | Inviter cancels it and sends a new invitation; recipient cannot redirect access by editing the number. |
| Recipient forwards the invitation link | Another person cannot accept using their own mobile OTP. |
| Invitation remains unanswered | Authorized actor sees Pending and can resend after cooldown; older links become invalid. |
| Inviter loses their role | Their pending invitation cannot activate access until reissued by the current authorized manager. |
| Last project membership is removed | Account remains usable; profile-only no-access page is displayed unless other permissions remain. |
| Organization Admin requests a mobile change | Required old/new verification or recovery review completes before the shared account's identifier changes. |
| Proposed new mobile belongs to another account | Change is blocked and routed to support; accounts are not merged. |

---

### Source: Identity I12

## 12. Proposed Launch Defaults — Require Product Confirmation

The following values are proposed implementation defaults, not previously agreed business decisions. Keep them configurable and confirm before launch.

| Setting | Proposed default |
|---|---|
| Invitation validity | 7 days from issue/reissue. |
| OTP format and validity | 6 digits; 2 minutes. |
| OTP resend cooldown | 60 seconds. |
| OTP verification attempts | 5 per challenge; then invalidate that challenge. |
| OTP send controls | Destination, source, and service-wide limits; thresholds finalized with provider and abuse review. |
| Invitation SMS resend | 60-second cooldown with configurable daily limits. |
| Required profile fields | First name and last name. |
| Optional initial profile fields | Profile image; additional fields deferred. |

Before launch, also confirm supported countries/mobile formats, session lifetime, SMS provider outcomes, support contact path, and recovery ownership evidence/reviewer procedure. Do not ship an administrator bypass as a substitute for unresolved recovery requirements.

---

### Source: Identity I13

## 13. Dependencies and Follow-up Work

- Implement the companion roles PRD's scope and continuity rules.
- Select/configure SMS delivery and monitor failures without exposing secrets.
- Define the first Super Admin provisioning mechanism through a controlled operational process; no public Super Admin signup.
- Plan migration from existing password-based accounts: preserve account identifiers, memberships, and historical attribution. Mobile verification and any duplicate-number conflicts must be resolved before enabling OTP access for migrated accounts.
- Specify detailed project workflow permissions in separate PRDs.
- Confirm recovery review procedures and launch defaults in Section 12.

---

### Source: Identity I14

## 14. Definition of Done

Authorized actors can issue, inspect, resend, cancel, and reissue scoped invitations. Recipients verify the intended mobile, complete required information, and accept access exactly once. Existing accounts are reused. Active users log in through OTP, manage allowed profile fields, and retain their accounts when permissions are removed. Number changes preserve identity and require verified ownership checks. UI and server authorization agree, no-access states are usable, and security-sensitive transitions are auditable.

---

### Source: Identity acceptance I-AC slice 1

### Slice 1 — Authorized invitation issuance

**Outcome:** An authorized actor offers a specific role in a specific scope using a mobile number.

- **AC-1.1:** Only role/scope combinations in Section 4 can be issued, including through direct server requests.
- **AC-1.2:** Name is not required to issue an invitation.
- **AC-1.3:** Mobile normalization is applied before uniqueness and duplicate checks.
- **AC-1.4:** An active duplicate for the same mobile, scope, and offered role is not created; the existing invitation is surfaced.
- **AC-1.5:** Invitation creation alone grants no active membership or content access.
- **AC-1.6:** SMS failure is visible separately and does not mark the invitation accepted.
- **AC-1.7:** Project Managers cannot invite new internal Execution Members.

---

### Source: Identity acceptance I-AC slice 2

### Slice 2 — Acceptance and new-account activation

**Outcome:** Recipient verifies the intended number, completes required information, and accepts access.

- **AC-2.1:** Landing page displays organization/project, offered role, destination number, and validity before acceptance.
- **AC-2.2:** OTP is sent only to the invitation's destination; recipient cannot edit that number.
- **AC-2.3:** A forwarded link cannot be accepted without verification of the original destination number.
- **AC-2.4:** A new account requires verified OTP plus first and last name before activation.
- **AC-2.5:** Existing accounts are reused without overwriting profile fields.
- **AC-2.6:** Acceptance rechecks expiry, cancellation, issuer authority, scope validity, and role constraints.
- **AC-2.7:** Retrying acceptance does not create duplicate accounts, memberships, or side effects.
- **AC-2.8:** Accepting one invitation does not accept other pending invitations.
- **AC-2.9:** A session for another account cannot claim the invitation.
- **AC-2.10:** Replacement appointments preserve the incumbent until a valid atomic handover completes.
- **AC-2.11:** Incomplete onboarding grants no project access and can resume only through a valid verified flow.

---

### Source: Identity acceptance I-AC slice 3

### Slice 3 — Queue, follow-up, and reissuance

**Outcome:** Authorized managers can inspect and act on scoped invitation states.

- **AC-3.1:** Queue search, filters, detail views, and actions never expose invitations outside the actor's current authority.
- **AC-3.2:** Resend respects cooldown and send limits and records a delivery attempt.
- **AC-3.3:** Resend/reissue invalidates older invitation links.
- **AC-3.4:** Cancelling a pending invitation prevents subsequent acceptance immediately.
- **AC-3.5:** Accepted invitations offer membership-management navigation rather than cancellation.
- **AC-3.6:** Expired invitations show a clear reissue action; history remains available.
- **AC-3.7:** Provider submission is not mislabeled as read/received confirmation.
- **AC-3.8:** Lost issuer authority prevents acceptance; the current authorized manager can reissue.

---

### Source: Identity acceptance I-AC slice 4

### Slice 4 — OTP login and sessions

**Outcome:** Active accounts authenticate without passwords and receive only current access.

- **AC-4.1:** Correct, unexpired, unused OTP authenticates its intended account and purpose.
- **AC-4.2:** Expired, incorrect, consumed, or attempt-exhausted OTP does not authenticate.
- **AC-4.3:** Send limits and resend cooldowns are enforced server-side.
- **AC-4.4:** Issuing a new OTP invalidates older challenges for the same destination and purpose.
- **AC-4.5:** Unknown-number login does not create an account or membership.
- **AC-4.6:** Responses do not unnecessarily reveal account existence to unauthenticated callers.
- **AC-4.7:** Sign out invalidates the current session; protected requests thereafter fail.
- **AC-4.8:** Revoked access fails on the next protected request even in an existing session.
- **AC-4.9:** Users with zero permissions can log in and access profile/sign out; users with administrative permissions retain them despite an empty project list.

---

### Source: Identity acceptance I-AC slice 7

### Slice 7 — Audit and error handling

**Outcome:** Sensitive transitions are traceable and failures do not leave partial access.

- **AC-7.1:** Invitation issuance, delivery attempts, resend, cancellation, acceptance, membership changes, and number changes record actor, target, scope, action, and timestamp.
- **AC-7.2:** OTP values, full invitation tokens, and session secrets are absent from ordinary audit views/logs.
- **AC-7.3:** Concurrent acceptance or duplicate requests result in at most one effective assignment.
- **AC-7.4:** Failed replacements preserve existing valid assignments.
- **AC-7.5:** SMS service errors allow bounded retry and do not grant access or claim successful verification.
- **AC-7.6:** Invalid links show a clear safe outcome without revealing confidential project information.

---

## Additional Requirement: SMS and Copy Link Invitation Distribution

- Invitation creation must offer **Send SMS**, **Copy Link**, or both. Copy-only issuance is supported; an SMS send is not a prerequisite for a valid invitation.
- An authorized inviter may share the copied link through another communication channel. Accord does not need to integrate with those channels in this release.
- Copy Link is available immediately after issue and in authorized pending-invitation details. A successor with current scope authority may also use it.
- Copying a still-valid link does not change role, number, scope, expiry, acceptance, or invalidate previously shared copies. Retrieving a copy must be authorized; invitation secrets never appear in list tables or ordinary audit logs.
- The same link semantics apply across distribution channels: original destination mobile is fixed; OTP verification, expiry, cancellation, issuer authority, and acceptance checks remain mandatory.
- Distinguish **Not sent by SMS** from delivery failure. Copying does not imply that the external message was sent, received, or read.
- Resend/reissue rotates the link as already specified, invalidating all earlier copies. Explain this to the operator. For expired/cancelled/accepted invitations, do not offer a usable Copy Link action; use the appropriate reissue or membership-management action.
- Record Copy Link activity with actor, invitation ID, scope, and time, without the raw token or clipboard contents. Only write to clipboard following an explicit user action; show success or a retryable failure.

### Additional Acceptance Criteria — I-COPY

- **I-COPY-1:** An authorized actor can create a copy-only invitation without sending SMS; its invitation status is Pending and SMS state is Not sent by SMS.
- **I-COPY-2:** A copied link reaches the same verified acceptance flow and grants no access without OTP to the fixed destination.
- **I-COPY-3:** Copying a valid link does not rotate it or extend expiry; previously distributed copies remain subject to the same lifecycle.
- **I-COPY-4:** Unauthorized actors cannot retrieve or copy invitation tokens, including via direct requests.
- **I-COPY-5:** Cancel, expiry, acceptance, or token rotation prevents outdated copies from granting access.
- **I-COPY-6:** Clipboard success/failure is accurately shown; copying never claims delivery through an external channel.
- **I-COPY-7:** Sending SMS after copy-only issuance can distribute the current valid link without treating the first SMS send as a resend. A true resend/reissue rotates the token and warns that earlier copies stop working.

### Additional Scenario

An Organization Admin creates an invitation for Sara, selects Copy Link, and sends it through their preferred messenger. Sara verifies the originally invited mobile by OTP and accepts. Accord shows no SMS delivery claim and activates the same scoped membership it would activate for an SMS-distributed invitation.

## Future Capability: Guest Users

Guest users are a planned separate capability. Their definition, invitation rules, permissions, lifecycle, and UI will be supplied in a later PRD. Do not equate a guest with a Receiving Member, an external-only account, or a no-access account, and do not grant guest permissions in these phases.
