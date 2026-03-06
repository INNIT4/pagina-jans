"use client";

import { useState } from "react";
import type { FaqItem } from "@/lib/firestore";

export default function FaqAccordion({ items }: { items: FaqItem[] }) {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <div
          key={i}
          className="bg-brand-dark border border-gray-800 rounded-sm overflow-hidden"
        >
          <button
            className="w-full text-left px-6 py-4 flex items-center justify-between font-semibold text-white hover:bg-gray-800/50 transition-colors"
            onClick={() => setOpen(open === i ? null : i)}
          >
            {item.q}
            <span className={`text-brand-red transition-transform ${open === i ? "rotate-180" : ""}`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </span>
          </button>
          {open === i && (
            <div className="px-6 pb-4 text-gray-400 text-sm leading-relaxed">
              {item.a}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
