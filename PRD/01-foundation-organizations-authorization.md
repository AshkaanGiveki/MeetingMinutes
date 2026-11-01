# Phase 1 PRD — Foundation, Organizations, and Authorization

Version: 1.1 — Development sequence edition  
Date: October 21, 2026  
Status: Draft for product review

## Phase Objective and Delivery Boundary

Establish immutable account identity, organization/project membership records, role boundaries, authorization enforcement, organization provisioning, and audit foundations. Implement role-grant contracts before exposing onboarding UI. Use controlled existing accounts/test fixtures during development; do not introduce public signup. Production onboarding depends on Phase 2. Project rules in this phase define the shared model; their management UI ships in Phase 3. A minimal authorized landing page and profile/sign-out shell are required for Phase 2 integration.

Exit gate: organization isolation, scoped role checks, persistent-account invariants, required-role continuity, audit foundations, and controlled Super Admin bootstrap are verified. Full project management is not claimed complete here.

## Reading Rules

This PRD is one development phase. Read 00-README.md first. Original requirement text is retained below without shortening. Source section numbers and acceptance IDs remain stable; prefix IDs with R- (roles) or I- (identity) to avoid collisions. Cross-phase references identify contracts or later delivery, not extra scope for the current phase. New distribution and guest notes in this edition take precedence over older SMS-only wording and future-document references.

### Source: Roles R1

## 1. Purpose

Introduce a controlled organization and project access model for Accord. Platform administrators provision organizations; organization administrators manage internal membership and authorize project managers; project managers assemble project execution members and appoint the receiving-side lead.

Each person has one persistent account and may hold different roles across multiple organizations and projects. Removing a role or membership revokes the corresponding access without deleting or closing that account.

---

### Source: Roles R2

## 2. Goals

- Prevent public, self-service organization creation.
- Delegate organization operations without requiring Super Admin involvement in project staffing.
- Keep the first release simple: execution teams exist only as project member lists.
- Support one receiving team per project, managed by its appointed lead.
- Let a person access all authorized contexts through one account.
- Clearly separate account identity, organization membership, and project permissions.
- Provide a useful signed-in state even when a person has no remaining access.

---

### Source: Roles R3

## 3. Scope

### Included

- Role definitions and initial administrative permissions.
- Organization and project membership boundaries.
- Assignment and removal of roles and project members.
- Persistent accounts after access removal.
- Organization/project selection and role-aware page structure.
- Feature slices, user scenarios, and acceptance criteria.

### Excluded

- Account creation mechanics, invitations, mobile verification, login, password recovery, and account matching implementation.
- Detailed meeting, document, signature, action-item, delivery, and approval permissions.
- Custom roles, execution-team leads, reusable organization teams, and intermediate management roles.
- Organization/project deletion, archival, and lifecycle policies.
- Separate security, account deletion, or legal retention policies. This PRD specifies that role and membership removal must never trigger account closure; it does not define every possible account lifecycle action.

---

### Source: Roles R4

## 4. Product Decisions

1. Only the Super Admin creates organizations and appoints Organization Admins.
2. Organization Admins manage internal organization members and authorize Project Managers.
3. Authorized Project Managers create projects within their organization.
4. Every project has exactly one active Project Manager.
5. A project execution team is its execution member list. No separate team entity or Execution Team Lead exists in this release.
6. A Project Manager selects execution members only from existing active internal members of the same organization.
7. Each project has zero or one receiving team. Once established, that team has exactly one Receiving Lead and may have multiple Receiving Members.
8. The Project Manager appoints or replaces the Receiving Lead. The Receiving Lead adds and removes ordinary Receiving Members.
9. Receiving-side participants do not need internal membership in the host organization.
10. A person can participate in multiple projects and organizations using the same account, with permissions evaluated in the selected context.
11. Removing access never deletes the person's account, profile, or unrelated memberships.
12. A signed-in person with no roles or memberships can access their profile and sign out, and sees a clear no-access state.

---

### Source: Roles R5

## 5. Terminology and Role Model

| Role | Scope | Responsibility |
|---|---|---|
| Super Admin | Platform | Creates organizations and appoints or removes Organization Admins. |
| Organization Admin | Organization | Manages internal members, grants Project Manager eligibility, and maintains project management continuity. |
| Project Manager | Project, supported by organization-level eligibility | Creates and manages assigned projects, selects execution members, and appoints the Receiving Lead. |
| Execution Member | Project | Participates in the execution side of an assigned project. |
| Receiving Lead | Project | Leads the receiving side and manages its ordinary members. Operational review/approval powers will be specified later. |
| Receiving Member | Project | Participates on the receiving side of an assigned project. |

