import { whatsappLink } from "@/lib/contact";
import { getTranslations } from "next-intl/server";

export function WhatsAppIcon({ size = 24, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M3 21l1.65-3.8a9 9 0 1 1 3.4 2.9L3 21" />
      <path d="M9 10a.5.5 0 0 0 1 0V9a.5.5 0 0 0-1 0v1a5 5 0 0 0 5 5h1a.5.5 0 0 0 0-1h-1a.5.5 0 0 0 0 1" />
    </svg>
  );
}

export default async function WhatsAppFloatingButton() {
  const t = await getTranslations("SupportShared");

  return (
    <a
      href={whatsappLink(t("contact.prefilled.general"))}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={t("contact.whatsapp.label")}
      className="fixed bottom-6 ltr:right-6 rtl:left-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg shadow-[#25D366]/30 transition-all hover:scale-110 hover:brightness-105 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#25D366]"
    >
      <WhatsAppIcon size={28} />
    </a>
  );
}

