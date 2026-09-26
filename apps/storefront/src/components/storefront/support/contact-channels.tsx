import { Mail, MessageSquare, Phone } from "lucide-react";
import { SUPPORT_EMAIL, SUPPORT_PHONES, SUPPORT_WHATSAPP_DISPLAY, telLink, whatsappLink } from "@/lib/contact";

type Labels = {
  title: string;
  description: string;
  whatsapp: { label: string; detail: string };
  email: { label: string; detail: string };
  phone: { label: string; detail: string };
  prefilledMessage: string;
};

const cardClass =
  "group flex flex-col gap-3 rounded-2xl border border-border bg-card p-6 transition-all hover:border-primary/30 hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary md:p-8";

/** Contact channel grid reused at the foot of every support page. */
export default function ContactChannels({ labels }: { labels: Labels }) {
  const channels = [
    {
      key: "whatsapp",
      icon: MessageSquare,
      label: labels.whatsapp.label,
      note: labels.whatsapp.detail,
      links: [{ href: whatsappLink(labels.prefilledMessage), text: SUPPORT_WHATSAPP_DISPLAY, external: true }],
    },
    {
      key: "email",
      icon: Mail,
      label: labels.email.label,
      note: undefined,
      links: [{ href: `mailto:${SUPPORT_EMAIL}`, text: SUPPORT_EMAIL, external: false }],
    },
    {
      key: "phone",
      icon: Phone,
      label: labels.phone.label,
      note: undefined,
      links: SUPPORT_PHONES.map((phone) => ({ href: telLink(phone), text: phone, external: false })),
    },
  ];

  return (
    <section aria-labelledby="contact-channels-heading" className="space-y-8">
      <div className="space-y-3">
        <h2
          id="contact-channels-heading"
          className="font-space-grotesk text-2xl font-black uppercase tracking-tightest text-foreground md:text-4xl"
        >
          {labels.title}
        </h2>
        <p className="max-w-2xl text-sm leading-relaxed text-label-muted">
          {labels.description}
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        {channels.map(({ key, icon: Icon, label, note, links }) => (
          <div key={key} className={cardClass}>
            <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary transition-transform group-hover:scale-110">
              <Icon size={20} aria-hidden="true" />
            </span>
            <span className="font-space-grotesk text-sm font-bold uppercase tracking-[0.2em] text-foreground">
              {label}
            </span>
            {note ? <span className="text-sm text-label-muted">{note}</span> : null}
            <span className="flex flex-col items-start gap-1">
              {links.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  dir="ltr"
                  {...(link.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                  className="break-all py-1 text-base font-semibold text-foreground underline-offset-4 transition-colors hover:text-primary hover:underline"
                >
                  {link.text}
                </a>
              ))}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
