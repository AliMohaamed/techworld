<!--
Sync Impact Report:
- Version change: Template → 1.0.0
- List of modified principles:
  - [PRINCIPLE_1_NAME] → I. Absolute Server Authority
  - [PRINCIPLE_2_NAME] → II. Inventory Strategy & Zero Floor
  - [PRINCIPLE_3_NAME] → III. Verification-First Hybrid COD
  - [PRINCIPLE_4_NAME] → IV. Permission-Driven RBAC
  - [PRINCIPLE_5_NAME] → Removed (4 core principles chosen strictly from PRD)
- Added sections: Replaced placeholder sections with specific sections on "State Machine Constraint" and "Audit & Observability"
- Removed sections: Placeholder Section 3
- Templates requiring updates:
  ✅ d:\Freelance\techworld\website\.specify\templates\plan-template.md
  ✅ d:\Freelance\techworld\website\.specify\templates\spec-template.md
  ✅ d:\Freelance\techworld\website\.specify\templates\tasks-template.md
- Follow-up TODOs: None
-->

# TechWorld Unified E-Commerce Operations Constitution

## Core Principles

### I. Absolute Server Authority
The Next.js frontend is strictly a presentation and input layer. It holds zero authority over logic. All state, pricing, shipping calculations, and inventory mutations MUST happen atomically in Convex server functions and mutations prior to any database write.

### II. Inventory Strategy & Zero Floor
The `real_stock` metric represents absolute physical truth and MUST NEVER drop below zero. Physical stock is deducted ONLY at the `CONFIRMED` state, never at checkout creation. The system MUST handle 'Negative Concurrency Collisions' strictly by aborting mutations if `real_stock` is ≤ 0.

### III. Verification-First Hybrid COD
To maximize conversion during high-traffic events, orders begin in the `PENDING_PAYMENT_INPUT` state without reserving physical stock. This establishes a "First-to-Pay, First-Served" model where inventory is decoupled from frontend checkout requests.

### IV. Permission-Driven RBAC
Hardcoded roles (e.g., `role === 'admin'`) MUST NOT exist in the system logic. Granular permission flags (e.g., `VIEW_FINANCIALS`, `VERIFY_PAYMENTS`) MUST be utilized at the Convex mutation level. Financial opacity is mandatory, and unprivileged users MUST have financial fields stripped before the payload leaves the server.

## State Machine Constraint

The system operates on deterministic state transitions. Direct database writes to an order's status field are forbidden. Status changes MUST ONLY occur via defined Convex transition mutations that validate current state, permissions, and execute required side effects atomically.

## Audit & Observability

Every state transition, inventory adjustment, system configuration change, and permission update MUST generate an immutable, append-only record in the Audit Log containing timestamp, actor, entity, and exact pre/post mutation states. 

## Governance

All pull requests, technical plans, and specifications MUST verify compliance against this Constitution. Changes to core logic involving pricing, inventory, or permissions MUST explicitly map to the matching principles listed above.

**Version**: 1.0.0 | **Ratified**: 2026-03-18 | **Last Amended**: 2026-03-18
