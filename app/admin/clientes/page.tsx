"use client";

import { useEffect, useState } from "react";
import { getBoletos, Boleto } from "@/lib/firestore";

interface Cliente {
  nombre: string;
  apellidos: string;
  celular: string;
  estado: string;
  boletos: Boleto[];
  totalGastado: number;
}

export default function AdminClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [filterEstado, setFilterEstado] = useState("");
  const [filterCelular, setFilterCelular] = useState("");

  useEffect(() => {
    getBoletos().then((boletos) => {
      const map = new Map<string, Cliente>();
      boletos.forEach((b) => {
        const key = b.celular;
        if (!map.has(key)) {
          map.set(key, {
            nombre: b.nombre,
            apellidos: b.apellidos,
            celular: b.celular,
            estado: b.estado,
            boletos: [],
            totalGastado: 0,
          });
        }
        const c = map.get(key)!;
        c.boletos.push(b);
        if (b.status === "pagado") c.totalGastado += b.precio_total;
      });
      setClientes(Array.from(map.values()));
    });
  }, []);

  const filtered = clientes.filter((c) => {
    if (filterEstado && c.estado !== filterEstado) return false;
    if (filterCelular && !c.celular.includes(filterCelular)) return false;
    return true;
  });

  const estados = Array.from(new Set(clientes.map((c) => c.estado))).sort();

  function exportCSV() {
    const header = "Nombre,Apellidos,Celular,Estado,Boletos,Total Pagado";
    const rows = filtered.map((c) =>
      `${c.nombre},${c.apellidos},${c.celular},${c.estado},${c.boletos.length},$${c.totalGastado}`
    );
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "clientes-jans.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-black">Clientes ({filtered.length})</h1>
        <button
          onClick={exportCSV}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl text-sm transition-colors"
        >
          Exportar CSV
        </button>
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <input
          value={filterCelular}
          onChange={(e) => setFilterCelular(e.target.value)}
          placeholder="Filtrar por celular..."
          className="rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm w-48"
        />
        <select
          value={filterEstado}
          onChange={(e) => setFilterEstado(e.target.value)}
          className="rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
        >
          <option value="">Todos los estados</option>
          {estados.map((e) => <option key={e} value={e}>{e}</option>)}
        </select>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow border border-slate-100 dark:border-slate-700 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-700">
            <tr>
              <th className="text-left px-4 py-3 font-semibold text-slate-500">Nombre</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-500">Celular</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-500">Estado</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-500">Boletos</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-500">Total pagado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {filtered.map((c) => (
              <tr key={c.celular} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                <td className="px-4 py-3 font-medium">{c.nombre} {c.apellidos}</td>
                <td className="px-4 py-3">{c.celular}</td>
                <td className="px-4 py-3">{c.estado}</td>
                <td className="px-4 py-3">{c.boletos.length}</td>
                <td className="px-4 py-3 font-semibold text-green-600">
                  ${c.totalGastado.toLocaleString("es-MX")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <p className="text-center py-8 text-slate-400">Sin clientes.</p>}
      </div>
    </div>
  );
}
