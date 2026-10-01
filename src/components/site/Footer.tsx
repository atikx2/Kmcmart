import Link from "next/link";
import Image from "next/image";
import { Mail, MapPin, Phone } from "lucide-react";
import type { Menu, Settings } from "@/db/schema";

function FacebookIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M13.5 21v-7.2h2.42l.36-2.8H13.5V9.2c0-.81.22-1.36 1.38-1.36h1.48V5.35c-.26-.03-1.14-.11-2.16-.11-2.14 0-3.6 1.3-3.6 3.7V11H8.2v2.8h2.4V21h2.9Z" />
    </svg>
  );
}

function InstagramIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
      <rect x="3.5" y="3.5" width="17" height="17" rx="4.5" />
      <circle cx="12" cy="12" r="3.6" />
      <circle cx="17.1" cy="6.9" r="1.15" fill="currentColor" stroke="none" />
    </svg>
  );
}

function YoutubeIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M21.6 7.2a2.5 2.5 0 0 0-1.76-1.77C18.28 5 12 5 12 5s-6.28 0-7.84.43A2.5 2.5 0 0 0 2.4 7.2 26.2 26.2 0 0 0 2 12a26.2 26.2 0 0 0 .4 4.8 2.5 2.5 0 0 0 1.76 1.77C5.72 19 12 19 12 19s6.28 0 7.84-.43a2.5 2.5 0 0 0 1.76-1.77A26.2 26.2 0 0 0 22 12a26.2 26.2 0 0 0-.4-4.8ZM10 15.2V8.8l5.2 3.2L10 15.2Z" />
    </svg>
  );
}

function WhatsappIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12.04 3a8.9 8.9 0 0 0-7.64 13.45L3 21l4.66-1.36A8.94 8.94 0 1 0 12.04 3Zm0 16.33c-1.4 0-2.76-.4-3.92-1.14l-.28-.17-2.77.8.81-2.66-.18-.28a7.31 7.31 0 1 1 6.34 3.45Zm4.2-5.4c-.23-.12-1.36-.67-1.57-.75-.21-.08-.36-.11-.52.12-.15.23-.59.75-.72.9-.13.15-.27.17-.5.06a6 6 0 0 1-2.98-2.6c-.22-.39.23-.36.64-1.2.07-.15.04-.27-.02-.39-.06-.11-.52-1.25-.71-1.71-.19-.45-.38-.39-.52-.4h-.44c-.15 0-.4.06-.6.28-.21.23-.79.77-.79 1.88 0 1.1.8 2.17.92 2.32.11.15 1.58 2.42 3.83 3.39.54.23.95.37 1.28.48.54.17 1.03.15 1.41.09.43-.06 1.36-.56 1.55-1.09.19-.54.19-1 .13-1.1-.05-.1-.2-.16-.44-.26Z" />
    </svg>
  );
}

export default function Footer({ settings, menus }: { settings: Settings; menus: Menu[] }) {
  const socials = [
    { href: settings.facebook, Icon: FacebookIcon, label: "Facebook" },
    { href: settings.instagram, Icon: InstagramIcon, label: "Instagram" },
    { href: settings.youtube, Icon: YoutubeIcon, label: "YouTube" },
    { href: settings.whatsapp, Icon: WhatsappIcon, label: "WhatsApp" },
  ];

  return (
    <footer className="bg-black text-white">
      <div className="h-1 grad-bg" />
      <div className="max-w-7xl mx-auto px-4 lg:px-6 py-12 md:py-16 grid grid-cols-1 gap-10 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1.2fr)]">
        {/* brand */}
        <div className="min-w-0">
          <Link href="/">
            <Image
              src={settings.logoFooter}
              alt={settings.siteName}
              width={180}
              height={44}
              className="h-11 w-auto"
            />
          </Link>
          <p className="mt-4 text-sm text-gray-400 leading-relaxed max-w-xs">{settings.slogan}</p>
          <div className="mt-5 flex items-center gap-2.5">
            {socials.map(({ href, Icon, label }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                className="w-10 h-10 rounded-full bg-white/10 grid place-items-center text-gray-300 hover:text-white hover:bg-[image:linear-gradient(120deg,var(--g1),var(--g2))] hover:-translate-y-0.5 transition-all"
              >
                <Icon size={16} />
              </a>
            ))}
          </div>
        </div>

        {/* quick links */}
        <div className="min-w-0">
          <h4 className="font-display font-extrabold text-base">Quick Links</h4>
          <span className="block mt-2 h-[3px] w-9 rounded-full grad-bg" />
          <ul className="mt-5 grid grid-cols-2 md:grid-cols-1 gap-y-2.5 gap-x-4">
            {menus.map((m) => (
              <li key={m.id}>
                <Link
                  href={m.href}
                  className="text-sm text-gray-400 hover:text-white transition inline-flex items-center gap-2"
                >
                  <span className="w-1.5 h-1.5 rounded-full grad-bg inline-block" />
                  {m.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* contact */}
        <div className="min-w-0">
          <h4 className="font-display font-extrabold text-base">Contact Us</h4>
          <span className="block mt-2 h-[3px] w-9 rounded-full grad-bg" />
          <ul className="mt-5 space-y-3.5 text-sm">
            <li>
              <a
                href={`tel:${settings.phone.replace(/\s/g, "")}`}
                className="flex items-center gap-3 text-gray-300 hover:text-white transition"
              >
                <span className="w-9 h-9 rounded-xl grad-bg grid place-items-center shrink-0">
                  <Phone size={15} />
                </span>
                <span className="min-w-0 break-words">{settings.phone}</span>
              </a>
            </li>
            <li>
              <a href={`mailto:${settings.email}`} className="flex items-center gap-3 text-gray-300 hover:text-white transition">
                <span className="w-9 h-9 rounded-xl grad-bg grid place-items-center shrink-0">
                  <Mail size={15} />
                </span>
                <span className="min-w-0 break-all">{settings.email}</span>
              </a>
            </li>
            <li className="flex items-center gap-3 text-gray-300">
              <span className="w-9 h-9 rounded-xl grad-bg grid place-items-center shrink-0">
                <MapPin size={15} />
              </span>
              <span className="min-w-0 break-words">{settings.address}</span>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 py-5 flex flex-col md:flex-row items-center justify-between gap-2">
          <p className="text-xs text-gray-500">
            © {new Date().getFullYear()} {settings.siteName}. All rights reserved.
          </p>
          <p className="text-xs text-gray-500 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse" />
            Cash on Delivery Available Nationwide
          </p>
        </div>
      </div>
    </footer>
  );
}
