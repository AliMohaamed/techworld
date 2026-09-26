# Feature Specification: Support Center & Customer Complaint Ticketing

**Feature Branch**: `014-support-ticketing-hub`  
**Created**: 2026-09-18  
**Status**: Draft  
**Input**: User description: "I want to build a customer complaints/support ticket system that is available in the Support page (`/[locale]/support`) and also in the dashboard. I want to be able to give the team access to the support system and allow them to manage everything related to complaints and support. Also, the Support page should include all the features and information you would expect from a professional e-commerce company, such as e-commerce partnerships, customer support, complaints, returns, refunds, order issues, FAQs, contact options, and other relevant support services."

## Overview

Today the storefront has no Support page at all (`/en/support` returns 404) and the business has no structured channel for complaints — customers reach the team through ad-hoc WhatsApp messages, which are invisible to the dashboard, unassignable, unmeasurable, and lost when a staff member is unavailable.

This feature delivers two halves of one system:

1. **A public Support Center** on the storefront — a self-service hub that answers the common questions (FAQs, shipping, returns, refunds, warranty, order issues), exposes every contact channel, and funnels anything it cannot answer into a structured request.
2. **A Support workspace in the admin dashboard** — a permission-gated queue where the team triages, assigns, replies to, escalates, and resolves every incoming request, with full audit history and SLA visibility.

The storefront has no customer accounts (anonymous session only), so the entire customer-facing experience must work for a guest: submit without signing up, and come back later with a reference code to check status and reply.

## Clarifications

### Session 2026-09-18

- Q: How is a customer notified when an agent replies to their ticket? → [NEEDS CLARIFICATION: notification channel — on-site retrieval only, WhatsApp outbound message, email, or a combination?]
- Q: May a support agent act on a linked order (cancel, mark RTO, trigger refund) from inside the support workspace? → [NEEDS CLARIFICATION: order-action authority — read-only handoff to the Orders module, or in-context actions gated by the existing order permissions?]

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Customer files a complaint or support request (Priority: P1)

A customer who received a damaged item, or whose order never arrived, opens the Support page, picks the category that matches their problem ("Order issue"), enters their order reference and phone number, describes what went wrong, attaches a photo, and submits. They immediately receive a ticket reference code on screen and are told the expected response time.

**Why this priority**: This is the core of the request — without an intake channel there is no ticketing system. It delivers standalone value on day one: the business starts capturing complaints in a structured, reviewable form instead of losing them in chat.

**Independent Test**: Can be fully tested by visiting the Support page as an anonymous visitor, submitting a request in each category, and confirming a persisted ticket with a unique reference code exists with the submitted details, attachments, and contact information intact.

**Acceptance Scenarios**:

1. **Given** an anonymous visitor on the Support page, **When** they submit a complaint with a valid category, description, and phone number, **Then** the system creates a ticket in the `NEW` state, generates a unique human-readable reference code, and displays that code with the expected first-response time.
2. **Given** a visitor entering an order reference that matches an existing order, **When** they submit, **Then** the ticket is linked to that order and the order's summary is visible to agents alongside the ticket.
3. **Given** a visitor entering an order reference that matches no order, **When** they submit, **Then** the system still accepts the ticket, records the reference as unverified, and does not reveal whether any order with that code exists.
4. **Given** a visitor submitting with a required field missing or malformed (empty description, invalid phone), **When** they attempt submission, **Then** the form blocks submission and shows an inline message on each offending field.
5. **Given** a visitor attaching evidence files, **When** they submit, **Then** the attachments are stored with the ticket and are retrievable by agents; files exceeding the size or type limits are rejected with a clear message before submission.
6. **Given** a phone number present on the blacklist, **When** a ticket is submitted, **Then** the ticket is accepted but automatically flagged for review rather than entering the standard queue.

---

### User Story 2 - Support agent works the queue (Priority: P1)

A support agent signs into the dashboard, opens the Support workspace, and sees every open ticket ordered by urgency and age. They open a ticket, read the customer's message and attachments, see the linked order's status, assign it to themselves, write a reply, and move the ticket to `AWAITING_CUSTOMER`. When the issue is settled they resolve it with a resolution reason.

**Why this priority**: Intake without a workspace is a black hole. P1 alongside Story 1 — together they form the minimum viable loop (customer asks, team answers).

