# Auth PRD Decisions and Compatibility Contract

This document records the implementation decisions used where the five supplied PRD files leave a choice open. These decisions keep the existing meeting/minutes product intact while making the authentication and access rules explicit.

## Product boundary

- The PRD work changes identity, organization access, project access, invitations, OTP, profile, mobile-change recovery, navigation, and authorization.
- Meetings, minutes, reviews, signatures, sealing, archives, PDFs, certificates, notifications, Telegram, AI assistance, templates, and existing operational APIs remain separate capabilities.
- Project membership does not automatically create meeting membership. A later product requirement may define that bridge.
- Existing guest-signing behavior remains isolated legacy functionality; it is not used as general account access.

## Adopted defaults

| Area | Decision | Implementation consequence |
|---|---|---|
| Organization admins | One-or-more active admins; the last active admin cannot be removed without replacement. | Admin-removal and membership-removal checks enforce this. |
| Same-project overlap | A user cannot simultaneously hold active execution and receiving roles on one project. | Service checks and a partial unique membership index enforce it. |
| Administrative content access | Super Admin and Organization Admin do not automatically receive meeting/document access. | Protected routes use explicit effective permissions. |
| Mobile format | Iranian mobile normalization is used for identity, invitation binding, OTP, and collision checks. | Equivalent Iranian forms resolve to one account/destination. |
| OTP | 120-second validity, 60-second resend cooldown, five attempts, five requests per ten minutes, and twenty requests per day per purpose/destination. | Redis-backed OTP records are hashed, purpose-bound, reference-bound, single-use, and rate-limited. |
| Session lifetime | Seven days, with authorization rehydrated on every protected request. | Revocations take effect without waiting for session expiry. |
| SMS delivery | `Not sent`, `Queued`, `Submitted to SMS provider`, and `Failed` are operator-facing states; submitted is not treated as read. | Delivery attempts are stored without exposing OTP values or invitation tokens in lists. |
| Incorrect invitation number | The recipient cannot edit the destination; they must contact the inviter and receive a reissued invitation. | The public invitation flow verifies the fixed phone and explains this recovery path. |
| Mobile recovery | Super Admin reviews evidence and records the decision, reason, and restricted evidence reference. No evidence means no change. | Recovery is separate from ordinary profile editing and invalidates all sessions after completion. |
| Password migration | Password login remains as a compatibility fallback; public self-registration is disabled. | Existing accounts are not deleted while controlled OTP login is added. |
| Organization provisioning | Super Admin provisions organizations; users cannot self-create organizations. | Public registration no longer bypasses controlled provisioning. |

## Security invariants

- Raw invitation tokens are not returned by ordinary management-list endpoints.
- Invitation acceptance requires an OTP bound to the exact invitation token and normalized destination mobile.
- Invitation acceptance uses a server-side claim state to reduce replay/race acceptance.
- Account identity is preserved when organization/project access is revoked.
- A no-access account can view its profile and sign out, but cannot access organization or project content.
- Mobile changes preserve the user ID and memberships, require new-mobile verification plus old-mobile verification or approved recovery, and invalidate all sessions.
- Audit records contain actor, target, organization/project scope, action, and timestamp, but not OTP values, passwords, or raw invitation tokens.