**Receiving Team** means the Receiving Lead and Receiving Members of a single project. It is not a reusable organization team.

**Project Manager eligibility** is an organization-scoped grant allowing a person to create projects. **Project Manager assignment** identifies the person managing a specific project. The UI may use the same role name, but these permissions must remain distinguishable.

An Organization Admin may also be authorized as a Project Manager. Different roles can coexist across contexts; selecting a project determines the applicable project role.

---

### Source: Roles R6

## 6. Conceptual Data Model

| Concept | Required relationships and rules |
|---|---|
| Account | One persistent person identity, reused across contexts. Mobile-based identity and verification details belong to the authentication PRD. |
| Organization | Has internal memberships, Organization Admin assignments, and projects. |
| Internal Organization Membership | Connects an account to an organization; alone does not grant access to all project content. |
| Project Manager Eligibility | Organization-scoped authorization attached to an active internal member. |
| Project | Belongs to exactly one organization and has exactly one active Project Manager. |
| Execution Membership | Connects an active internal organization member to a project in that organization. |
| Receiving Lead Assignment | Connects one account to the receiving-side lead position in one project. |
| Receiving Membership | Connects an account to the receiving side of one project without granting internal organization access. |

Membership records and role assignments must reference the existing account rather than create project-specific identities. Future account provisioning flows must honor this model.

---

### Source: Roles R7

## 7. Initial Permission Matrix

“Own” means the organization or project for which the person holds the relevant role. A dash means no permission is granted by that role. Permissions from separately held roles still apply in their respective scopes.

| Capability | Super Admin | Organization Admin | Project Manager | Execution Member | Receiving Lead | Receiving Member |
|---|---|---|---|---|---|---|
| Create organization | Yes | — | — | — | — | — |
| View administrative organization list | All | Own | — | — | — | — |
| Appoint/remove Organization Admin | Yes | — | — | — | — | — |
| Manage internal organization membership | — | Own | — | — | — | — |
| Grant/revoke Project Manager eligibility | — | Own | — | — | — | — |
| Browse active internal members for project staffing | — | Own | Own organization; necessary fields only | — | — | — |
| Create project | — | Only with Project Manager eligibility | In eligible organization | — | — | — |
| View administrative project list and basic metadata | — | All in own organization | Assigned projects | — | — | — |
| Access project workspace | No automatic access | No automatic access | Assigned projects | Member projects | Assigned projects | Member projects |
| Transfer project management | — | Own organization; to eligible member | — | — | — | — |
| Add/remove execution members | — | — | Own projects | — | — | — |
| Appoint/replace Receiving Lead | — | — | Own projects | — | — | — |
| Add/remove ordinary Receiving Members | — | — | — | — | Own projects | — |
| Modify execution members from receiving-side role | — | — | — | — | — | — |
| View names and roles of project participants | No automatic access | No automatic access | Yes | Yes | Yes | Yes |
| Select authorized workspace/project | Authorized contexts | Authorized contexts | Authorized contexts | Authorized contexts | Authorized contexts | Authorized contexts |
| Access own profile and sign out | Yes | Yes | Yes | Yes | Yes | Yes |

### Permission boundaries

- Organization Admin project metadata includes project name, assigned manager, and basic status; it does not include meeting/document content by default.
- Super Admin and Organization Admin are administrative roles, not automatic content-access roles.
- Project participant lists expose names and roles by default. Contact detail visibility is deferred.
- Receiving Members are managed by the Receiving Lead, not by the Project Manager in this release. The Project Manager retains control over who occupies the Receiving Lead position.
- Operational permissions not specified here remain ungranted until defined in their corresponding PRDs.
- The same checks must apply in the UI, direct links, and server-side requests.

---

### Source: Roles R8

## 8. Role Removal and Account Persistence

### 8.1. Core invariant

Role removal and membership removal must never delete, close, or disable the account as a side effect. They remove only the associated authorization. The person can continue signing in.

| Action | Authorized actor | Effect |
|---|---|---|
| Remove Execution Member from project | Project Manager | Revokes execution access to that project only. |
| Remove ordinary Receiving Member | Receiving Lead | Revokes receiving access to that project only. |
| Replace/remove Receiving Lead assignment | Project Manager | Ends the old lead assignment; does not automatically make that person an ordinary Receiving Member. |
| Replace/remove Project Manager assignment | Organization Admin | Ends management access to that project, with a replacement assigned atomically. |
| Revoke Project Manager eligibility | Organization Admin | Removes organization-level project creation authority; active managed projects must be reassigned first or in the same operation. |
| Remove Organization Admin role | Super Admin | Ends administration access to that organization; account and independent memberships remain. |
| Remove/deactivate internal organization membership | Organization Admin | Revokes dependent internal access within that organization; active management responsibilities must first be transferred. Independent receiving-side memberships are not implicitly removed. |