**Independent Test**: Can be fully tested by seeding tickets and, as a user holding support permissions, filtering the queue, assigning, replying, transitioning states, and confirming every action is persisted and audit-logged.

**Acceptance Scenarios**:

1. **Given** an agent with support-queue permission, **When** they open the Support workspace, **Then** they see the tickets they are allowed to see, filterable by state, category, assignee, priority, and age, and searchable by reference code, phone, or order reference.
2. **Given** an open unassigned ticket, **When** an agent assigns it to themselves or a teammate, **Then** the assignment is recorded, the ticket state advances to `OPEN`, and an audit entry captures actor, ticket, and before/after assignee.
3. **Given** an agent viewing a ticket, **When** they post a public reply, **Then** the message is appended to the ticket thread as customer-visible, the ticket moves to `AWAITING_CUSTOMER`, and the first-response timestamp is recorded if not already set.
4. **Given** an agent viewing a ticket, **When** they post an internal note, **Then** the note is stored as staff-only and is never returned by any customer-facing lookup.
5. **Given** an agent without the financial permission, **When** they open a ticket linked to an order, **Then** order totals, discounts, and cost figures are absent from the data delivered to their client — not merely hidden in the interface.
6. **Given** a ticket in `RESOLVED`, **When** the customer replies, **Then** the ticket automatically returns to `REOPENED` and re-enters the queue.
7. **Given** an agent attempts a state change the ticket lifecycle forbids (e.g. `NEW` directly to `CLOSED`), **When** the action is submitted, **Then** it is rejected with an explanatory error and no state is written.

---

### User Story 3 - Customer tracks and continues a request without an account (Priority: P2)

Two days later, the customer wants an update. They return to the Support page, enter their ticket reference code and the phone number they used, and see the full public conversation, the current status, and a box to add a reply or more photos.

**Why this priority**: Without this, every follow-up becomes a new ticket and the thread fragments. It is the difference between a ticket system and a suggestion box — but the loop in Stories 1 and 2 can ship first.

**Independent Test**: Can be fully tested by creating a ticket, then retrieving it in a fresh browser session using reference code plus phone number, confirming the thread renders, internal notes are absent, and a customer reply appends to the same ticket.

**Acceptance Scenarios**:

1. **Given** a customer with a valid reference code and the matching phone number, **When** they submit the lookup, **Then** the ticket's status, public thread, and attachments are displayed.
2. **Given** a valid reference code with a non-matching phone number, **When** they submit the lookup, **Then** access is refused with a generic failure message that does not confirm whether the code exists.
3. **Given** repeated failed lookup attempts from the same origin, **When** a threshold is exceeded, **Then** further attempts are throttled for a cool-down period.
4. **Given** a customer viewing their ticket, **When** they post a reply, **Then** the message appends to the thread, the ticket moves out of `AWAITING_CUSTOMER` back into the active queue, and the assigned agent's queue reflects the update without a manual refresh.
5. **Given** a customer whose browser session created the ticket, **When** they revisit the Support page in that same session, **Then** their recent tickets are listed without requiring the reference code.

---

### User Story 4 - Self-service Support Center deflects common questions (Priority: P2)

A customer wondering "where is my order?" or "can I return this?" lands on the Support page and finds a searchable FAQ, plainly written policy sections for returns, refunds, shipping, warranty, and cancellations, an order-status lookup, and every way to reach the company — before ever opening a ticket.

**Why this priority**: This is the bulk of "everything you'd expect from a professional e-commerce company" and the cheapest ticket is the one never filed. It is independently valuable even with zero tickets in the system.

**Independent Test**: Can be fully tested by browsing the Support page in both languages, searching the FAQ, expanding answers, opening each policy section, looking up an order by reference and phone, and confirming every contact channel is reachable.

**Acceptance Scenarios**:

