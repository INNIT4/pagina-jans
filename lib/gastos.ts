import { GastoCategoria, GastoRifa, Rifa } from "./firestore";

// ─── Categorías ─────────────────────────────────────────────────────────────

export const GASTO_CATEGORIAS: { value: GastoCategoria; label: string }[] = [
  { value: "marketing", label: "Marketing" },
  { value: "premio", label: "Premio" },
  { value: "comision", label: "Comisión" },
  { value: "otro", label: "Otro" },
];

/** Etiqueta legible para una categoría de gasto. */
export function categoriaLabel(c: GastoCategoria): string {
  return GASTO_CATEGORIAS.find((x) => x.value === c)?.label ?? c;
}

/** Clases Tailwind (texto sobre fondo claro) por categoría — para chips/badges. */
export const CATEGORIA_COLOR: Record<GastoCategoria, string> = {
  marketing: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  premio:    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  comision:  "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300",
  otro:      "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
};

// ─── Cálculos ───────────────────────────────────────────────────────────────

/** Suma de todos los gastos registrados en una rifa. */
export function totalGastos(rifa: Pick<Rifa, "gastos">): number {
  return (rifa.gastos ?? []).reduce((s, g) => s + (g.monto || 0), 0);
}

/** Suma de gastos agrupada por categoría (incluye categorías sin gasto en 0). */
export function gastosPorCategoria(
  rifa: Pick<Rifa, "gastos">
): Record<GastoCategoria, number> {
  const acc: Record<GastoCategoria, number> = {
    marketing: 0,
    premio: 0,
    comision: 0,
    otro: 0,
  };
  (rifa.gastos ?? []).forEach((g) => {
    acc[g.categoria] = (acc[g.categoria] ?? 0) + (g.monto || 0);
  });
  return acc;
}

/** Ganancia neta = ingresos confirmados − gastos totales. */
export function calcularNeto(ingresos: number, gastos: number): number {
  return ingresos - gastos;
}

/**
 * Retorno de inversión sobre el gasto: neto ÷ gasto × 100.
 * Devuelve null cuando no hay gastos (no se puede dividir entre cero).
 */
export function calcularROI(ingresos: number, gastos: number): number | null {
  if (gastos <= 0) return null;
  return ((ingresos - gastos) / gastos) * 100;
}

/** Genera un id corto para un gasto nuevo. */
export function nuevoGastoId(): string {
  return Math.random().toString(36).slice(2, 11);
}

/** Gasto vacío con valores por defecto. */
export function gastoVacio(): GastoRifa {
  return {
    id: nuevoGastoId(),
    concepto: "",
    monto: 0,
    categoria: "marketing",
    fecha: new Date().toISOString().slice(0, 10),
  };
}
