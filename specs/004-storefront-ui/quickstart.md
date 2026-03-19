# Quickstart: Customer Storefront UI

This feature is encapsulated within the `004-storefront-ui` branch and primarily lives in the Next.js `src/app/(store)` route group.

## Running the Storefront

1. Ensure your Convex backend is running:
   ```bash
   npx convex dev
   ```
2. Start the Next.js development server:
   ```bash
   npm run dev
   ```
3. Navigate to `http://localhost:3000` to view the mobile-first Home layout (Flash Sale view).

## Local Testing & Considerations

- **Session Initialization**: Open your browser dev tools -> Application -> Local Storage. Verify that upon your first visit, a `store_session_id` is generated and saved as a UUID. Deleting this and refreshing should generate a new one, successfully simulating a new guest cart.
- **Server Authority Constraints**: You should NOT find any client-side math (e.g. `item.price * item.quantity`) inside the `cart-drawer.tsx` or `checkout` components. Trust the `subtotal` returned strictly from your Convex `CartSessionState`.
- **UI Validations**: The Dark Mode (`dark` class on root) should be the default, and typography should reflect `Space Grotesk`. Verify the WhatsApp CTA button logic resolves correctly using `https://wa.me/...` formatting upon successful checkout.
