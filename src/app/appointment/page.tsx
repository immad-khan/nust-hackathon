"use client";

import { useState } from "react";
import {
  CalendarIcon,
  FacebookIcon,
  GemIcon,
  InstagramIcon,
  TikTokIcon,
  WhatsappIcon,
} from "@/components/icons";
import { BRAND } from "@/lib/content";

export default function AppointmentPage() {
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">(
    "idle",
  );
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    message: "",
  });

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setStatus("loading");
    try {
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("failed");
      setStatus("done");
      setForm({ name: "", email: "", phone: "", message: "" });
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="mx-auto grid max-w-6xl gap-12 px-4 py-16 lg:grid-cols-2 lg:px-8">
      <div>
        <p className="eyebrow">Get in Touch</p>
        <h1 className="mt-3 font-serif text-5xl leading-tight font-light text-ink">
          Contact
          <span className="block font-script text-5xl rose-gradient-text">
            Us
          </span>
        </h1>
        <span className="hairline mt-5 block w-20" />
        <p className="mt-6 max-w-md text-sm leading-relaxed text-ink-soft">
          Have a question about our pieces, an order, or a bespoke request? Send
          us a message and our team will get back to you within one working day.
        </p>

        <ul className="mt-8 space-y-4 text-sm text-ink-soft">
          <li className="flex items-start gap-3">
            <GemIcon className="mt-0.5 h-5 w-5 shrink-0 text-rose" />
            We answer all enquiries within one working day.
          </li>
          <li className="flex items-start gap-3">
            <CalendarIcon className="mt-0.5 h-5 w-5 shrink-0 text-rose" />
            Monday to Sunday, 10am – 8pm PKT.
          </li>
          <li className="flex items-start gap-3">
            <WhatsappIcon className="mt-0.5 h-5 w-5 shrink-0 text-rose" />
            Prefer to chat? {BRAND.phone}
          </li>
        </ul>

        <div className="mt-8 border-t border-line/60 pt-6">
          <p className="text-[0.66rem] font-medium tracking-[0.2em] uppercase text-rose-deep">
            Connect With Us
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <a
              href={BRAND.instagram}
              target="_blank"
              rel="noreferrer"
              aria-label="Instagram"
              className="flex items-center gap-2 rounded-full border border-line bg-cream px-4 py-2 text-xs text-ink-soft transition hover:border-rose hover:bg-rose-deep hover:text-cream group"
            >
              <InstagramIcon className="h-4 w-4 text-rose-deep transition group-hover:text-cream" />
              <span>Instagram</span>
            </a>
            <a
              href={BRAND.facebook}
              target="_blank"
              rel="noreferrer"
              aria-label="Facebook"
              className="flex items-center gap-2 rounded-full border border-line bg-cream px-4 py-2 text-xs text-ink-soft transition hover:border-rose hover:bg-rose-deep hover:text-cream group"
            >
              <FacebookIcon className="h-4 w-4 text-rose-deep transition group-hover:text-cream" />
              <span>Facebook</span>
            </a>
            <a
              href={BRAND.tiktok}
              target="_blank"
              rel="noreferrer"
              aria-label="TikTok"
              className="flex items-center gap-2 rounded-full border border-line bg-cream px-4 py-2 text-xs text-ink-soft transition hover:border-rose hover:bg-rose-deep hover:text-cream group"
            >
              <TikTokIcon className="h-4 w-4 text-rose-deep transition group-hover:text-cream" />
              <span>TikTok</span>
            </a>
          </div>
        </div>

        <div className="mt-8 overflow-hidden rounded-sm">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/gift-giving.jpg"
            alt="Signature Prem by SHK packaging"
            className="h-56 w-full object-cover"
          />
        </div>
      </div>

      <form
        onSubmit={submit}
        className="h-fit rounded-sm border border-line bg-cream p-8"
      >
        <h2 className="font-serif text-2xl text-ink">Contact form</h2>
        <div className="mt-6 space-y-5">
          {[
            { key: "name", label: "Full name", type: "text", required: true },
            { key: "email", label: "Email", type: "email", required: true },
            { key: "phone", label: "Phone / WhatsApp", type: "tel", required: false },
          ].map((field) => (
            <label key={field.key} className="block">
              <span className="text-[0.66rem] tracking-[0.18em] uppercase text-muted">
                {field.label}
                {field.required ? " *" : ""}
              </span>
              <input
                type={field.type}
                required={field.required}
                value={form[field.key as keyof typeof form]}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, [field.key]: e.target.value }))
                }
                className="mt-2 w-full border-b border-line bg-transparent py-2 text-sm text-ink outline-none transition focus:border-rose"
              />
            </label>
          ))}
          <label className="block">
            <span className="text-[0.66rem] tracking-[0.18em] uppercase text-muted">
              Notes
            </span>
            <textarea
              rows={4}
              value={form.message}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, message: e.target.value }))
              }
              className="mt-2 w-full border-b border-line bg-transparent py-2 text-sm text-ink outline-none transition focus:border-rose"
            />
          </label>
        </div>

        <button
          type="submit"
          disabled={status === "loading"}
          className="mt-8 w-full rounded-sm bg-gradient-to-r from-rose-deep to-rose px-8 py-4 text-[0.7rem] tracking-[0.24em] uppercase text-cream transition hover:from-rose hover:to-rose-deep disabled:opacity-60"
        >
          {status === "loading" ? "Sending…" : "Send message"}
        </button>

        {status === "done" && (
          <p className="mt-4 text-sm text-rose-deep">
            Thank you — we will be in touch within one working day.
          </p>
        )}
        {status === "error" && (
          <p className="mt-4 text-sm text-rose-deep">
            Something went wrong. Please try again or call us directly.
          </p>
        )}
      </form>
    </div>
  );
}
