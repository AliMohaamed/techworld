// Phone format: strip non-digits, normalize to 20XXXXXXXXXX (Egypt), append @c.us
export function formatChatId(rawPhone: string): string {
  const digits = rawPhone.replace(/\D/g, "");
  if (digits.startsWith("20")) return `${digits}@c.us`;
  if (digits.startsWith("0")) return `20${digits.slice(1)}@c.us`;
  return `20${digits}@c.us`;
}

// Returns Arabic copy for states that send a customer notification, null for states that don't.
// STALLED_PAYMENT, FLAGGED_FRAUD, CANCELLED, READY_FOR_SHIPPING are handled manually by agents.
// Wallet number is hardcoded for now — will move to system_configs.COLLECTION_WALLETS in a later slice.
export function buildMessageForState(args: {
  state: string;
  shortCode: string;
  customerName: string;
  totalPrice: number;
}): string | null {
  const { state, shortCode, customerName, totalPrice } = args;
  const walletNumber = "01012345678";

  switch (state) {
    case "PENDING_PAYMENT_INPUT":
      return (
        `مرحباً ${customerName}! 👋\n` +
        `تم استلام طلبك بنجاح.\n` +
        `كود طلبك: ${shortCode}\n\n` +
        `لإتمام الطلب، برجاء تحويل ${totalPrice} جنيه على:\n` +
        `📱 فودافون كاش / إنستا باي: ${walletNumber}\n\n` +
        `ثم أرسل لنا صورة إيصال التحويل هنا مع كود طلبك ${shortCode}.`
      );
    case "AWAITING_VERIFICATION":
      return (
        `شكراً ${customerName}! 📸\n` +
        `استلمنا صورة إيصال الدفع الخاص بطلبك ${shortCode}.\n` +
        `سيقوم فريقنا بالتحقق منه قريباً وسنعلمك بالتأكيد.`
      );
    case "CONFIRMED":
      return (
        `تهانينا ${customerName}! ✅\n` +
        `تم تأكيد طلبك ${shortCode} بعد التحقق من الدفع.\n` +
        `سنبدأ التجهيز فوراً.`
      );
    case "SHIPPED":
      return (
        `أهلاً ${customerName}! 🚚\n` +
        `طلبك ${shortCode} في الطريق إليك!\n` +
        `المندوب استلم الشحنة وستصلك قريباً.`
      );
    case "DELIVERED":
      return (
        `شكراً لتسوقك معنا ${customerName}! 🎉\n` +
        `تم توصيل طلبك ${shortCode} بنجاح.\n` +
        `نتمنى أن تكون تجربتك رائعة!`
      );
    case "RTO":
      return (
        `مرحباً ${customerName}،\n` +
        `للأسف لم نتمكن من توصيل طلبك ${shortCode}.\n` +
        `سيتواصل معك أحد أفراد فريقنا قريباً لترتيب موعد آخر.`
      );
    default:
      return null;
  }
}

export async function sendViaStub(chatId: string, text: string): Promise<void> {
  const url = process.env.WHATSAPP_STUB_OUTBOUND_URL;
  if (!url) {
    console.log(`[WhatsApp STUB] to=${chatId} msg=${text.slice(0, 80)}`);
    return;
  }
  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chatId, message: text }),
  });
}

export async function sendViaGreenApi(chatId: string, text: string): Promise<Response> {
  const instanceId = process.env.GREEN_API_INSTANCE_ID;
  const token = process.env.GREEN_API_TOKEN;
  return fetch(
    `https://api.green-api.com/waInstance${instanceId}/sendMessage/${token}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chatId, message: text }),
    },
  );
}
