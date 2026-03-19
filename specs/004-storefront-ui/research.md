# Research & Technical Decisions: Customer Storefront UI

This document outlines the technical decisions made to address unknowns and implementation specifics for the Next.js storefront connecting to the Convex backend.

## 1. Guest Session Initialization (UUID generation)

**Unknown**: How to reliably generate and persist a `sessionId` (UUID) without triggering hydration mismatches in Next.js Server Side Rendering (SSR) while ensuring Convex queries have immediate access to it?

**Decision**: Implement a `SessionProvider` (Client Component) wrapping the application. 
**Rationale**: 
- During SSR, local storage is unavailable. If we render a UI dependent on the session ID, we risk hydration errors. 
- The `SessionProvider` uses `useEffect` to check for `localStorage.getItem('store_session_id')`. If it doesn't exist, it generates a new UUID using the `uuid` package, saves it, and sets it in local React state.
- While the session initializes (a fraction of a second), critical UI components (like the Cart Drawer) can render a skeleton/loading state to prevent mismatch. Once initialized, the `sessionId` is passed down via React Context, providing a reactive variable that pairs perfectly with `useQuery(api.cart.get, { sessionId })`.
**Alternatives**: Using cookies and Next.js middleware. Rejected because it adds overhead; local storage is sufficient for non-authenticated flash sale guest carts.

## 2. WhatsApp Handoff Redirect Format

**Unknown**: What is the most reliable cross-platform URL format to redirect a user to WhatsApp with a pre-filled message including their unique `Order ID`?

**Decision**: Utilize the universal API format: `https://wa.me/{phone_number}?text={encoded_message}`.
**Rationale**:
- `wa.me` links natively prompt the user's OS to open the installed WhatsApp application on iOS, Android, and Windows/Mac, falling back to WhatsApp Web if unavailable.
- We will strictly use `encodeURIComponent()` to parse the message template coming from our system configuration to guarantee correct spacing and variable injection.
**Alternatives**: `whatsapp://send?text=` intent schemes. Rejected as these fail abruptly if the user doesn't have the app installed natively.

## 3. Strict Server Authority For Cart Subtotals

**Unknown**: Given Next.js is heavily capable of client-side reactivity, how do we physically prevent operations from running client-side invoice addition?

**Decision**: The cart component will solely accept a `CartResponse` type from Convex that contains the pre-calculated `subtotal`, `shipping`, and `grand_total`.
**Rationale**: 
- By not sending array maps to calculate `item.price * item.quantity` at the frontend level, we enforce the PRD's Constitution Gate 1. 
- Even if a client modifies the local cache, the checkout mutation will only pass the `sessionId` to the backend. The backend reconstructs the cart from its own database and calculates the final payload to generate the Order.
**Alternatives**: Trusting the client sum and verifying it later. Rejected as it breaches Absolute Server Authority.
