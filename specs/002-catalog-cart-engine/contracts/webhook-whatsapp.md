# Webhook Contract: WhatsApp Inbound Messages

**Consumer**: `app/api/webhook/whatsapp/route.ts` (Next.js API Route)  
**Producer**: WhatsApp Business API Provider (e.g., 360dialog, Twilio, Meta Cloud API)  
**Direction**: Inbound (Provider → System)  
**Protocol**: HTTPS POST  
**Authentication**: HMAC-SHA256 signature via `x-hub-signature-256` header

---

## Inbound Request Contract

### Headers

| Header | Required | Description |
|--------|----------|-------------|
| `x-hub-signature-256` | Yes | `sha256=<HMAC-SHA256 of raw body using WHATSAPP_WEBHOOK_SECRET>` |
| `Content-Type` | Yes | `application/json` |

### Payload Shape (Normalized)

The system expects the following normalized structure. Provider-specific wrappers (e.g., Meta Cloud API envelope) must be normalized before calling the Convex internal mutation:

```json
{
  "messageId": "wamid.XXXXXXXXXXXXXXXXXX",
  "senderPhone": "+201012345678",
  "messageType": "text" | "image" | "document",
  "textBody": "ORD-ABC123 here is my transfer screenshot",
  "mediaId": "MEDIA_ID_FROM_PROVIDER",
  "timestamp": 1710834684
}
```

### Order Short Code Extraction

The system applies the following regex to `textBody` to extract the Order Short Code:

```
/ORD-[A-Z0-9]+/i
```

- **Match example**: `"ORD-ABC123"` extracted from `"ORD-ABC123 here is my transfer"`
- **No match**: Payload is stored as `UNMATCHED` and queued for manual agent review.

---

## Response Contract

| Scenario | HTTP Status | Body |
|----------|------------|------|
| Successfully processed (MATCHED or UNMATCHED) | `200 OK` | `{ "ok": true }` |
| Duplicate payload (idempotency) | `200 OK` | `{ "ok": true, "status": "duplicate" }` |
| Invalid signature | `403 Forbidden` | `{ "error": "Invalid signature" }` |
| Malformed payload / missing required fields | `400 Bad Request` | `{ "error": "Malformed payload" }` |

> **Note**: The system ALWAYS returns 200 for successfully received (even UNMATCHED) payloads to prevent the provider from retrying unnecessarily. Only signature and parse failures return non-200.

---

## Manual Receipt Attachment Contract

**Endpoint**: Convex mutation `api.webhooks.attachReceiptManually`  
**Caller**: Dashboard agent UI  
**Permission**: `VERIFY_PAYMENTS`

### Arguments

```typescript
{
  orderId: Id<"orders">,      // The target order
  mediaStorageId: string,     // Convex File Storage ID of uploaded receipt image
  notes: string | undefined,  // Optional agent note
}
```

### Response

```typescript
{
  success: true,
  auditId: string,  // ID of the generated audit_logs entry
}
```
