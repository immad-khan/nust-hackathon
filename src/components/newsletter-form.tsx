"use client";

import { useState } from "react";
import { ArrowRight } from "@/components/icons";

export function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">(
    "idle",
  );

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setStatus("loading");
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) throw new Error("failed");
      setStatus("done");
      setEmail("");
    } catch {
      setStatus("error");
    }
  }

  return (
    <form onSubmit={submit} className="w-full max-w-md">
      <div className="flex items-center gap-2 border-b border-rose-light/70 pb-2">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Your email address"
          className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-muted/70"
        />
        <button
          type="submit"
          disabled={status === "loading"}
          aria-label="Subscribe"
          className="flex items-center gap-2 text-[0.65rem] tracking-[0.2em] uppercase text-rose-deep transition hover:text-rose disabled:opacity-50"
        >
          {status === "loading" ? "Sending" : "Subscribe"}
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
      {status === "done" && (
        <p className="mt-2 text-xs text-rose-deep">
          Welcome to the Prem circle — a little something is on its way to your
          inbox.
        </p>
      )}
      {status === "error" && (
        <p className="mt-2 text-xs text-rose-deep">
          Something went wrong. Please try again.
        </p>
      )}
    </form>
  );
}