1. **Given** a visitor on the Support page, **When** the page loads, **Then** they see topic entry points covering order issues, shipping and delivery, returns, refunds, product and warranty, payment, and business partnerships.
2. **Given** a visitor typing into FAQ search, **When** they enter a term, **Then** matching questions are filtered live in the active language, and an empty result offers a direct path to open a ticket.
3. **Given** a visitor with an order reference and phone number, **When** they use the order-status lookup, **Then** the current fulfilment status of that order is shown in customer-facing language, without exposing internal financial fields or internal state names.
4. **Given** a visitor viewing contact options, **When** the page renders, **Then** the published channels, their operating hours, and expected response times are shown and are editable by staff without a code change.
5. **Given** a visitor switching to Arabic, **When** the page re-renders, **Then** all support content, FAQs, policies, and form labels appear in Arabic with correct right-to-left layout and no untranslated strings.
6. **Given** any device width from small phone to desktop, **When** the Support page is viewed, **Then** the layout remains usable with no horizontal overflow and all interactive targets remain reachable.

---

### User Story 5 - Owner grants the team access to the support system (Priority: P2)

The owner opens the team management area and grants a new hire the support permissions — letting them work the queue and reply to customers, but not touch products, financials, or user management. A senior member additionally receives the ability to reassign across the team, escalate, and edit the published FAQ and policy content.

**Why this priority**: The request explicitly asks for team access. It is prerequisite to letting anyone but the owner use Story 2 in practice, but the queue itself can be built and tested first with existing accounts.

**Independent Test**: Can be fully tested by creating staff accounts with each distinct support permission combination and verifying every support action is permitted or refused accordingly, both in navigation and at the server boundary.

**Acceptance Scenarios**:

1. **Given** a user without any support permission, **When** they sign in, **Then** the Support section is absent from navigation and any direct request for support data or actions is refused by the server.
2. **Given** a user with view-only support permission, **When** they open a ticket, **Then** they can read the thread but cannot assign, reply, transition, or delete, and those actions are refused server-side, not merely disabled in the interface.
3. **Given** a user with support-management permission, **When** they act on a ticket, **Then** assignment, replies, notes, state transitions, and priority changes all succeed.
4. **Given** a user with support-content permission, **When** they edit an FAQ entry, policy section, or contact channel, **Then** the change is published to the storefront and recorded in the audit log with before/after values.
5. **Given** any permission grant or revocation affecting support, **When** it is saved, **Then** an immutable audit entry records actor, subject, and the exact permission delta.
6. **Given** a deactivated staff account holding support permissions, **When** they attempt any support action, **Then** it is refused regardless of their permission flags.

---

### User Story 6 - Returns and refunds intake tied to real orders (Priority: P3)

A customer wants to return a product. From the Support page they start a return request, identify their order, pick the items and a reason, and submit. The request arrives in the dashboard as a ticket of type "Return" carrying the order link, reason, and evidence, where the returns team decides the outcome.

**Why this priority**: Returns are the highest-stakes support category and the request names them explicitly, but they depend on the ticket foundation from Stories 1 and 2 existing first.

**Independent Test**: Can be fully tested by submitting a return request against a delivered order and confirming a return-type ticket is created with the order link, item selection, reason, and eligibility outcome recorded.

**Acceptance Scenarios**:

1. **Given** an order within the published return window and in an eligible fulfilment state, **When** the customer submits a return request, **Then** a return ticket is created and linked to the order with the selected items and reason.
2. **Given** an order outside the return window or in an ineligible state, **When** the customer attempts a return request, **Then** the system explains why it is ineligible and offers to open a general support ticket instead.
3. **Given** a return ticket, **When** an agent lacking the returns permission opens it, **Then** they may read it but cannot record a return decision.
4. **Given** an agent with the returns permission records an outcome (approved, rejected, or partial), **When** it is saved, **Then** the outcome and its justification are stored on the ticket and written to the audit log.
5. **Given** a return decision that implies an order state change, **When** it is recorded, **Then** the order's own status is only ever altered through the established order transition rules — never by a direct write from the support workspace.
6. **Given** a duplicate return request for the same order and items while one is already open, **When** it is submitted, **Then** the system links it to the existing request rather than creating a competing one.

---

### User Story 7 - Business and partnership enquiries are handled separately (Priority: P3)

A wholesaler, reseller, or brand wants to work with the company. They use the partnership section of the Support page, submit company details and the nature of the proposal, and their enquiry lands in a dedicated dashboard queue rather than mixing with customer complaints.

**Why this priority**: Explicitly requested and commercially valuable, but lower volume and independent of the complaint loop.

