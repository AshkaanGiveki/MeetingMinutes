# Phase 3 PRD — Project Membership, User Management, and Context Navigation

Version: 1.1 — Development sequence edition  
Date: October 21, 2026  
Status: Draft for product review

## Phase Objective and Delivery Boundary

Depends on Phases 1 and 2. Implement internal-member administration, Project Manager eligibility, project creation and transfer, execution membership, the single receiving team and its delegated membership management, scoped invitation entry points, and organization/project switching. Deliver all role-specific lists and empty states. Reuse Phase 2 invitation and authentication services; do not create a second onboarding mechanism.

Exit gate: all six roles can perform only their scoped management actions; mixed-context users see all and only their authorized projects; removal preserves accounts and unrelated access; managerial replacement is atomic.

## Reading Rules

This PRD is one development phase. Read 00-README.md first. Original requirement text is retained below without shortening. Source section numbers and acceptance IDs remain stable; prefix IDs with R- (roles) or I- (identity) to avoid collisions. Cross-phase references identify contracts or later delivery, not extra scope for the current phase. New distribution and guest notes in this edition take precedence over older SMS-only wording and future-document references.

### Source: Roles R9

## 9. Navigation and Page Structure

### 9.1. Shared project shell

The header identifies the current context:

`Organization / Project / Current role`

The page menu and content derive from that selected context. Role is an indicator, not a manual role-switching control. If the person holds multiple applicable administrative permissions, authorized capabilities are combined within the same scope.

### 9.2. Role-specific entry points

| User context | Landing page | Header/selectors | Main navigation |
|---|---|---|---|
| Super Admin | Organization administration | Platform context; organization selection for administration | Organizations, Organization Admin assignments, profile |
| Organization Admin | Organization administration | Authorized organization selector | Internal members, Project Manager eligibility, project metadata, profile |
| Project Manager / Execution Member | My Projects or selected project | Organization then authorized project; current role visible | Project workspace and role-permitted functions |
| Receiving Lead / Receiving Member | My Projects | Project selector with host organization labels; no independent organization administration selector | Authorized project workspace; Receiving Lead additionally sees receiving-team management |
| Mixed internal and receiving-side memberships | My Projects | Unified project selection grouped/labeled by organization; project context determines role | Navigation changes with selected project |
| No roles or memberships | No-access landing page | No organization or project selector | Profile and sign out only |

### 9.3. Selection behavior

- Internal users with multiple organizations select an organization and then a project they can access within it.
- Receiving-only users select from authorized projects directly. Each option includes the host organization to distinguish duplicate names.
- “My Projects” includes all projects with explicit project access, including internal and receiving-side contexts.
- A single available organization or project may be displayed as a fixed label instead of requiring an extra selection step.
- Organization Admins with no project membership still retain their organization administration pages.
- An eligible Project Manager with no projects retains the authorized create-project action. Lack of projects alone is not equivalent to lack of permissions.

### 9.4. Context switching

- Switching context refreshes visible data, navigation, and effective permissions.
- Information from the previous context must not remain visible in the new one.
- If the current page is unavailable in the new context, navigate to its authorized landing page.
- Warn before discarding unsaved changes.
- Direct links must resolve only after authorization checks. Unauthorized links must not expose project content or confidential metadata.
- If current access is revoked, clear the inaccessible context and route to another authorized landing page or the no-access state.

### 9.5. Empty and no-access states

Do not render blank pages. A person with no remaining permissions sees:

> You do not currently have access to an organization or project. Your workspace will appear here when an administrator grants you access.

Profile and sign out remain available. Organization/project selectors, operational menus, and self-service organization creation are absent.

---

### Source: Roles R11

## 11. User Scenarios

### Scenario A — Provision an organization

The Super Admin creates Alpha and appoints Mary as Organization Admin. Mary establishes the internal member pool and authorizes Ali as a Project Manager. Ali can create projects in Alpha without further Super Admin action.

### Scenario B — Assemble project execution members

Ali creates Website Redesign and selects Sara and Reza from Alpha's existing active members. They become that project's execution team. Sara can also participate in Mobile App without any reusable team setup.

### Scenario C — Delegate receiving-side management

Ali appoints Narges as Receiving Lead for Website Redesign. Narges adds two colleagues as Receiving Members. They can access only that project and cannot browse Alpha's internal staff directory or other projects.

### Scenario D — One account, different contexts

Sara is an Execution Member in an Alpha project and a Receiving Lead in a Beta project. She signs in once and selects either project from My Projects. The selected project's organization, role, and permissions appear automatically.

