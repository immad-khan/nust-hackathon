"use client";

import { usePathname } from "next/navigation";
import { WhatsAppMark } from "@/components/whatsapp-mark";
import { whatsappLink } from "@/lib/whatsapp";

export function WhatsAppButton() {
  const pathname = usePathname();

  if (pathname?.startsWith("/admin")) return null;

  const message = pathname?.startsWith("/product/")
    ? "Assalam o Alaikum! I have a question about a piece I'm viewing on your website. Could you help me?"
    : "Assalam o Alaikum! I have a question about Prem by SHK. Could you help me?";

  return (
    <a
      href={whatsappLink(message)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with Prem by SHK on WhatsApp"
      title="Chat on WhatsApp"
      className="fixed z-[60] flex items-center justify-center border border-cream/45 bg-rose-deep p-0 text-cream shadow-[0_10px_28px_-10px_rgba(69,42,32,0.8)] transition-transform duration-200 hover:scale-105 hover:bg-rose focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose"
      style={{
        width: 52,
        height: 52,
        minWidth: 52,
        minHeight: 52,
        right: 18,
        bottom: 18,
        borderRadius: "50%",
        lineHeight: 0,
      }}
    >
      <WhatsAppMark className="block h-7 w-7" />
    </a>
  );
}