**Independent Test**: Can be fully tested by submitting a partnership enquiry and confirming it appears in a distinct queue with its business-specific fields, separate from customer support tickets.

**Acceptance Scenarios**:

1. **Given** a visitor on the partnership section, **When** they submit company name, contact person, contact details, partnership type, and proposal, **Then** a partnership enquiry is created in its own queue.
2. **Given** partnership enquiries in the dashboard, **When** a user without partnership permission views the Support workspace, **Then** that queue and its records are not returned to them.
3. **Given** a partnership enquiry, **When** a permitted user records an outcome and notes, **Then** the status and notes persist and are audit-logged.

---

### User Story 8 - Support performance is measurable (Priority: P4)

A manager wants to know whether support is working: how many tickets arrived, how fast the team responded, what customers complain about most, and which tickets are breaching the promised response time.

**Why this priority**: Valuable for running the operation but adds no capability customers or agents depend on; it can follow once real data exists.

**Independent Test**: Can be fully tested by generating tickets with known timestamps and outcomes and confirming the reported volumes, response times, and breach counts match the seeded data.

**Acceptance Scenarios**:

1. **Given** a user with analytics permission, **When** they open support reporting, **Then** they see ticket volume, open and resolved counts, median first-response and resolution times, and breakdown by category and agent over a selectable date range.
2. **Given** tickets that exceeded their category's response target, **When** the queue is displayed, **Then** those tickets are visibly marked as breaching and can be filtered on that basis.
3. **Given** a user without analytics permission, **When** they open the Support workspace, **Then** aggregate performance figures are not returned to them.

---

### Edge Cases

- **Negative Concurrency Collisions**: two agents open the same unassigned ticket and assign it simultaneously — assignment must resolve to exactly one winner, with the loser receiving a clear conflict message rather than silently overwriting.
- Two agents transition the same ticket to different states at the same moment: the second transition must be validated against the state the ticket is actually in, not the state the agent's screen showed, and rejected if no longer valid.
- A customer replies at the same instant an agent resolves the ticket: the reply must not be lost, and the ticket must not end in `RESOLVED` with an unread customer message.
- A ticket references an order that is later cancelled, flagged as fraud, or removed: the ticket must survive and show the order's current state rather than breaking.
- A customer submits the same complaint repeatedly (double-click, retry, or abuse): repeat submissions within a short window from the same session must not create duplicate tickets.
- High-volume abuse: a single phone number or session floods the intake form — throttling must protect the queue without blocking legitimate customers.
- Attachments: unsupported file type, oversized file, zero-byte file, or an upload that fails midway — the ticket must not be created in a half-formed state referencing a file that does not exist.
- Orphaned attachments from abandoned submissions must not accumulate indefinitely in storage.
- An agent holding tickets is deactivated or has their permission revoked while tickets are assigned to them: those tickets must remain visible and reassignable, not become orphaned.
- A customer enters another person's order reference: the ticket must not disclose any detail of that order to the submitter.
- Reference code collision: generated ticket codes must be unique; a collision must never overwrite an existing ticket.
- Content editors publish an FAQ with an empty translation in one language: the storefront must fall back gracefully rather than rendering a blank section.
- Extremely long customer messages or pasted content must be bounded and must not break the thread layout in either text direction.
- A ticket sits untouched past its response target — it must surface as breaching rather than quietly ageing out of view.

## Requirements *(mandatory)*

### Functional Requirements

#### Governance & Access

- **FR-001**: System MUST strictly validate all support actions against granular permission flags, never against hardcoded roles, and MUST enforce them at the server boundary rather than only in navigation or interface state.
- **FR-002**: System MUST create an immutable audit log entry for every ticket state transition, assignment change, priority change, resolution, return decision, published-content change, and support permission update, capturing timestamp, actor, entity, and exact pre/post values.
- **FR-003**: System MUST introduce distinct support permissions covering: viewing the support queue, managing tickets (assign, reply, transition, prioritise), managing published support content (FAQ, policies, contact channels), and handling partnership enquiries — each grantable independently.
- **FR-004**: System MUST strip financial fields (order totals, discounts, cost figures, margins) from any support payload delivered to a user lacking the financial permission, before the payload leaves the server.
- **FR-005**: System MUST refuse every support action from a deactivated staff account regardless of the permission flags that account holds.
- **FR-006**: System MUST present support navigation and controls only to users whose permissions allow the corresponding action.

