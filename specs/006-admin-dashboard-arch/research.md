# Phase 0: Outline & Research

## Turborepo Migration Strategy

- **Decision**: Migrate the existing `website/` root folder into a Turborepo monorepo (`apps/storefront` and `apps/admin`). The `convex/` logic will move to a `packages/backend` workspace.
- **Rationale**: Physically separating the admin panel guarantees no unauthorized UI leakage or chunk exposure to public customers while allowing Next.js 16/React 19 independent build caching logic. Extracting Convex out to a shared package is the officially recommended approach by Convex documentation for monorepos, allowing both React applications equal access to generated typed `api.*` entry points.
- **Alternatives Considered**: Polyrepo (abandoned to keep server logic synchronized); "Distinct Folders" (lacks workspace-level orchestration for `npm run dev` and shared configurations).

## Admin Authentication Configuration

- **Decision**: Authenticate admin users using **Convex Auth** acting strictly as the session provider, relying exclusively on custom schema attributes `db.users.permissions[]` for operations rather than string roles.
- **Rationale**: Keeps architecture homogeneous according to absolute server authority. Session identity is automatically validated with zero-latency at the Convex resolver layer, avoiding network hops to Clerk.
- **Alternatives Considered**: Clerk OAuth (rejected as it fragments identity resolution away from Convex, complicating custom transactional permission checks on mutations).

## File Storage (Manual Receipt Fallbacks)

- **Decision**: Utilize native **Convex File Storage** for uploading agent verification receipts.
- **Rationale**: Keeps assets securely tethered to the order lifecycle constraint logic within a single transaction layer. File reads/writes can be bound by exact `VIEW_ORDERS` RBAC validations natively.
- **Alternatives Considered**: AWS S3 (rejected to avoid external dependency sprawl).
