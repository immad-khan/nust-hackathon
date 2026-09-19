"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { CloseIcon, MenuIcon } from "@/components/icons";

export const ADMIN_PASSWORD = "prembyshk";
export const TOKEN_KEY = "prem_admin_token";
export const PASS_KEY = "prem_admin_password";

export function getAdminAuthHeaders(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const token = window.localStorage.getItem(TOKEN_KEY);
  const savedPassword = window.localStorage.getItem(PASS_KEY);
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(savedPassword ? { "x-admin-password": savedPassword } : {}),
  };
}

export type AdminNavItem = {
  href: string;
  label: string;
  icon: string;
  badge?: string;
  description: string;
};

export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  {
    href: "/admin",
    label: "Products",
    icon: "💎",
    description: "Catalog & product management",
  },
  {
    href: "/admin/orders",
    label: "Orders",
    icon: "📦",
    description: "Customer orders & fulfillment",
  },
  {
    href: "/admin/inventory",
    label: "Inventory",
    icon: "📊",
    description: "Stock tracking & SKU management",
  },
  {
    href: "/admin/integrations",
    label: "Integrations",
    icon: "🔌",
    badge: "New",
    description: "Notion, Slack & Sheets sync",
  },
  {
    href: "/admin/chat",
    label: "AI Chat",
    icon: "✨",
    badge: "Beta",
    description: "Ask AI about your store",
  },
];

export function useAdminAuth() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const savedPassword = window.localStorage.getItem(PASS_KEY);
    if (savedPassword) {
      setAuthenticated(true);
      return;
    }

    fetch("/api/admin/session", {
      cache: "no-store",
      headers: getAdminAuthHeaders(),
    })
      .then((res) => res.json())
      .then((data: { authenticated?: boolean; token?: string }) => {
        if (data.authenticated) {
          if (data.token) window.localStorage.setItem(TOKEN_KEY, data.token);
          setAuthenticated(true);
        } else {
          setAuthenticated(false);
        }
      })
      .catch(() => {
        setAuthenticated(false);
      });
  }, []);

  async function signIn(pass: string) {
    const cleanPass = pass.trim();
    if (!cleanPass) return;
    setLoading(true);
    setNotice("");
    try {
      const res = await fetch("/api/admin/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: cleanPass }),
      });
      const data = (await res.json()) as { authenticated?: boolean; token?: string };
      if (!res.ok || !data.authenticated) {
        setNotice("Wrong password. Use premb yshk without spaces: premb yshk".replace(/ /g, ""));
        return;
      }
      window.localStorage.setItem(PASS_KEY, cleanPass);
      if (data.token) window.localStorage.setItem(TOKEN_KEY, data.token);
      setAuthenticated(true);
    } catch {
      setNotice("Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function signOut() {
    window.localStorage.removeItem(PASS_KEY);
    window.localStorage.removeItem(TOKEN_KEY);
    await fetch("/api/admin/session", { method: "DELETE" }).catch(() => undefined);
    setAuthenticated(false);
  }

  return {
    authenticated,
    loading,
    notice,
    setNotice,
    signIn,
    signOut,
    authHeaders: getAdminAuthHeaders,
  };
}

interface AdminShellProps {
  children: ReactNode;
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}