#### Public Intake

- **FR-007**: System MUST allow a visitor with no account to submit a support request, identified by their anonymous session plus the contact details they provide.
- **FR-008**: System MUST assign every submitted request a unique, human-readable reference code suitable for reading aloud over the phone, and MUST display it immediately upon successful submission.
- **FR-009**: System MUST require, per request, a category, a description, and at least one contact method, and MUST validate every field with inline error messages before submission is accepted.
- **FR-010**: System MUST support the request categories: order issue, delivery problem, damaged or wrong item, return, refund, product question, warranty, payment issue, complaint about service, and general enquiry.
- **FR-011**: System MUST allow a request to be linked to an order by reference code, MUST record whether that link was verified, and MUST NOT disclose to the submitter whether an unmatched code corresponds to a real order.
- **FR-012**: System MUST accept image and document attachments on a request within published type and size limits, reject anything outside those limits with a clear message, and never create a ticket that references a failed upload.
- **FR-013**: System MUST throttle submissions per session and per contact number to prevent flooding, and MUST collapse rapid duplicate submissions of the same request into a single ticket.
- **FR-014**: System MUST route requests from blacklisted contact numbers to a flagged review state instead of the standard queue.

#### Ticket Lifecycle

- **FR-015**: System MUST govern tickets by a deterministic state machine — `NEW → OPEN → AWAITING_CUSTOMER → RESOLVED → CLOSED`, with `REOPENED` and `ESCALATED` as re-entry and escalation states — and MUST reject any transition not defined by that machine.
- **FR-016**: System MUST forbid direct writes to a ticket's state; all changes MUST occur through transition operations that validate the current state, the actor's permissions, and execute side effects atomically.
- **FR-017**: System MUST automatically return a ticket to an active queue state when a customer replies to a ticket in `AWAITING_CUSTOMER` or `RESOLVED`.
- **FR-018**: System MUST record a resolution category and justification when a ticket is resolved.
- **FR-019**: System MUST assign each ticket a priority, derived by default from its category and adjustable by a permitted agent.
- **FR-020**: System MUST record first-response time and resolution time per ticket and MUST mark tickets that exceed their category's configured response target.
- **FR-021**: System MUST resolve simultaneous conflicting assignments or transitions to a single outcome and report the conflict to the losing actor rather than silently overwriting.

#### Conversation

- **FR-022**: System MUST maintain a chronological message thread per ticket containing customer messages, agent replies, internal notes, and system events.
- **FR-023**: System MUST distinguish customer-visible replies from staff-only internal notes, and MUST never return internal notes, agent identities beyond a display name, or system internals through any customer-facing lookup.
- **FR-024**: System MUST allow attachments on any message in the thread, subject to the same limits as intake.
- **FR-025**: System MUST reflect new messages and status changes in an agent's open queue without requiring a manual page refresh.
- **FR-026**: System MUST notify the customer when an agent replies, via [NEEDS CLARIFICATION: notification channel — on-site retrieval only, WhatsApp outbound, email, or a combination?].

#### Customer Self-Service

- **FR-027**: System MUST allow a customer to retrieve a ticket using its reference code together with the contact number used at submission, and MUST refuse mismatches with a message that does not reveal whether the code exists.
- **FR-028**: System MUST throttle repeated failed retrieval attempts from the same origin.
- **FR-029**: System MUST list a visitor's own tickets when they return within the same anonymous session, without requiring the reference code.
- **FR-030**: System MUST allow a customer to reply and add attachments to their own retrieved ticket while it is not closed.
- **FR-031**: System MUST provide an order-status lookup on the Support page keyed by order reference and contact number, returning customer-facing fulfilment status only, with no internal state names or financial detail.

#### Support Center Content

