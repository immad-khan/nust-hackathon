"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { BagIcon, HeartIcon, UserIcon } from "@/components/icons";

export default function AccountPage() {
  const [number, setNumber] = useState("");
  const router = useRouter();

  return (
    <div className="mx-auto max-w-4xl px-4 py-16 lg:px-8">
      <div className="text-center">
        <p className="eyebrow">Client Area</p>
        <h1 className="mt-2 font-serif text-5xl font-light text-ink">
          Your Account
        </h1>
        <span className="hairline mx-auto mt-4 block w-20" />
      </div>

      <div className="mt-12 grid gap-6 sm:grid-cols-3">
        {[
          { icon: BagIcon, label: "Shopping Bag", href: "/cart" },
          { icon: HeartIcon, label: "Wishlist", href: "/wishlist" },
          { icon: UserIcon, label: "Contact Us", href: "/appointment" },
        ].map((tile) => (
          <Link
            key={tile.label}
            href={tile.href}
            className="flex flex-col items-center rounded-sm border border-line bg-blush-soft/40 px-6 py-10 text-center transition hover:border-rose-light hover:bg-blush-soft"
          >
            <tile.icon className="h-7 w-7 text-rose" />
            <p className="mt-4 text-[0.7rem] tracking-[0.2em] uppercase text-ink">
              {tile.label}
            </p>
          </Link>
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (number.trim()) router.push(`/order/${number.trim().toUpperCase()}`);
        }}
        className="mt-12 rounded-sm border border-line bg-cream p-8"
      >
        <h2 className="font-serif text-2xl text-ink">Track an order</h2>
        <p className="mt-2 text-sm text-ink-soft">
          Enter the order number from your confirmation, for example PRM-XXXXXX.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <input
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            placeholder="PRM-ABC123"
            className="flex-1 border-b border-line bg-transparent py-2 text-sm text-ink outline-none transition focus:border-rose"
          />
          <button
            type="submit"
            className="rounded-sm bg-rose-deep px-6 py-3 text-[0.68rem] tracking-[0.22em] uppercase text-cream transition hover:bg-rose"
          >
            Track order
          </button>
        </div>
      </form>
    </div>
  );
}
