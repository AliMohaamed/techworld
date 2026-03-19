import { NextRequest, NextResponse } from "next/server";
import { fetchMutation } from "convex/nextjs";
import { api, internal } from "../../../../convex/_generated/api";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-hub-signature-256") ?? "";

    // Verify HMAC signature
    const secret = process.env.WHATSAPP_WEBHOOK_SECRET;
    if (!secret) {
      console.error("Missing WHATSAPP_WEBHOOK_SECRET");
      return NextResponse.json({ error: "Configuration Error" }, { status: 500 });
    }

    const expectedSig = "sha256=" + crypto
      .createHmac("sha256", secret)
      .update(rawBody)
      .digest("hex");

    if (signature !== expectedSig) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
    }

    const payload = JSON.parse(rawBody);

    // Forward to Convex internal mutation
    // @ts-ignore
    await fetchMutation(internal.webhooks.processWebhookReceipt, { payload });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Webhook processing error:", error);
    return NextResponse.json({ error: "Malformed payload or internal error" }, { status: 400 });
  }
}
