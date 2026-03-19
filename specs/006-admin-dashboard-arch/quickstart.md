# Admin Dashboard Run Environment

## Quickstart

Since the project operates as a Turborepo orchestrating multiple workspaces, the developer experience runs universally from the root.

1.  **Dependencies**:
    ```bash
    cd D:\Freelance\techworld\website
    npm install
    ```

2.  **Environment Setup**:
    Storefront `.env.local` handles public keys. You will need analogous keys configured locally for `apps/admin`.
    `CONVEX_DEPLOYMENT` must correctly map to the existing unified real-time database to view order data synchronously.

3.  **Bootstrapping Convex**:
    Before running the Next.js servers, verify the backend typings are correct and generating:
    ```bash
    npm run dev:backend
    ```

4.  **Running the Dashboard Locally**:
    Utilize the generalized turborepo scripts to launch only the admin app (or both together).
    ```bash
    # e.g. Turborepo filter
    npx turbo run dev --filter=admin
    ```
    This successfully streams the Vite/Next.js HMR process on port 3001 while keeping the Storefront unbothered on 3000.