- **FR-032**: System MUST present a searchable, categorised FAQ on the Support page, maintained by staff holding the support-content permission without requiring a code change.
- **FR-033**: System MUST publish policy content covering returns, refunds, shipping and delivery, cancellations, and warranty, maintained through the same content permission.
- **FR-034**: System MUST publish contact channels with their operating hours and expected response times, maintained through the same content permission.
- **FR-035**: System MUST present Support Center topic entry points covering order issues, shipping and delivery, returns, refunds, product and warranty, payment, and business partnerships.
- **FR-036**: System MUST render all support content, forms, and validation messages in both Arabic and English, with correct right-to-left layout in Arabic, and MUST fall back to the other language rather than rendering blank when a translation is missing.
- **FR-037**: System MUST keep the Support Center usable across phone, tablet, and desktop widths with no horizontal overflow.

#### Returns & Orders

- **FR-038**: System MUST let a customer start a return request from the Support page, identify the order and items, and select a reason from a defined list.
- **FR-039**: System MUST evaluate return eligibility against the published return window and the order's fulfilment state, and MUST explain ineligibility while offering a general support ticket instead.
- **FR-040**: System MUST restrict recording a return outcome to users holding the returns permission and MUST store the outcome with its justification.
- **FR-041**: System MUST NOT alter an order's status by direct write from the support workspace; any order state change implied by a support outcome MUST go through the established order transition rules. Whether agents may trigger those transitions in context is [NEEDS CLARIFICATION: order-action authority — read-only handoff to the Orders module, or in-context actions gated by existing order permissions?].
- **FR-042**: System MUST link a duplicate return request for the same order and items to the existing open request rather than creating a competing one.

#### Partnerships

- **FR-043**: System MUST provide a partnership and business enquiry submission capturing company name, contact person, contact details, partnership type, and proposal details.
- **FR-044**: System MUST hold partnership enquiries in a queue distinct from customer support tickets, visible only to users holding the partnership permission.
- **FR-045**: System MUST allow a permitted user to record a partnership enquiry's status and notes, audit-logged.

#### Reporting

- **FR-046**: System MUST report ticket volume, open and resolved counts, median first-response and resolution times, and breakdowns by category and agent over a selectable date range, to users holding the analytics permission.
- **FR-047**: System MUST allow the queue to be filtered to tickets breaching their response target.

#### Data Handling

- **FR-048**: System MUST retain tickets and their threads for at least 24 months from closure for dispute and audit purposes.
- **FR-049**: System MUST remove attachments belonging to abandoned or failed submissions so orphaned files do not accumulate.
- **FR-050**: System MUST bound the length of customer-submitted text and render long content without breaking thread layout in either text direction.

### Key Entities *(include if feature involves data)*

- **Support Ticket**: A single customer request. Carries reference code, category, priority, lifecycle state, submitter contact details, anonymous session origin, optional verified link to an order, assigned agent, first-response and resolution timestamps, response-target breach flag, resolution category and justification. Related to Messages, Attachments, and optionally an Order and a Return Request.
- **Ticket Message**: One entry in a ticket's chronological thread. Carries author (customer, agent, or system), visibility (customer-visible or internal), body, timestamp, and attachments. Belongs to one Ticket.
- **Attachment**: A file supplied by a customer or agent, bound to a ticket or a specific message, with its type and size recorded.
- **Return Request**: A return-category ticket's structured detail — the order, the selected items, quantities, customer reason, eligibility outcome, and staff decision with justification. Belongs to one Ticket and references one Order.
- **Partnership Enquiry**: A business enquiry — company, contact person, contact details, partnership type, proposal, status, and staff notes. Held separately from customer tickets.
- **FAQ Entry**: A published question and answer with a topic, display order, and both language versions.
- **Support Policy Section**: A published policy document (returns, refunds, shipping, cancellation, warranty) with both language versions and a last-updated timestamp.
- **Contact Channel**: A published way to reach support — channel type, destination, operating hours, expected response time, and display order.
- **Support Category Configuration**: Per-category defaults — priority and response-time target — adjustable by staff.
- **Support Permissions**: New granular flags governing queue visibility, ticket management, support content management, and partnership handling, stored alongside existing staff permissions.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A customer can go from landing on the Support page to a submitted, referenced complaint in under 2 minutes without creating an account.
- **SC-002**: 100% of submitted requests appear in the dashboard queue, with zero requests lost between submission and queue visibility.
- **SC-003**: 95% of customers who return with a reference code and their phone number retrieve their ticket on the first attempt.
- **SC-004**: At least 40% of Support Center visitors resolve their question through self-service content without opening a ticket.
- **SC-005**: Median first response to a new ticket is under 4 working hours, and 90% of tickets receive a first response within their category's published target.
- **SC-006**: 90% of tickets reach a resolved state without the customer needing to open a second ticket about the same issue.
- **SC-007**: 100% of ticket state transitions, assignments, resolutions, return decisions, and support permission changes produce an audit entry.
- **SC-008**: 100% of attempts by a user lacking the relevant support permission to read or act on support data are refused by the server, verified across every support action.
- **SC-009**: Zero financial figures reach users lacking the financial permission, verified by inspecting delivered payloads and not only the rendered interface.
- **SC-010**: Zero cases in which a customer retrieves a ticket, order status, or internal note that does not belong to them.
- **SC-011**: The Support Center renders completely in both Arabic and English with no untranslated strings and no layout breakage in right-to-left mode, across phone, tablet, and desktop widths.
- **SC-012**: Concurrent assignment or transition attempts on the same ticket resolve to exactly one outcome in 100% of cases, with the losing actor informed.
- **SC-013**: The team can add, edit, and publish an FAQ entry, policy section, or contact channel without a code deployment, visible on the storefront within one minute.
- **SC-014**: Volume of unstructured support contact arriving outside the ticket system drops by 60% within the first two months of launch.