### Scenario E — Remove one project membership

Narges removes a Receiving Member from Website Redesign. That person loses access to Website Redesign but keeps their account and access to a different project.

### Scenario F — Replace a Project Manager

Mary transfers Website Redesign from Ali to Reza, an eligible manager in Alpha. The transfer completes as one operation. Ali loses that project's management access without account closure or automatic demotion to Execution Member.

### Scenario G — Remove Organization Admin access

The Super Admin replaces Mary with another Organization Admin. Mary's account remains usable. Independent project memberships remain available, but Alpha's organization administration pages disappear for Mary.

### Scenario H — No remaining access

A person's last membership is removed. On their next authorized-state refresh, they see the no-access message and can open their profile or sign out. They cannot create their own organization to bypass provisioning.

### Scenario I — Administrator without projects

An Organization Admin has no project memberships. They still see organization administration and project metadata. They do not receive an account-wide no-access state merely because their project list is empty.

---

### Source: Identity I9

## 9. User Management Pages

### 9.1. Organization Members — Organization Admin

- Search active/revoked internal memberships by permitted name/mobile fields.
- Show name, mobile, membership state, and organization-level role/eligibility.
- Invite an internal member or Project Manager.
- Grant/revoke Project Manager eligibility for existing internal members.
- Remove internal membership subject to management-continuity checks.
- Initiate an eligible mobile-change request through a distinct action.
- Link to organization invitation queue.

### 9.2. Project Execution Members — Project Manager

- Show current execution members and their project roles.
- Add from active internal members of the same organization.
- Remove that project's execution membership.
- If a person is absent from the organization, show: “Ask your Organization Admin to invite this person before adding them to the project.”
- Do not expose new-user invitation or direct mobile editing here.

### 9.3. Receiving Team

- Project Manager sees team composition and can invite/replace the Receiving Lead.
- Receiving Lead sees team composition and can invite/remove ordinary Receiving Members.
- Ordinary project participants can view permitted names and roles, without invitation-management actions.
- Contact detail visibility is limited to authorized management needs; a participant list is not a general mobile directory.

### 9.4. Invitation Queue

The queue tracks invitation lifecycle and follow-up, not only SMS transport.

| Field | Display |
|---|---|
| Destination mobile | Normalized number, subject to role-scoped visibility. |
| Destination | Organization and project where relevant. |
| Offered role | Access proposed upon acceptance. |
| Issuer | Authorized inviter. |
| Invitation status | Pending, Accepted, Expired, Cancelled. |
| Delivery status | Queued, Submitted to SMS provider, Failed. |
| Timestamps | Created, last sent, expires, accepted where applicable. |

Actions: search, filter by scope/role/status, inspect history, Invite New, resend subject to cooldown, cancel pending invitation, and reissue expired invitation.

“Submitted to SMS provider” must not be presented as “read” or guaranteed delivery. Only show a delivery confirmation when the provider actually supplies one.

### Queue visibility and authority

- Super Admin: Organization Admin invitations in platform administration.
- Organization Admin: internal-member and Project Manager invitations in their organization.
- Project Manager: Receiving Lead invitations in projects they manage.
- Receiving Lead: ordinary Receiving Member invitations in projects they lead.
- Visibility and management derive from current role and scope, not only invitation authorship; a successor can manage the relevant queue.
- An accepted invitation cannot be cancelled. Revoke its membership through user management instead.
- A cancelled or superseded link cannot be reused.

---

### Source: Roles acceptance R-AC slice 2

### Slice 2 — Internal members and Project Manager eligibility

**Outcome:** Organization Admin controls the internal member pool and who may manage projects.

- **AC-2.1:** Only the Organization Admin can manage internal memberships and Project Manager eligibility for that organization.
- **AC-2.2:** An eligibility grant in Organization A does not authorize project creation in Organization B.
- **AC-2.3:** Project Managers can browse only the active internal members needed to staff projects in their organization.
- **AC-2.4:** Revoking eligibility requires reassignment of active managed projects before or within the operation.
- **AC-2.5:** Membership removal revokes dependent internal project access while preserving the account and independent access elsewhere.
- **AC-2.6:** Account creation, invitation, and activation behavior remains owned by the future identity PRD.

---

### Source: Roles acceptance R-AC slice 3

### Slice 3 — Project creation and execution membership

**Outcome:** An eligible Project Manager creates a project and selects execution members.