### 8.2. Continuity and independent assignments

- Removing an active Project Manager must not leave the project without a manager. Reassignment and removal complete together or neither completes.
- Replacing a Receiving Lead must not leave an existing receiving team without a lead.
- Removing the last Organization Admin requires a replacement in the same operation under the baseline continuity rule.
- Removing a managerial role does not automatically grant a lower role.
- An explicitly assigned, independent membership remains unless it is also removed or depends on the revoked organization membership.
- Removing a person does not erase existing documents, signatures, or historical attribution. Detailed retention and display rules are deferred to the relevant PRDs.

---

### Source: Roles R12 — program context

## 12. Baseline Assumptions for Review

The following rules resolve details not fully specified in the discussion and should be explicitly reviewed before implementation:

| Assumption | Proposed baseline |
|---|---|
| Last Organization Admin removal | Requires a replacement in the same operation. |
| Execution and receiving participation in the same project | A person cannot simultaneously occupy both sides in the same project in this release. Different roles across different projects remain supported. |
| Administrative content visibility | Super Admin and Organization Admin receive no automatic project-content access. |
| Multiple Organization Admins | This PRD does not require multiple admins; removal must preserve at least one. Final cardinality can be settled before implementation. |
| Historical member display | Preserve attribution after access removal; detailed retention policy is deferred. |

---

### Source: Roles R13 — program context

## 13. Follow-up PRDs

| PRD | Questions to resolve |
|---|---|
| Identity, provisioning, and login | How accounts are created/invited; mobile verification; account reuse; first login; recovery; duplicate invitations. |
| Project operations | Project fields, editing, statuses, archival, lifecycle, and detailed operational permissions. |
| Meetings, documents, and signatures | Create, edit, view, comment, request signatures, sign, seal, export, and role-specific visibility. |
| Actions and decisions | Assignment, deadlines, progress updates, dependencies, and accountability. |
| Delivery and acceptance | Submission, review, revisions, and Receiving Lead final acceptance authority. |
| Notifications | Relevant events, recipients, channels, and preferences. |

---

### Source: Roles R14 — program context

## 14. Definition of Done

This scope is complete when organizations and projects have accountable administrators, memberships follow the permission matrix, users can navigate all authorized contexts through one persistent account, access revocation is enforced without account closure, and no-access users retain a clear profile-only signed-in experience. Detailed workflow permissions remain explicitly deferred rather than inferred.

---

### Source: Identity I1 — shared contract

## 1. Purpose

Provide controlled onboarding through invitations, mobile OTP authentication, persistent accounts, and scoped user management. A person verifies their own mobile number and completes their profile before a new account becomes active. Existing accounts are reused across organizations and projects.

The companion roles PRD remains authoritative for organizational and project authorization. This document defines how people are invited, authenticated, onboarded, maintained, and removed from scopes without losing their account.

---

### Source: Identity I2 — shared contract

## 2. Goals and Non-goals

### Goals

- Eliminate public self-registration and password-based login for this flow.
- Allow an authorized actor to invite a person using only a mobile number.
- Keep invitations, accounts, and memberships separate.
- Require verification of the invited mobile number before accepting access.
- Support one account across multiple organizations and projects.
- Give administrators actionable invitation and membership management views.
- Preserve identity and history when access or a mobile number changes.
- Provide a clear signed-in experience for people with no remaining access.

### Non-goals

- Public organization creation, custom roles, account merging, permanent account deletion, or social login.
- Detailed meeting, signature, delivery, and action-item permissions.
- Automatic reminders, bulk imports, and bulk invitation campaigns in this release.
- Full implementation design for SMS delivery or identity-proofing systems.

---

### Source: Identity I3 — shared contract

## 3. Core Invariants

1. An account has an immutable internal identifier. Its mobile number is a unique, verified login identifier, not its primary identity.
2. Mobile numbers are normalized consistently before matching or uniqueness checks.
3. Creating an invitation does not create an active account or active membership.
4. A new account becomes active only after mobile OTP verification and completion of required profile fields.
5. Project/organization access becomes active only after valid invitation acceptance or an authorized assignment to an already active internal member.
6. An existing account is reused. An invitation must not overwrite its name or profile.
7. Removing a role or membership never closes the account, prevents normal login, or removes independent access elsewhere.
8. Invitation links do not independently prove identity or grant access.
9. Users cannot edit roles, memberships, or their mobile number through ordinary profile editing.
10. Server-side authorization is required regardless of visible UI controls.

