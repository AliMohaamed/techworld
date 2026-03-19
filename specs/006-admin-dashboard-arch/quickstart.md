# Admin Dashboard Run Environment

## Quickstart

Since the project operates as a Turborepo orchestrating multiple workspaces, the developer experience runs from the repository root.

1. **Dependencies**
   ```bash
   cd D:\Freelance\techworld\website
   npm install
   ```

2. **Environment Setup**
   Storefront `.env.local` handles public keys. Configure the analogous admin values locally as well.
   `CONVEX_DEPLOYMENT` must map to the unified Convex deployment so the dashboard can resolve the shared data model.

3. **Bootstrapping Convex**
   Before running the Next.js servers, verify the backend typings are current:
   ```bash
   npm run dev:backend
   ```

4. **Running the Admin Dashboard**
   Use the root Turborepo scripts so the admin app stays isolated from the storefront shell:
   ```bash
   npm run dev:admin
   ```

5. **Workspace Validation**
   Validate the workspace build pipeline and Turbo task graph from the root:
   ```bash
   npm run build
   npm run lint --workspace @techworld/admin
   ```
   Re-running `npm run build` should reuse Turbo cache entries for unchanged workspaces.
