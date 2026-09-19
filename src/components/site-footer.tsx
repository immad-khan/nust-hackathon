import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import {
  FacebookIcon,
  InstagramIcon,
  TikTokIcon,
  WhatsappIcon,
} from "@/components/icons";
import { NewsletterForm } from "@/components/newsletter-form";
import { BRAND } from "@/lib/content";
import { WHATSAPP_NUMBER } from "@/lib/whatsapp";

const SOCIAL_LINKS = [
  { Icon: InstagramIcon, href: BRAND.instagram, label: "Instagram" },
  { Icon: FacebookIcon, href: BRAND.facebook, label: "Facebook" },
  { Icon: TikTokIcon, href: BRAND.tiktok, label: "TikTok" },
  { Icon: WhatsappIcon, href: `https://wa.me/${WHATSAPP_NUMBER}`, label: "WhatsApp" },
];

const SHOP_LINKS = [
  { label: "New Arrivals", href: "/shop?sort=newest" },
  { label: "Earrings", href: "/shop?category=earrings" },
  { label: "Cuffs", href: "/shop?category=cuffs" },
  { label: "Rings", href: "/shop?category=rings" },
  { label: "Bracelets", href: "/shop?category=bracelets" },
  { label: "Necklaces", href: "/shop?category=necklaces" },
  { label: "Gift Sets", href: "/shop?category=sets" },
];

const CARE_LINKS = [
  { label: "Contact Us", href: "/appointment" },
  { label: "Shipping & Delivery", href: "/about#shipping" },
  { label: "Jewellery Care", href: "/about#care" },
  { label: "Contact Us", href: "/about#contact" },
];

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-line bg-gradient-to-b from-blush-soft to-cream-deep">
      <div className="mx-auto grid max-w-7xl gap-12 px-4 py-16 lg:grid-cols-[1.3fr_1fr_1fr_1.3fr] lg:px-8">
        <div>
          <BrandLogo size="md" className="!items-start" />
          <p className="mt-5 max-w-xs text-sm leading-relaxed text-ink-soft">
            Distinctive designs, carefully crafted with an eye for detail.
            Made in small batches and packaged with love.
          </p>
          <div className="mt-6 flex gap-3">
            {SOCIAL_LINKS.map(({ Icon, href, label }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noreferrer"
                aria-label={label}
                className="rounded-full border border-line bg-cream p-2.5 text-rose-deep transition hover:bg-rose-deep hover:text-cream"
              >
                <Icon className="h-4 w-4" />
              </a>
            ))}
          </div>
        </div>

        <div>
          <h4 className="eyebrow">Shop</h4>
          <ul className="mt-5 space-y-2.5 text-sm text-ink-soft">
            {SHOP_LINKS.map((link) => (
              <li key={link.label}>
                <Link href={link.href} className="transition hover:text-rose-deep">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="eyebrow">Client Care</h4>
          <ul className="mt-5 space-y-2.5 text-sm text-ink-soft">
            {CARE_LINKS.map((link) => (
              <li key={link.label}>
                <Link href={link.href} className="transition hover:text-rose-deep">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="eyebrow">The Prem Circle</h4>
          <p className="mt-5 mb-4 text-sm text-ink-soft">
            Early access to new drops, styling notes and private offers.
          </p>
          <NewsletterForm />
          <div className="mt-6 space-y-1 text-sm text-ink-soft">
            <p>{BRAND.phone}</p>
            <p>{BRAND.email}</p>
          </div>
        </div>
      </div>

      <div className="border-t border-line/80">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-6 text-[0.68rem] tracking-[0.16em] uppercase text-muted sm:flex-row lg:px-8">
          <p>© {new Date().getFullYear()} Prem by SHK. All rights reserved.</p>
          <p>{BRAND.tagline}</p>
        </div>
      </div>
    </footer>
  );
}