---

### Source: Identity I4 — shared contract

## 4. Actors and Invitation Authority

| Actor | May invite | Scope | Existing-user alternative |
|---|---|---|---|
| Super Admin | Organization Admin | Selected organization | Assign an existing account through the authorized appointment flow. |
| Organization Admin | Internal Member; eligible Project Manager | Own organization | Grant Project Manager eligibility to an existing active internal member without another invitation. |
| Project Manager | Receiving Lead | Own managed project | Appoint an existing account, subject to acceptance of the appointment. |
| Receiving Lead | Ordinary Receiving Member | Own project | Invite the existing account to accept the new receiving membership. |
| Execution Member | Nobody | — | — |
| Receiving Member | Nobody | — | — |

### Boundaries

- A Project Manager adds Execution Members only from existing active internal members of the same organization. They cannot invite new internal accounts.
- A Receiving Lead cannot appoint a replacement lead or change execution members.
- A Project Manager appoints/replaces the Receiving Lead, but ordinary receiving-member invitations belong to the Receiving Lead.
- A new Project Manager invitation includes internal organization membership and Project Manager eligibility, activated on acceptance.
- Invitation authority is checked both when issuing and when accepting an invitation.
- If the issuer loses the necessary authority while an invitation is pending, that invitation cannot be accepted. The current authorized actor must reissue it.
- Invitations for replacing an active administrator or lead do not remove the incumbent before successful acceptance.

---

### Source: Identity I5 — shared contract

## 5. Conceptual Records and States

| Record | Key information |
|---|---|
| Account | Immutable account ID, unique verified mobile, first name, last name, optional profile fields. |
| Invitation | ID, normalized destination mobile, organization/project, offered role, issuer, created/expiry times, lifecycle status, acceptance account/time. |
| Delivery attempt | Invitation ID, attempt time, provider outcome, non-secret diagnostic code. |
| Membership/assignment | Account, scope, role, active/revoked state, grant/revocation history. |
| OTP challenge | Purpose, destination, expiry, attempt controls, consumed state; never displayed in administrative lists. |
| Mobile-change request | Account, initiating actor, target number, verification/review state, timestamps. |

### Invitation lifecycle

`Pending → Accepted | Expired | Cancelled`

- Delivery status is separate: `Queued`, `Submitted to SMS provider`, or `Failed`.
- Acceptance is terminal. Opening the link again must not grant another membership.
- Expired invitations may be reissued, producing a new valid token and expiry while preserving history.
- Resending rotates the token and invalidates earlier links. It does not create another active invitation for the same scope and role.
- A suspended/invalid destination or lost issuer authority makes a pending invitation non-actionable; show a clear reason without pretending it was accepted.

### Account lifecycle within this PRD

`No active account → Verified onboarding → Active account`

Incomplete onboarding may be retained as a provisional record, but must not appear as an active member or receive project access. Administrative access removal is not an account lifecycle transition.

---

### Source: Roles acceptance R-AC slice 1

### Slice 1 — Organization provisioning and administration

**Outcome:** Super Admin creates an organization and appoints its administrator.

- **AC-1.1:** Non-Super Admin users cannot create an organization through any supported route or request.
- **AC-1.2:** A provisioned organization has an assigned Organization Admin.
- **AC-1.3:** Organization Admins can administer only their assigned organizations.
- **AC-1.4:** Super Admin can replace an Organization Admin without deleting the former administrator's account.
- **AC-1.5:** Removing the last administrator succeeds only with a valid replacement in the same operation.
- **AC-1.6:** Administrative assignment alone does not grant project content access.

---

### Source: Roles acceptance R-AC slice 7

### Slice 7 — Authorization enforcement and auditability

**Outcome:** Administrative boundaries are enforced consistently and changes are traceable.

- **AC-7.1:** Server-side authorization checks apply to every protected read and mutation.
- **AC-7.2:** Changing an organization or project identifier does not grant access.
- **AC-7.3:** Unspecified permissions default to denied.
- **AC-7.4:** Role grants, revocations, manager transfers, lead replacements, and membership changes are recorded with actor, target, scope, action, and timestamp.
- **AC-7.5:** Failed continuity operations leave existing assignments unchanged.
- **AC-7.6:** Contact details are not exposed merely because project participant names are visible.

## Future Capability: Guest Users

Guest users are a planned separate capability. Their definition, invitation rules, permissions, lifecycle, and UI will be supplied in a later PRD. Do not equate a guest with a Receiving Member, an external-only account, or a no-access account, and do not grant guest permissions in these phases.
