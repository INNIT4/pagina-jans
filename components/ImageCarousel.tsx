"use client";

import { useState, useEffect, useCallback } from "react";

interface ImageCarouselProps {
  images: string[];
  alt: string;
}

export default function ImageCarousel({ images, alt }: ImageCarouselProps) {
  const [current, setCurrent] = useState(0);

  const prev = useCallback(() =>
    setCurrent((c) => (c === 0 ? images.length - 1 : c - 1)), [images.length]);

  const next = useCallback(() =>
    setCurrent((c) => (c === images.length - 1 ? 0 : c + 1)), [images.length]);

  // Auto-play
  useEffect(() => {
    if (images.length <= 1) return;
    const t = setInterval(next, 4000);
    return () => clearInterval(t);
  }, [images.length, next]);

  if (images.length === 0) {
    return (
      <div className="w-full h-72 md:h-96 bg-gradient-to-br from-red-600 to-black rounded-2xl flex items-center justify-center flex-shrink-0">
        <span className="text-7xl">🎟️</span>
      </div>
    );
  }

  return (
    <div className="relative w-full rounded-2xl overflow-hidden select-none">
      {/* Main image */}
      <div className="relative w-full h-72 md:h-[420px] bg-black">
        {images.map((src, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={i}
            src={src}
            alt={`${alt} ${i + 1}`}
            className={`absolute inset-0 w-full h-full object-contain transition-opacity duration-500 ${
              i === current ? "opacity-100" : "opacity-0"
            }`}
            onError={(e) => (e.currentTarget.style.display = "none")}
          />
        ))}
        {/* Gradient overlay at bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-black/60 to-transparent" />
      </div>

      {/* Arrows — only if more than 1 image */}
      {images.length > 1 && (
        <>
          <button
            onClick={prev}
            className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-black/50 hover:bg-black/80 text-white rounded-full flex items-center justify-center transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={next}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-black/50 hover:bg-black/80 text-white rounded-full flex items-center justify-center transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {/* Dots */}
          <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-2">
            {images.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`transition-all rounded-full ${
                  i === current ? "w-6 h-2 bg-white" : "w-2 h-2 bg-white/50 hover:bg-white/80"
                }`}
              />
            ))}
          </div>

          {/* Counter */}
          <div className="absolute top-3 right-3 bg-black/50 text-white text-xs font-bold px-2 py-1 rounded-full">
            {current + 1} / {images.length}
          </div>
        </>
      )}

      {/* Thumbnail strip */}
      {images.length > 1 && (
        <div className="flex gap-2 mt-2 overflow-x-auto pb-1">
          {images.map((src, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={i}
              src={src}
              alt={`${alt} ${i + 1}`}
              onClick={() => setCurrent(i)}
              className={`h-14 w-20 object-contain bg-black rounded-lg cursor-pointer flex-shrink-0 transition-all ${
                i === current
                  ? "ring-2 ring-red-500 opacity-100"
                  : "opacity-50 hover:opacity-80"
              }`}
              onError={(e) => (e.currentTarget.style.display = "none")}
            />
          ))}
        </div>
      )}
    </div>
  );
}