export function AdminShell({
  children,
  eyebrow = "Studio CRM",
  title,
  description,
  actions,
}: AdminShellProps) {
  const pathname = usePathname();
  const { authenticated, loading, notice, signIn, signOut } = useAdminAuth();
  const [password, setPassword] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (authenticated === null) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-rose border-t-transparent" />
          <p className="text-xs uppercase tracking-[0.2em] text-muted">Loading studio…</p>
        </div>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="mx-auto flex min-h-[75vh] max-w-md items-center px-4 py-12">
        <div className="w-full rounded-sm border border-line bg-cream p-6 shadow-sm sm:p-10">
          <p className="eyebrow">Restricted</p>
          <h1 className="mt-3 font-serif text-3xl text-ink">Studio Access</h1>
          <span className="hairline mt-4 block w-14" />
          <p className="mt-4 text-sm text-ink-soft">
            Enter the studio password to access the store admin panel.
          </p>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void signIn(password)}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            className="mt-6 w-full border-b border-line bg-transparent py-2 text-sm text-ink outline-none focus:border-rose"
            placeholder="Studio password"
            autoFocus
          />
          <button
            onClick={() => void signIn(password)}
            disabled={loading || !password.trim()}
            className="mt-6 w-full rounded-sm bg-rose-deep px-6 py-3 text-[0.68rem] tracking-[0.22em] uppercase text-cream transition hover:bg-rose disabled:opacity-50"
          >
            {loading ? "Checking…" : "Enter Studio"}
          </button>
          <button
            type="button"
            onClick={() => void signIn(ADMIN_PASSWORD)}
            className="mt-4 w-full rounded-sm border border-line px-6 py-3 text-[0.68rem] tracking-[0.18em] uppercase text-rose-deep transition hover:border-rose-light hover:bg-blush-soft"
          >
            Quick owner login
          </button>
          {notice && <p className="mt-4 text-center text-sm text-rose-deep">{notice}</p>}
          <Link
            href="/"
            className="mt-5 block text-center text-[0.66rem] tracking-[0.18em] uppercase text-muted transition hover:text-rose-deep"
          >
            Back to store
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#faf4f0]">
      {/* Top Admin Sub-bar */}
      <div className="border-b border-line bg-cream/90 backdrop-blur-md sticky top-0 z-40">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-14 items-center justify-between gap-4">
            {/* Logo / Brand & Mobile trigger */}
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-1.5 text-ink hover:text-rose-deep"
                aria-label="Toggle navigation menu"
              >
                {mobileMenuOpen ? <CloseIcon className="h-5 w-5" /> : <MenuIcon className="h-5 w-5" />}
              </button>
              <Link href="/admin" className="flex items-center gap-2">
                <span className="font-serif text-lg tracking-wider text-ink font-medium">PREM</span>
                <span className="rounded-full bg-blush-soft px-2 py-0.5 text-[0.58rem] tracking-[0.18em] uppercase text-rose-deep border border-rose-light/40">
                  Studio Admin
                </span>
              </Link>
            </div>

            {/* Desktop Navigation Links */}
            <nav className="hidden lg:flex items-center gap-1">
              {ADMIN_NAV_ITEMS.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2 rounded-sm px-3.5 py-1.5 text-[0.66rem] tracking-[0.16em] uppercase transition ${
                      isActive
                        ? "bg-rose-deep text-cream font-medium shadow-xs"
                        : "text-ink-soft hover:bg-blush-soft hover:text-rose-deep"
                    }`}
                  >
                    <span>{item.icon}</span>
                    <span>{item.label}</span>
                    {item.badge && (
                      <span className={`text-[0.52rem] px-1.5 py-0.2 rounded-full ${
                        isActive ? "bg-cream text-rose-deep" : "bg-rose-deep/10 text-rose-deep"
                      }`}>
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>

            {/* Quick Actions */}
            <div className="flex items-center gap-2">
              <Link
                href="/"
                className="hidden sm:inline-block rounded-sm border border-line px-3 py-1.5 text-[0.62rem] tracking-[0.16em] uppercase text-ink-soft transition hover:bg-blush-soft hover:text-ink"
              >
                View Store
              </Link>
              <button
                onClick={() => void signOut()}
                className="rounded-sm border border-line px-3 py-1.5 text-[0.62rem] tracking-[0.16em] uppercase text-muted transition hover:bg-blush-soft hover:text-rose-deep"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu dropdown */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-line bg-cream px-4 py-3 shadow-lg animate-fade-up">
            <div className="grid gap-1">
              {ADMIN_NAV_ITEMS.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center justify-between rounded-sm px-3 py-2.5 text-xs uppercase tracking-[0.16em] transition ${
                      isActive
                        ? "bg-rose-deep text-cream font-medium"
                        : "text-ink hover:bg-blush-soft"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span>{item.icon}</span>
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className="text-[0.55rem] px-2 py-0.5 rounded-full bg-rose-light/20 text-rose-deep">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
              <Link
                href="/"
                onClick={() => setMobileMenuOpen(false)}
                className="mt-2 flex items-center gap-2 rounded-sm border border-line px-3 py-2 text-xs uppercase tracking-[0.16em] text-muted hover:bg-blush-soft"
              >
                <span>↗</span> View Public Store
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:py-10 lg:px-8">
        {/* Page Header */}
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between pb-6 border-b border-line/60">
          <div>
            <p className="eyebrow">{eyebrow}</p>
            <h1 className="mt-2 font-serif text-3xl sm:text-4xl text-ink">{title}</h1>
            <span className="hairline mt-3 block w-16" />
            {description && (
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-soft">
                {description}
              </p>
            )}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2.5">{actions}</div>}
        </div>

        {/* Content Body */}
        <div className="mt-8">{children}</div>
      </main>
    </div>
  );
}