- **AC-3.1:** An eligible Project Manager can create a project only in the organization granting that eligibility.
- **AC-3.2:** The creator becomes the initial Project Manager; the project cannot exist without one active manager.
- **AC-3.3:** Only the assigned Project Manager can add or remove execution members for that project.
- **AC-3.4:** Execution members must be active internal members of the project's organization.
- **AC-3.5:** Repeated addition of the same member does not create duplicate memberships.
- **AC-3.6:** A person can be an Execution Member in multiple projects.
- **AC-3.7:** Removing membership in Project A leaves independent membership in Project B unchanged.
- **AC-3.8:** Organization Admin can transfer management to another eligible internal member atomically.
- **AC-3.9:** No reusable execution-team entity or Execution Team Lead is required or displayed.

---

### Source: Roles acceptance R-AC slice 4

### Slice 4 — Receiving team and delegated membership management

**Outcome:** Project Manager appoints a Receiving Lead who manages the receiving participants.

- **AC-4.1:** A project can initially have no receiving team.
- **AC-4.2:** Only its Project Manager can appoint or replace its Receiving Lead.
- **AC-4.3:** A project cannot have a second receiving team or multiple active Receiving Leads.
- **AC-4.4:** Only its Receiving Lead can add or remove ordinary Receiving Members.
- **AC-4.5:** Receiving-side participants are not required to be internal organization members.
- **AC-4.6:** Receiving-side membership grants no organization administration, staff-directory, or unrelated-project access.
- **AC-4.7:** Receiving Lead cannot change execution membership, replace themselves, or appoint another Receiving Lead.
- **AC-4.8:** A receiving participant can belong to several projects through one account.
- **AC-4.9:** Replacing the lead preserves the receiving team's other memberships and does not automatically retain the former lead as an ordinary member.

---

### Source: Roles acceptance R-AC slice 5

### Slice 5 — Context-aware navigation

**Outcome:** Each person can find their authorized spaces and understand their current role.

- **AC-5.1:** Selectors contain only authorized options, with administrative organization lists separated from project-content access.
- **AC-5.2:** Internal multi-organization users can select an organization and an accessible project within it.
- **AC-5.3:** Receiving-only users see accessible projects with host organization labels and no organization administration navigation.
- **AC-5.4:** Mixed-role users can find all their authorized projects in My Projects.
- **AC-5.5:** Selecting a project displays its organization, project name, and current role, and updates permitted navigation.
- **AC-5.6:** Users with one available context are not forced through redundant selection steps.
- **AC-5.7:** Unsaved changes prompt a warning before context switching discards them.
- **AC-5.8:** Unauthorized direct links do not expose protected content.

---

### Source: Roles acceptance R-AC slice 6

### Slice 6 — Access revocation and persistent account state

**Outcome:** Access can be removed without closing the account or disrupting unrelated memberships.

- **AC-6.1:** Removing any role or membership leaves the underlying account available for login.
- **AC-6.2:** Revoked authorization is rejected on the next protected request, including in an already open session.
- **AC-6.3:** Revocation in one context does not remove independent roles or memberships in another.
- **AC-6.4:** Removing a role does not implicitly assign a lower role.
- **AC-6.5:** A signed-in account with no remaining permissions sees the no-access landing page, profile, and sign out only.
- **AC-6.6:** A user without project membership but with organization administration or project-creation permissions retains those functions.
- **AC-6.7:** Existing historical records are not deleted as a side effect of membership removal.
- **AC-6.8:** The current page exits its protected context when that access is revoked.

---

### Source: Identity acceptance I-AC slice 5

### Slice 5 — User and membership management

**Outcome:** Authorized actors manage their members without deleting identities.

- **AC-5.1:** Organization Admin manages only internal memberships and eligibility in their organization.
- **AC-5.2:** Project Manager selects execution members only from the same organization's active internal pool.
- **AC-5.3:** Receiving Lead manages only ordinary receiving memberships in their project.
- **AC-5.4:** Removing a membership preserves account login and unrelated memberships.
- **AC-5.5:** Removing a management assignment does not create a lower role automatically.
- **AC-5.6:** Project Manager removal requires valid reassignment before or in the same operation.
- **AC-5.7:** Removing the last Organization Admin or replacing an established Receiving Lead preserves required continuity.
- **AC-5.8:** Historical documents, signatures, and attribution are not erased by access removal.
- **AC-5.9:** A removed member cannot regain access through an old accepted invitation.

## Future Capability: Guest Users

Guest users are a planned separate capability. Their definition, invitation rules, permissions, lifecycle, and UI will be supplied in a later PRD. Do not equate a guest with a Receiving Member, an external-only account, or a no-access account, and do not grant guest permissions in these phases.
