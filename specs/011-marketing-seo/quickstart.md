# Quickstart: Phase 10 - Marketing, Retention & Advanced SEO

## Environment Variables

This feature introduces outgoing HTTP webhooks to a third-party WhatsApp provider. You will need to add the API credentials to your Convex environment variables (`npx convex env set`).

```env
# Convex Backend
WHATSAPP_API_URL=https://api.your-whatsapp-provider.com/v1/messages
WHATSAPP_API_TOKEN=your_secure_api_token
```

> **Note**: These variables should be configured via the Convex Dashboard for the production environment and locally using `npx convex env set` for the dev environment.

## Setting Up Promo Codes

Once the schema is deployed, you will need to create at least one Promo Code to verify checkout functionality.

1. Navigate to the Admin Dashboard (e.g., `/admin/marketing/promo-codes`).
2. Create a new promo code (e.g., `SAVE10`) with `type: "percentage"` and `value: 10`.
3. Set the `max_uses` to a reasonable number (e.g., `100`).
4. Apply the code at the storefront checkout to verify the subtotal reduction.

## Verifying WhatsApp Webhooks

To test the automated webhook triggers without actually sending WhatsApp messages during development:

1. Use a tool like [Webhook.site](https://webhook.site/) or [Ngrok](https://ngrok.com/) to capture HTTP requests.
2. Set the `WHATSAPP_API_URL` environment variable locally to your generated test URL.
3. Place a guest order on the storefront.
4. Verify that the system dispatched a webhook payload containing the order details (`PENDING_PAYMENT_INPUT`).
5. Open the Admin Dashboard and change the status of that order to `CONFIRMED`.
6. Verify the second webhook payload is successfully received by your capture tool.

## Generating the Sitemap

The dynamic Next.js sitemap will automatically pull published products and categories from Convex.

1. Run the Next.js dev server: `npm run dev`.
2. Navigate to `http://localhost:3000/sitemap.xml`.
3. Ensure the XML output lists the correct dynamic slugs for the active products.
