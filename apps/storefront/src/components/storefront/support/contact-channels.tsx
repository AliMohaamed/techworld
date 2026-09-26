import { Mail, MessageSquare, Phone } from "lucide-react";
import { SUPPORT_EMAIL, SUPPORT_PHONE_DISPLAY, whatsappLink } from "@/lib/contact";

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
      href: whatsappLink(labels.prefilledMessage),
      external: true,
      label: labels.whatsapp.label,
      detail: labels.whatsapp.detail,
      ltr: false,
    },
    {
      key: "email",
      icon: Mail,
      href: `mailto:${SUPPORT_EMAIL}`,
      external: false,
      label: labels.email.label,
      detail: SUPPORT_EMAIL,
      ltr: true,
    },
    {
      key: "phone",
      icon: Phone,
      href: `tel:${SUPPORT_PHONE_DISPLAY.replace(/\s/g, "")}`,
      external: false,
      label: labels.phone.label,
      detail: SUPPORT_PHONE_DISPLAY,
      ltr: true,
    },
  ] as const;

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
        {channels.map(({ key, icon: Icon, href, external, label, detail, ltr }) => (
          <a
            key={key}
            href={href}
            {...(external
              ? { target: "_blank", rel: "noopener noreferrer" }
              : {})}
            className={cardClass}
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary transition-transform group-hover:scale-110">
              <Icon size={20} aria-hidden="true" />
            </span>
            <span className="font-space-grotesk text-sm font-bold uppercase tracking-[0.2em] text-foreground">
              {label}
            </span>
            <span
              className="text-sm font-medium text-label-muted"
              {...(ltr ? { dir: "ltr" as const } : {})}
            >
              {detail}
            </span>
          </a>
        ))}
      </div>
    </section>
  );
}
