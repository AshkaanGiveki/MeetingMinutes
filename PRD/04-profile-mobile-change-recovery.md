# Phase 4 PRD — Profile, Mobile Number Change, and Recovery

Version: 1.1 — Development sequence edition  
Date: October 21, 2026  
Status: Draft for product review

## Phase Objective and Delivery Boundary

Depends on Phases 1–3. Deliver self-service allowed-profile editing and the controlled shared-account mobile-change/recovery workflow, including external-only accounts, session invalidation, notifications, collision prevention, and immutable historical identity.

Exit gate: profile updates cannot change authorization; number changes require the specified verification/review, preserve account identity and memberships, and invalidate old sessions. Recovery cannot launch until ownership-evidence and reviewer procedures are approved.

## Reading Rules

This PRD is one development phase. Read 00-README.md first. Original requirement text is retained below without shortening. Source section numbers and acceptance IDs remain stable; prefix IDs with R- (roles) or I- (identity) to avoid collisions. Cross-phase references identify contracts or later delivery, not extra scope for the current phase. New distribution and guest notes in this edition take precedence over older SMS-only wording and future-document references.

### Source: Identity I8

## 8. Profile and Mobile Number Management

### Self-service profile

- Account owner can edit first name, last name, and approved optional profile fields such as profile image.
- First and last name remain required after activation.
- Ordinary profile editing cannot change mobile, roles, scope memberships, or verification status.
- Account-level profile changes are reflected across authorized contexts because the account is shared.
- Managers may manage memberships; they do not silently overwrite an active user's personal profile.

### Mobile change

Changing a mobile changes the login identifier for the shared account across all organizations. It is not an organization-local edit.

1. An Organization Admin for an active internal membership initiates a number-change request for that person. A Super Admin handles people without an eligible organization administrator, including external-only users.
2. System checks that the target number is valid and not attached to another account.
3. New number must be verified with OTP.
4. If the current number is accessible, verify approval through the current number as well.
5. If the current number is inaccessible, route to Super Admin recovery review. New-number OTP alone does not establish ownership of the old account.
6. On approval and required verification, update the same account atomically; preserve account ID, memberships, roles, documents, and attribution.
7. Invalidate existing sessions and require login with the new number. Notify the previous and new numbers when feasible.

### Recovery boundaries

- No automatic account merge when the target number belongs to another account.
- No administrator can bypass the required number verification through a direct profile edit.
- Record initiator, account, old/new identifier references, verification/review outcome, and time with appropriate restricted visibility.
- Recovery evidence and reviewer instructions must be defined before recovery is enabled in production. If review cannot establish ownership, keep the existing identifier and access unchanged.
- Pending invitations to the previous number are not silently transferred; authorized inviters must reissue them as needed.

---

### Source: Identity acceptance I-AC slice 6

### Slice 6 — Profile, mobile change, and recovery

**Outcome:** Personal information is editable while login-identifier changes preserve identity securely.

- **AC-6.1:** Users can edit approved profile fields but not mobile, roles, memberships, or verification status through the profile form or equivalent request.
- **AC-6.2:** New-number verification is required before any mobile change completes.
- **AC-6.3:** Accessible old numbers require approval verification; inaccessible old numbers require Super Admin recovery review.
- **AC-6.4:** A number already bound to another account is rejected; no automatic merge occurs.
- **AC-6.5:** Successful change preserves the account ID and all independent memberships and history.
- **AC-6.6:** Failed or incomplete change leaves the current number and account access unchanged.
- **AC-6.7:** Successful change invalidates existing sessions and subsequent login uses the new number.
- **AC-6.8:** Mobile change is audited and notification attempts are recorded.
- **AC-6.9:** External-only and no-organization users have a Super Admin recovery path.

## Future Capability: Guest Users

Guest users are a planned separate capability. Their definition, invitation rules, permissions, lifecycle, and UI will be supplied in a later PRD. Do not equate a guest with a Receiving Member, an external-only account, or a no-access account, and do not grant guest permissions in these phases.