## Assumptions

These defaults were applied where the request did not specify. Each can be revisited during planning.

1. **No customer accounts.** The storefront remains anonymous; the entire customer-facing support experience works for guests, using the existing anonymous session plus a reference code and phone number for return visits. No customer login is introduced.
2. **Phone number is the primary identifier.** It is the field already collected at checkout and the channel the business already uses, so it is the key for ticket retrieval and order lookup. Email is accepted as an optional secondary contact.
3. **Reference codes follow the existing order short-code convention** — short, unambiguous, readable over the phone, and distinct in shape from order codes so the two cannot be confused.
4. **Return window defaults to 14 days from delivery**, configurable by staff rather than hardcoded.
5. **Response targets default by category** — order and delivery issues on the tightest target, general enquiries the loosest — and are staff-configurable.
6. **Partnership enquiries are a separate entity, not a ticket category.** Their fields, queue, workflow, and audience differ from customer complaints, and mixing them would pollute both the queue and support metrics.
7. **Support content is data, not code.** FAQs, policies, and contact channels are stored and edited by staff, so the team can maintain them without a deployment.
8. **Attachment limits** default to common image and document types, with a per-file and per-ticket cap consistent with the limits already applied to payment receipts.
9. **Ticket retention** of 24 months after closure, matching the dispute horizon typical for consumer e-commerce.
10. **Support tickets do not create or modify inventory.** No stock movement originates in this feature; any stock consequence of a return flows through the existing inventory rules.
11. **Agents are staff users in the existing team system.** No separate support-agent account system is introduced; support access is granted through the existing permission flags on the existing staff accounts.
12. **Escalation is a state, not a separate tier system.** A ticket can be marked escalated and reassigned, but no multi-tier routing engine is built in this feature.

## Out of Scope

- Live chat or a real-time chat widget on the storefront.
- Automated replies, chatbots, or AI-suggested responses.
- Customer accounts, login, or a full account-based order history area.
- A public knowledge base beyond the FAQ and policy sections (no article authoring system, versioning, or commenting).
- Telephony, call recording, or IVR integration.
- Payment or refund execution — recording a refund decision is in scope; moving money is not.
- Third-party helpdesk integration or ticket import from external tools.
- Customer satisfaction surveys and NPS collection.
- Multi-brand or multi-tenant support desks.

## Dependencies

- Existing staff accounts, permission flags, and the team management area — support permissions extend this system rather than replacing it.
- Existing audit log — every support action writes to it.
- Existing orders and their fulfilment states — ticket-to-order linking, order-status lookup, and return eligibility all read from them.
- Existing order state transition rules — any order change implied by a support outcome must route through them.
- Existing returns permission — return decisions reuse it rather than introducing a parallel one.
- Existing blacklist — flagged submitters are routed for review.
- Existing file storage and its orphan cleanup — support attachments reuse both.
- Existing bilingual routing and translation setup — the Support Center and the dashboard workspace both use it.
