"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BrandLogo } from "@/components/brand-logo";
import { CartDrawer } from "@/components/cart-drawer";
import { useCart } from "@/components/cart-provider";
import {
  BagIcon,
  CloseIcon,
  HeartIcon,
  MenuIcon,
  SearchIcon,
  UserIcon,
} from "@/components/icons";

const NAV = [
  { label: "New In", href: "/shop?sort=newest" },
  { label: "Earrings", href: "/shop?category=earrings" },
  { label: "Cuffs", href: "/shop?category=cuffs" },
  { label: "Rings", href: "/shop?category=rings" },
  { label: "Bracelets", href: "/shop?category=bracelets" },
  { label: "Necklaces", href: "/shop?category=necklaces" },
  { label: "Gift Sets", href: "/shop?category=sets" },
  { label: "Our Story", href: "/about" },
];

export function SiteHeader() {
  const { count, openCart, wishlist } = useCart();
  const [scrolled, setScrolled] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [term, setTerm] = useState("");
  const router = useRouter();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const submitSearch = (event: React.FormEvent) => {
    event.preventDefault();
    const q = term.trim();
    setSearchOpen(false);
    setMenuOpen(false);
    router.push(q ? `/shop?q=${encodeURIComponent(q)}` : "/shop");
  };

  return (
    <>
      <div className="border-b border-line/60 bg-cream-deep text-ink-soft">
        <div className="mx-auto flex max-w-7xl items-center justify-center px-4 py-2 text-[0.64rem] tracking-[0.18em] uppercase lg:px-8">
          <p className="text-center text-muted">Ethical luxury, beautifully crafted</p>
        </div>
      </div>

      <header
        className={`sticky top-0 z-40 border-b border-line/70 transition-all duration-300 ${
          scrolled
            ? "bg-cream/95 shadow-[0_10px_30px_-24px_rgba(69,42,32,0.7)] backdrop-blur"
            : "bg-cream/80 backdrop-blur-sm"
        }`}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 lg:px-8">
          <button
            aria-label="Open menu"
            onClick={() => setMenuOpen(true)}
            className="text-ink transition hover:text-rose lg:hidden"
          >
            <MenuIcon className="h-6 w-6" />
          </button>

          <BrandLogo size="sm" className="shrink-0" />

          <nav className="hidden items-center gap-7 text-[0.72rem] font-medium tracking-[0.2em] uppercase text-ink-soft lg:flex">
            {NAV.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="relative py-1 transition-colors hover:text-rose-deep after:absolute after:inset-x-0 after:-bottom-0.5 after:h-px after:origin-left after:scale-x-0 after:bg-rose after:transition-transform hover:after:scale-x-100"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3 text-ink sm:gap-4">
            <button
              aria-label="Search"
              onClick={() => setSearchOpen((v) => !v)}
              className="transition hover:text-rose"
            >
              <SearchIcon className="h-5 w-5" />
            </button>
            <Link
              href="/account"
              aria-label="Account"
              className="hidden transition hover:text-rose sm:block"
            >
              <UserIcon className="h-5 w-5" />
            </Link>
            <Link
              href="/wishlist"
              aria-label="Wishlist"
              className="relative transition hover:text-rose"
            >
              <HeartIcon className="h-5 w-5" />
              {wishlist.length > 0 && (
                <span className="absolute -top-1.5 -right-2 rounded-full bg-rose px-1.5 text-[0.6rem] font-semibold text-cream">
                  {wishlist.length}
                </span>
              )}
            </Link>
            <button
              aria-label="Cart"
              onClick={openCart}
              className="relative transition hover:text-rose"
            >
              <BagIcon className="h-5 w-5" />
              <span className="absolute -top-1.5 -right-2 rounded-full bg-rose px-1.5 text-[0.6rem] font-semibold text-cream">
                {count}
              </span>
            </button>
            <Link
              href="/appointment"
              className="hidden rounded-sm bg-gradient-to-r from-rose-deep to-rose px-5 py-2.5 text-[0.66rem] font-medium tracking-[0.2em] uppercase text-cream transition hover:from-rose hover:to-rose-deep xl:block"
            >
              Contact Us
            </Link>
          </div>
        </div>

        {searchOpen && (
          <div className="border-t border-line bg-blush-soft/70">
            <form
              onSubmit={submitSearch}
              className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-4"
            >
              <SearchIcon className="h-5 w-5 text-rose" />
              <input
                autoFocus
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                placeholder="Search pearls, hoops, blossom rings…"
                className="w-full bg-transparent text-sm tracking-wide text-ink outline-none placeholder:text-muted/70"
              />
              <button
                type="submit"
                className="rounded-sm bg-rose-deep px-4 py-2 text-[0.65rem] tracking-[0.2em] uppercase text-cream"
              >
                Search
              </button>
            </form>
          </div>
        )}
      </header>

      {menuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            aria-label="Close menu overlay"
            onClick={() => setMenuOpen(false)}
            className="absolute inset-0 bg-ink/40 backdrop-blur-sm"
          />
          <div className="absolute inset-y-0 left-0 w-[82%] max-w-xs overflow-y-auto bg-cream px-6 py-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <BrandLogo size="sm" />
              <button aria-label="Close menu" onClick={() => setMenuOpen(false)}>
                <CloseIcon className="h-5 w-5 text-ink" />
              </button>
            </div>
            <nav className="mt-8 flex flex-col gap-1">
              {NAV.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className="border-b border-line/60 py-3 font-serif text-xl text-ink transition hover:text-rose"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            <Link
              href="/appointment"
              onClick={() => setMenuOpen(false)}
              className="mt-8 block rounded-sm bg-rose-deep px-5 py-3 text-center text-[0.68rem] tracking-[0.22em] uppercase text-cream"
            >
              Contact Us
            </Link>
          </div>
        </div>
      )}

      <CartDrawer />
    </>
  );
}
