# Quickstart: WhatsApp Automation (Spec 013)

## How the loop works

1. Customer places an order → Convex creates the order as `PENDING_PAYMENT_INPUT` and fires `dispatchWhatsAppMessage` (outbound).
2. The customer transfers money and replies on WhatsApp with a screenshot + the `TW-XXXXXX` code.
3. Green API POSTs the inbound message to `/api/webhook/whatsapp` on the storefront.
4. The Next.js route authenticates, normalises the payload, and calls `processInboundReceipt`.
5. The mutation matches the order (by short code, then by sender phone as fallback) and schedules `downloadAndAttachMedia`.
6. The action downloads the screenshot into Convex storage and calls `applyReceiptToOrder`, which flips the order to `AWAITING_VERIFICATION`.
7. An agent confirms in the admin → `CONFIRMED` → another outbound message goes out.

---

## Environment variables

### `packages/backend/.env.local` (read by Convex functions)

| Variable | Description |
|---|---|
| `WHATSAPP_PROVIDER` | `stub` (default, safe for local dev) or `green-api` |
| `GREEN_API_INSTANCE_ID` | Instance ID from Green API dashboard — leave blank until going live |
| `GREEN_API_TOKEN` | API token from Green API dashboard — leave blank until going live |
| `WHATSAPP_STUB_OUTBOUND_URL` | A [webhook.site](https://webhook.site) URL for inspecting outbound stubs locally |

> Convex reads environment variables from `.env.local` during `npx convex dev`. For production, set them with:
> ```bash
> npx convex env set WHATSAPP_PROVIDER green-api
> npx convex env set GREEN_API_INSTANCE_ID <your-id>
> npx convex env set GREEN_API_TOKEN <your-token>
> ```

### `apps/storefront/.env.local` (read by Next.js)

| Variable | Description |
|---|---|
| `WHATSAPP_WEBHOOK_AUTH_TOKEN` | Shared secret between Green API and the storefront route |

Generate a token:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Paste the same value in:
- `apps/storefront/.env.local` → `WHATSAPP_WEBHOOK_AUTH_TOKEN=<value>`
- Green API dashboard → Instance → **Webhook** → **Authorization header** → `Bearer <value>`

---

## Running in stub mode (local dev)

1. Start all services:
   ```bash
   npm run dev
   ```

2. Make sure `WHATSAPP_PROVIDER=stub` in `packages/backend/.env.local` (it is by default).

3. Set `WHATSAPP_STUB_OUTBOUND_URL` to a fresh [webhook.site](https://webhook.site) URL — outbound messages will appear there.

4. Set `WHATSAPP_WEBHOOK_AUTH_TOKEN` to any value for local testing (e.g. `test-token`).

5. Run the curl harness (see `curl-stub.sh`):
   ```bash
   bash specs/013-whatsapp-automation/curl-stub.sh
   ```

6. Verify:
   - Webhook.site receives the `PENDING_PAYMENT_INPUT` Arabic message after placing a guest order.
   - After the image curl test, the order in admin shows `AWAITING_VERIFICATION` and the receipt thumbnail renders.
   - The duplicate curl test returns `{ status: "duplicate" }` and creates no second row in `webhook_receipts`.

---

## Going live with Green API

1. Create a Green API account and start a WhatsApp instance (scan QR code).
2. In the Green API dashboard, under **Instance Settings → Webhooks**:
   - Set the webhook URL to `https://<your-domain>/api/webhook/whatsapp`
   - Set the **Authorization header** to `Bearer <your-WHATSAPP_WEBHOOK_AUTH_TOKEN>`
   - Enable **Incoming messages** notifications only (disable others to reduce noise).
3. Set production env vars:
   ```bash
   npx convex env set WHATSAPP_PROVIDER green-api
   npx convex env set GREEN_API_INSTANCE_ID <id>
   npx convex env set GREEN_API_TOKEN <token>
   ```
4. In `apps/storefront/.env.local` (or your hosting provider's env), set `WHATSAPP_WEBHOOK_AUTH_TOKEN`.
5. Deploy and place a test order — you should receive an Arabic WhatsApp message on the registered number.

---

## Outbound message states

| Order state | Message sent? | Copy summary |
|---|---|---|
| `PENDING_PAYMENT_INPUT` | ✅ | Wallet number + instructions to send screenshot |
| `AWAITING_VERIFICATION` | ✅ | "We got your screenshot, hold tight" |
| `CONFIRMED` | ✅ | "Order confirmed" |
| `SHIPPED` | ✅ | "Courier picked up your package" |
| `DELIVERED` | ✅ | "Delivered, thank you" |
| `RTO` | ✅ | "Delivery failed, agent will reach out" |
| `STALLED_PAYMENT` | ❌ | Agent handles manually |
| `FLAGGED_FRAUD` | ❌ | Agent handles manually |
| `CANCELLED` | ❌ | Agent handles manually |
| `READY_FOR_SHIPPING` | ❌ | Internal state, no customer message |

---

## Phone number format

The system normalises Egyptian phone numbers to Green API's `chatId` format automatically:

| Input | Normalised |
|---|---|
| `01012345678` | `201012345678@c.us` |
| `+201012345678` | `201012345678@c.us` |
| `201012345678` | `201012345678@c.us` |

See `packages/backend/convex/lib/whatsapp.ts` → `formatChatId()`.

---

## Wallet number

The payment wallet number is currently hardcoded in `lib/whatsapp.ts:buildMessageForState` as `01012345678`.
A future slice will move it to `system_configs.COLLECTION_WALLETS` with an admin UI to update it.
