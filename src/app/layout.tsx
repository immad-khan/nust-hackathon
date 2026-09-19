import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Cormorant_Garamond, Jost, Parisienne } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/components/cart-provider";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { WhatsAppButton } from "@/components/whatsapp-button";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-cormorant",
  display: "swap",
});

const jost = Jost({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-jost",
  display: "swap",
});

const parisienne = Parisienne({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-parisienne",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Prem by SHK — Premium Quality, Exclusively For You",
  description:
    "Hand-finished luxury fashion jewellery in warm gold, mother-of-pearl and hand-poured enamel. Earrings, rings, bracelets, necklaces and gift sets.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      className={`${cormorant.variable} ${jost.variable} ${parisienne.variable}`}
    >
      <body className="bg-cream text-ink antialiased">
        <CartProvider>
          <SiteHeader />
          <main>{children}</main>
          <SiteFooter />
        </CartProvider>
        <WhatsAppButton />
      </body>
    </html>
  );
}
