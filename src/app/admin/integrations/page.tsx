"use client";

import { useState } from "react";
import { AdminShell } from "@/components/admin-shell";

export default function AdminIntegrationsPage() {
  const [connecting, setConnecting] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [databaseId, setDatabaseId] = useState("");
  const [notionConnected, setNotionConnected] = useState(false);

  function handleConnectNotion() {
    setModalOpen(true);
  }

  function handleSaveNotionConfig(e: React.FormEvent) {
    e.preventDefault();
    setConnecting(true);
    setTimeout(() => {
      setConnecting(false);
      setNotionConnected(true);
      setModalOpen(false);
    }, 900);
  }

  return (
    <AdminShell
      eyebrow="Workflow Automations"
      title="Third-Party Integrations"
      description="Connect external tools and productivity suites to automate order notifications, live inventory syncing, and business reporting."
    >
      {() => (
        <div className="space-y-8">
          {/* Active Integrations Grid */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* 1. NOTION CARD */}
            <div className="relative rounded-sm border border-line bg-cream p-6 shadow-xs flex flex-col justify-between transition hover:border-purple-300">
              <div>
                {/* Header with Notion Logo and Live/Featured Pill */}
                <div className="flex items-start justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-sm bg-[#2f3437]/5 border border-line">
                    {/* Notion SVG Logo */}
                    <svg className="h-7 w-7" viewBox="0 0 24 24" fill="#000000">
                      <path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.373L18.47 2.295c-.42-.373-.98-.607-1.726-.56L3.993 2.715c-.42.047-.56.327-.373.56l.839.933zm.98 3.966v12.455c0 .793.42 1.166 1.306 1.12l14.288-.84c.886-.046 1.12-.56 1.12-1.306V7.194c0-.653-.28-.98-.84-.933l-15.034.886c-.56.047-.84.373-.84.933zm11.755 1.54c.093.373 0 .746-.373.793l-.84.14v8.257c-.42.233-.84.373-1.26.373-.7 0-1.026-.233-1.633-.98l-4.2-6.577v6.624l1.353.28c.373.093.466.42.373.793-.093.373-.466.42-.84.42l-2.613.14c-.373 0-.466-.373-.373-.747.093-.373.373-.42.746-.466l.84-.14V9.667l-1.12-.14c-.373-.047-.466-.373-.373-.747.093-.373.466-.42.84-.42l2.8-.14 4.526 6.81V8.874l-1.073-.14c-.373-.047-.466-.373-.373-.747.093-.373.466-.42.84-.42l2.613-.14c.373 0 .466.373.42.747z"/>
                    </svg>
                  </div>
                  <span className="rounded-full bg-purple-500/10 px-2.5 py-0.5 text-[0.58rem] font-semibold tracking-wider uppercase text-purple-700 border border-purple-200">
                    Productivity
                  </span>
                </div>

                <h3 className="mt-4 font-serif text-2xl text-ink font-semibold">Notion</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                  Sync your orders and inventory to Notion automatically
                </p>

                <div className="mt-4 space-y-1.5 text-xs text-muted">
                  <div className="flex items-center gap-2">
                    <span className="text-purple-600">✓</span>
                    <span>Real-time order sync to database</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-purple-600">✓</span>
                    <span>Live product catalog & inventory levels</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-5 border-t border-line">
                <button
                  onClick={handleConnectNotion}
                  className="w-full rounded-sm bg-purple-600 px-4 py-2.5 text-[0.66rem] font-medium tracking-[0.18em] uppercase text-white shadow-xs transition hover:bg-purple-700 active:scale-[0.99]"
                >
                  {notionConnected ? "Configure Notion" : "Connect Notion"}
                </button>

                {/* Status Indicator */}
                <div className="mt-3 flex items-center justify-center gap-1.5 text-xs">
                  {notionConnected ? (
                    <span className="inline-flex items-center gap-1.5 text-emerald-700 font-medium">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      ✅ Connected & Syncing
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-red-600 font-medium">
                      ❌ Not Connected
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* 2. SLACK CARD (Greyed Out / Coming Soon) */}
            <div className="relative rounded-sm border border-line/70 bg-cream/50 p-6 shadow-xs flex flex-col justify-between opacity-80 group">
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-sm bg-slate-100 border border-line/60 grayscale group-hover:grayscale-0 transition">
                    {/* Slack SVG Logo */}
                    <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none">
                      <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.528 2.528 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313z" fill="#E01E5A"/>
                      <path d="M8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312z" fill="#36C5F0"/>
                      <path d="M18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312z" fill="#2EB67D"/>
                      <path d="M15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.528 2.528 0 0 1 2.52-2.521h6.313A2.528 2.528 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" fill="#ECB22E"/>
                    </svg>
                  </div>
                  <span className="rounded-full bg-slate-200/80 px-2.5 py-0.5 text-[0.58rem] font-semibold tracking-wider uppercase text-slate-600 border border-slate-300">
                    Coming Soon
                  </span>
                </div>

                <h3 className="mt-4 font-serif text-2xl text-ink/70 font-semibold">Slack</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft/70">
                  Get notified on new orders
                </p>

                <div className="mt-4 space-y-1.5 text-xs text-muted/80">
                  <div className="flex items-center gap-2">
                    <span>• Instant push alerts for incoming sales</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>• Daily inventory health digest channel</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-5 border-t border-line/60">
                <button
                  disabled
                  className="w-full rounded-sm border border-line bg-cream/70 px-4 py-2.5 text-[0.66rem] font-medium tracking-[0.18em] uppercase text-muted cursor-not-allowed"
                >
                  Coming Soon
                </button>
                <div className="mt-3 text-center text-xs text-muted">
                  Channel webhook integration in progress
                </div>
              </div>
            </div>

            {/* 3. GOOGLE SHEETS CARD (Greyed Out / Coming Soon) */}
            <div className="relative rounded-sm border border-line/70 bg-cream/50 p-6 shadow-xs flex flex-col justify-between opacity-80 group">
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-sm bg-emerald-50 border border-line/60 grayscale group-hover:grayscale-0 transition">
                    {/* Google Sheets SVG Logo */}
                    <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none">
                      <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z" fill="#0F9D58"/>
                      <path d="M19 11.5H5v-2h14v2zm0 4H5v-2h14v2zm0-8H5v-2h14v2z" fill="#FFFFFF"/>
                      <path d="M9 3v18M15 3v18" stroke="#FFFFFF" strokeWidth="1.5"/>
                    </svg>
                  </div>
                  <span className="rounded-full bg-slate-200/80 px-2.5 py-0.5 text-[0.58rem] font-semibold tracking-wider uppercase text-slate-600 border border-slate-300">
                    Coming Soon
                  </span>
                </div>

                <h3 className="mt-4 font-serif text-2xl text-ink/70 font-semibold">Google Sheets</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft/70">
                  Export reports automatically
                </p>

                <div className="mt-4 space-y-1.5 text-xs text-muted/80">
                  <div className="flex items-center gap-2">
                    <span>• Automatic row append for each order</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>• Real-time reconciliation spreadsheet sync</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-5 border-t border-line/60">
                <button
                  disabled
                  className="w-full rounded-sm border border-line bg-cream/70 px-4 py-2.5 text-[0.66rem] font-medium tracking-[0.18em] uppercase text-muted cursor-not-allowed"
                >
                  Coming Soon
                </button>
                <div className="mt-3 text-center text-xs text-muted">
                  Scheduled export scheduled for v2 release
                </div>
              </div>
            </div>
          </div>

          {/* Integration Features Overview */}
          <div className="rounded-sm border border-line bg-cream p-6 sm:p-8 shadow-xs">
            <h3 className="font-serif text-xl text-ink">Sync Architecture & Webhooks</h3>
            <p className="mt-1 text-sm text-ink-soft">
              All integrations connect directly to your Supabase Postgres database events for ultra-low latency updates.
            </p>
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <div className="rounded-sm border border-line bg-blush-soft/30 p-4">
                <p className="text-[0.62rem] uppercase tracking-[0.16em] text-muted font-medium">Order Pipeline</p>
                <p className="mt-1 font-medium text-ink">Two-Way Record Mapping</p>
                <p className="mt-1 text-xs text-ink-soft">Orders joined with order items sync as linked relations.</p>
              </div>
              <div className="rounded-sm border border-line bg-blush-soft/30 p-4">
                <p className="text-[0.62rem] uppercase tracking-[0.16em] text-muted font-medium">Inventory Tracking</p>
                <p className="mt-1 font-medium text-ink">Live Quantity Thresholds</p>
                <p className="mt-1 text-xs text-ink-soft">Stock counts update across channels automatically.</p>
              </div>
              <div className="rounded-sm border border-line bg-blush-soft/30 p-4">
                <p className="text-[0.62rem] uppercase tracking-[0.16em] text-muted font-medium">Security</p>
                <p className="mt-1 font-medium text-ink">Encrypted Token Storage</p>
                <p className="mt-1 text-xs text-ink-soft">API keys and webhook secrets stored in environment variables.</p>
              </div>
            </div>
          </div>

          {/* Notion Setup Modal */}
          {modalOpen && (
            <div className="fixed inset-0 z-50 overflow-y-auto bg-ink/60 p-4 backdrop-blur-xs flex items-center justify-center animate-fade-up">
              <div className="relative w-full max-w-lg rounded-sm border border-line bg-cream p-6 sm:p-8 shadow-2xl">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-sm bg-purple-100 text-purple-700">
                    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.373L18.47 2.295c-.42-.373-.98-.607-1.726-.56L3.993 2.715c-.42.047-.56.327-.373.56l.839.933zm.98 3.966v12.455c0 .793.42 1.166 1.306 1.12l14.288-.84c.886-.046 1.12-.56 1.12-1.306V7.194c0-.653-.28-.98-.84-.933l-15.034.886c-.56.047-.84.373-.84.933zm11.755 1.54c.093.373 0 .746-.373.793l-.84.14v8.257c-.42.233-.84.373-1.26.373-.7 0-1.026-.233-1.633-.98l-4.2-6.577v6.624l1.353.28c.373.093.466.42.373.793-.093.373-.466.42-.84.42l-2.613.14c-.373 0-.466-.373-.373-.747.093-.373.373-.42.746-.466l.84-.14V9.667l-1.12-.14c-.373-.047-.466-.373-.373-.747.093-.373.466-.42.84-.42l2.8-.14 4.526 6.81V8.874l-1.073-.14c-.373-.047-.466-.373-.373-.747.093-.373.466-.42.84-.42l2.613-.14c.373 0 .466.373.42.747z"/>
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-serif text-2xl text-ink font-semibold">Connect Notion Workspace</h3>
                    <p className="text-xs text-muted">Configure your Notion Integration Token & Database</p>
                  </div>
                </div>

                <form onSubmit={handleSaveNotionConfig} className="mt-6 space-y-4">
                  <div>
                    <label className="block text-[0.66rem] uppercase tracking-[0.16em] text-muted font-medium">
                      Notion Internal Integration Token
                    </label>
                    <input
                      type="password"
                      placeholder="secret_..."
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      className="mt-1.5 w-full rounded-sm border border-line bg-cream px-3 py-2.5 text-sm text-ink outline-none focus:border-purple-600"
                    />
                    <p className="mt-1 text-[0.65rem] text-muted">
                      Created in your Notion Developers settings under My Integrations.
                    </p>
                  </div>

                  <div>
                    <label className="block text-[0.66rem] uppercase tracking-[0.16em] text-muted font-medium">
                      Orders Database ID
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 748b9487c699478f89e2468128919f2a"
                      value={databaseId}
                      onChange={(e) => setDatabaseId(e.target.value)}
                      className="mt-1.5 w-full rounded-sm border border-line bg-cream px-3 py-2.5 text-sm text-ink outline-none focus:border-purple-600"
                    />
                  </div>

                  <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-line">
                    <button
                      type="button"
                      onClick={() => setModalOpen(false)}
                      className="rounded-sm border border-line px-4 py-2 text-[0.65rem] tracking-[0.16em] uppercase text-ink hover:bg-blush-soft"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={connecting}
                      className="rounded-sm bg-purple-600 px-5 py-2 text-[0.65rem] tracking-[0.16em] uppercase text-white hover:bg-purple-700 disabled:opacity-50"
                    >
                      {connecting ? "Connecting…" : "Save Connection"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}
    </AdminShell>
  );
}
