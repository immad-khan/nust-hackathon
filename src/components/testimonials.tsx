"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "@/components/icons";
import { Stars } from "@/components/stars";
import { TESTIMONIALS } from "@/lib/content";

export function Testimonials() {
  const [index, setIndex] = useState(0);
  const perView = 3;
  const maxIndex = Math.max(0, TESTIMONIALS.length - 1);

  const visible = Array.from({ length: perView }, (_, i) => {
    return TESTIMONIALS[(index + i) % TESTIMONIALS.length];
  });

  return (
    <div className="relative">
      <div className="flex items-stretch gap-4">
        <button
          aria-label="Previous testimonial"
          onClick={() => setIndex((i) => (i === 0 ? maxIndex : i - 1))}
          className="hidden h-10 w-10 shrink-0 self-center items-center justify-center rounded-full border border-line bg-cream text-ink transition hover:bg-rose-deep hover:text-cream sm:flex"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <div className="grid flex-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((item, i) => (
            <figure
              key={`${item.author}-${i}`}
              className={`flex flex-col gap-4 rounded-sm border border-line/80 bg-cream/80 p-6 ${
                i === 2 ? "hidden lg:flex" : i === 1 ? "hidden sm:flex" : "flex"
              }`}
            >
              <span className="font-serif text-4xl leading-none text-rose-light">
                &ldquo;
              </span>
              <blockquote className="flex-1 text-sm leading-relaxed text-ink-soft italic">
                {item.quote}
              </blockquote>
              <figcaption>
                <p className="text-sm font-medium text-ink">— {item.author}</p>
                <p className="text-[0.68rem] tracking-[0.16em] uppercase text-muted">
                  {item.location}
                </p>
                <Stars rating={50} className="mt-2 text-gold" />
              </figcaption>
            </figure>
          ))}
        </div>

        <button
          aria-label="Next testimonial"
          onClick={() => setIndex((i) => (i === maxIndex ? 0 : i + 1))}
          className="hidden h-10 w-10 shrink-0 self-center items-center justify-center rounded-full border border-line bg-cream text-ink transition hover:bg-rose-deep hover:text-cream sm:flex"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-6 flex justify-center gap-2">
        {TESTIMONIALS.map((_, i) => (
          <button
            key={i}
            aria-label={`Go to testimonial ${i + 1}`}
            onClick={() => setIndex(i)}
            className={`h-1.5 rounded-full transition-all ${
              i === index ? "w-8 bg-rose-deep" : "w-3 bg-line"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
