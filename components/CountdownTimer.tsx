"use client";

import { useEffect, useState } from "react";

export default function CountdownTimer({ targetDate }: { targetDate: string }) {
  const [timeLeft, setTimeLeft] = useState<{ d: number; h: number; m: number; s: number } | null>(null);

  useEffect(() => {
    // Return early if no target date is provided
    if (!targetDate) return;

    const target = new Date(targetDate).getTime();

    const updateTime = () => {
      const now = new Date().getTime();
      const difference = target - now;

      if (difference <= 0) {
        setTimeLeft({ d: 0, h: 0, m: 0, s: 0 });
        return;
      }

      setTimeLeft({
        d: Math.floor(difference / (1000 * 60 * 60 * 24)),
        h: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        m: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
        s: Math.floor((difference % (1000 * 60)) / 1000),
      });
    };

    updateTime(); // initial call
    const timer = setInterval(updateTime, 1000);

    return () => clearInterval(timer);
  }, [targetDate]);

  // Si aún no carga, mostramos guiones para evitar hidratación dispareja
  if (!timeLeft) {
    return (
      <div className="flex gap-2 text-center">
        <TimeUnit value="--" label="DÍAS" />
        <TimeUnit value="--" label="HRS" />
        <TimeUnit value="--" label="MIN" />
        <TimeUnit value="--" label="SEG" />
      </div>
    );
  }

  return (
    <div className="flex gap-2 text-center">
      <TimeUnit value={timeLeft.d.toString().padStart(2, "0")} label="DÍAS" />
      <TimeUnit value={timeLeft.h.toString().padStart(2, "0")} label="HRS" />
      <TimeUnit value={timeLeft.m.toString().padStart(2, "0")} label="MIN" />
      <TimeUnit value={timeLeft.s.toString().padStart(2, "0")} label="SEG" />
    </div>
  );
}

function TimeUnit({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="flex flex-col items-center bg-black/40 backdrop-blur-sm rounded-lg p-2 min-w-[50px] border border-brand-red/20 shadow-[0_0_10px_rgba(255,0,0,0.1)]">
      <span className="text-xl md:text-2xl font-black text-white font-racing leading-none text-shadow-glow">
        {value}
      </span>
      <span className="text-[10px] md:text-xs font-bold text-red-500 mt-1 uppercase tracking-widest">
        {label}
      </span>
    </div>
  );
}
