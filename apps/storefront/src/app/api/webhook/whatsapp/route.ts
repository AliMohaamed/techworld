import { NextRequest, NextResponse } from "next/server";
import { fetchMutation } from "convex/nextjs";
import { api } from "@backend/convex/_generated/api";
import crypto from "crypto";

function isAuthorized(actual: string, expected: string): boolean {
  const a = Buffer.from(actual);
  const b = Buffer.from(expected);
  // timingSafeEqual requires equal-length buffers; length inequality is revealed but that's acceptable
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

type NormalizedPayload = {
  messageId: string;
  senderPhone: string;
  messageType: string;
  textBody: string | undefined;
  mediaUrl: string | undefined;
  mediaMimeType: string | undefined;
  timestamp: number;
};

function normalizeGreenApiPayload(
  body: Record<string, unknown>,
): NormalizedPayload | null {
  // Only process inbound message notifications — ignore status updates, presence, etc.
  if (body.typeWebhook !== "incomingMessageReceived") return null;

  const senderData = (body.senderData ?? {}) as Record<string, unknown>;
  const messageData = (body.messageData ?? {}) as Record<string, unknown>;

  // Green API chatId format: 201012345678@c.us — strip suffix and non-digits for storage
  const chatId = String(senderData.chatId ?? "");
  const senderPhone = chatId.replace("@c.us", "").replace(/\D/g, "");

  const messageType = String(messageData.typeMessage ?? "");

  let textBody: string | undefined;
  let mediaUrl: string | undefined;
  let mediaMimeType: string | undefined;

  if (messageType === "textMessage") {
    const textData = (messageData.textMessageData ?? {}) as Record<string, unknown>;
    textBody = textData.textMessage ? String(textData.textMessage) : undefined;
  } else if (messageType === "imageMessage") {
    const imageData = (messageData.imageMessageData ?? {}) as Record<string, unknown>;
    // Caption often contains the order shortcode (e.g. "TW-7K9XQA")
    textBody = imageData.caption ? String(imageData.caption) : undefined;
    mediaUrl = imageData.url ? String(imageData.url) : undefined;
    mediaMimeType = imageData.mimeType ? String(imageData.mimeType) : undefined;
  }

  return {
    messageId: String(body.idMessage ?? ""),
    senderPhone,
    messageType,
    textBody,
    mediaUrl,
    mediaMimeType,
    timestamp: Number(body.timestamp ?? Date.now()),
  };
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization") ?? "";
  const authToken = process.env.WHATSAPP_WEBHOOK_AUTH_TOKEN ?? "";

  if (!authToken) {
    console.error("WHATSAPP_WEBHOOK_AUTH_TOKEN is not set");
    return NextResponse.json({ error: "Configuration Error" }, { status: 500 });
  }

  if (!isAuthorized(authHeader, `Bearer ${authToken}`)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await req.json()) as Record<string, unknown>;
    const normalized = normalizeGreenApiPayload(body);

    // Not an inbound message webhook type — acknowledge and skip processing
    if (!normalized) {
      return NextResponse.json({ ok: true });
    }

    // @ts-ignore — fetchMutation works with internal refs from Next.js server context
    await fetchMutation(api.webhooks.processInboundReceipt, {
      payload: normalized,
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("Webhook processing error:", e);
    return NextResponse.json({ error: e.message || String(e) }, { status: 500 });
  }
}
