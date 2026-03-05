"use client";

import { useState, useRef } from "react";

interface RandomPickerProps {
  disponibles: number[];   // numbers that can be picked
  onPick: (nums: number[]) => void;
}

export default function RandomPicker({ disponibles, onPick }: RandomPickerProps) {
  const [cantidad, setCantidad] = useState(1);
  const [running, setRunning] = useState(false);
  const [display, setDisplay] = useState<number[]>([]);
  const [done, setDone] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function shuffle(arr: number[]) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function pickRandom(n: number): number[] {
    return shuffle(disponibles).slice(0, n);
  }

  function start() {
    if (disponibles.length === 0) return;
    const n = Math.min(cantidad, disponibles.length);
    setDone(false);
    setRunning(true);

    const finalNumbers = pickRandom(n);

    // Slot machine: fast at start, slows down, then stops
    let tick = 0;
    const totalTicks = 28;

    function getDelay(t: number) {
      // Starts at 60ms, gradually slows to 300ms
      return 60 + Math.pow(t / totalTicks, 2) * 240;
    }

    function step() {
      tick++;
      // Show random preview numbers while spinning
      const preview = pickRandom(n);
      setDisplay(preview);

      if (tick >= totalTicks) {
        // Land on the final result
        setDisplay(finalNumbers);
        setRunning(false);
        setDone(true);
        return;
      }

      intervalRef.current = setTimeout(step, getDelay(tick));
    }

    intervalRef.current = setTimeout(step, 60);
  }

  function confirm() {
    onPick(display);
    setDone(false);
    setDisplay([]);
  }

  function cancel() {
    if (intervalRef.current) clearTimeout(intervalRef.current);
    setRunning(false);
    setDone(false);
    setDisplay([]);
  }

  const max = Math.min(disponibles.length, 20);

  return (
    <div className="bg-gradient-to-br from-slate-900 to-black rounded-2xl p-5 border border-red-900/40">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xl">🎰</span>
        <h3 className="font-bold text-white">Máquina de la suerte</h3>
      </div>

      {/* Controls */}
      {!running && !done && (
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 bg-white/10 rounded-xl px-3 py-2">
            <span className="text-white/70 text-sm">Quiero</span>
            <input
              type="number"
              min={1}
              max={max}
              value={cantidad}
              onChange={(e) => setCantidad(Math.min(max, Math.max(1, Number(e.target.value))))}
              className="w-14 bg-transparent text-white font-black text-lg text-center focus:outline-none"
            />
            <span className="text-white/70 text-sm">boletos</span>
          </div>
          <button
            onClick={start}
            disabled={disponibles.length === 0}
            className="flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white font-bold rounded-xl transition-colors"
          >
            <span>¡Elegir por mí!</span>
          </button>
        </div>
      )}

      {/* Slot machine display */}
      {(running || done) && (
        <div className="mt-2">
          {/* Spinning reels */}
          <div className="flex flex-wrap gap-2 mb-4 min-h-[52px] items-center">
            {display.map((n, i) => (
              <div
                key={i}
                className={`w-14 h-12 rounded-xl flex items-center justify-center font-black text-lg border-2 transition-all duration-75
                  ${running
                    ? "bg-yellow-400 border-yellow-300 text-black scale-105 animate-pulse"
                    : "bg-red-600 border-red-400 text-white scale-100"
                  }`}
              >
                {n}
              </div>
            ))}
            {running && (
              <div className="text-white/60 text-sm animate-pulse ml-1">girando...</div>
            )}
          </div>

          {/* Result actions */}
          {done && (
            <div className="space-y-3">
              <p className="text-white/80 text-sm">
                ¡Tus números son! ¿Los apartamos?
              </p>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={confirm}
                  className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl transition-colors text-sm"
                >
                  Sí, agregar estos números
                </button>
                <button
                  onClick={start}
                  className="px-5 py-2 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl transition-colors text-sm"
                >
                  Volver a girar
                </button>
                <button
                  onClick={cancel}
                  className="px-4 py-2 text-white/50 hover:text-white text-sm transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {disponibles.length === 0 && (
        <p className="text-white/40 text-sm mt-2">No hay números disponibles.</p>
      )}
    </div>
  );
}
