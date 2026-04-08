"use client";

import { useEffect, useState, useRef } from "react";
import { onSnapshot, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Rifa, calcularSubtotal, DEFAULT_SETTINGS, getNumerosOcupados } from "@/lib/firestore";
import NumberGrid from "@/components/NumberGrid";
import NumberSearch from "@/components/NumberSearch";
import ApartadoForm from "@/components/ApartadoForm";
import RandomPicker from "@/components/RandomPicker";
import ImageCarousel from "@/components/ImageCarousel";

interface RifaInteractiveProps {
  rifa: Rifa;
  vendidos: number[];
  apartados: number[];
  mostrarApartados: boolean;
}

export default function RifaInteractive({ rifa, vendidos: initialVendidos, apartados: initialApartados, mostrarApartados: initialMostrarApartados }: RifaInteractiveProps) {
  const [seleccionados, setSeleccionados] = useState<number[]>([]);
  const [mostrarApartados, setMostrarApartados] = useState(initialMostrarApartados);
  const [vendidos, setVendidos] = useState<number[]>(initialVendidos);
  const [apartados, setApartados] = useState<number[]>(initialApartados);
  const prevCounters = useRef({ vendidos: -1, apartados: -1 });

  // Sincroniza en tiempo real con el setting de Firestore
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "settings", "config"), (snap) => {
      const val = snap.exists()
        ? (snap.data().mostrar_apartados ?? DEFAULT_SETTINGS.mostrar_apartados)
        : DEFAULT_SETTINGS.mostrar_apartados;
      setMostrarApartados(val);
    });
    return () => unsub();
  }, []);

  // Sincroniza vendidos/apartados en tiempo real: cuando cambien los contadores en el doc de la rifa, re-fetch los números
  useEffect(() => {
    const rifaId = rifa.id!;
    const unsub = onSnapshot(doc(db, "rifas", rifaId), (snap) => {
      if (!snap.exists()) return;
      const data = snap.data();
      const newVendidos = data.num_vendidos ?? 0;
      const newApartados = data.num_apartados ?? 0;
      const prev = prevCounters.current;
      if (prev.vendidos === newVendidos && prev.apartados === newApartados) return;
      prevCounters.current = { vendidos: newVendidos, apartados: newApartados };
      getNumerosOcupados(rifaId).then(({ vendidos: v, apartados: a }) => {
        setVendidos(v);
        setApartados(a);
      });
    });
    return () => unsub();
  }, [rifa.id]);
  const [visibles, setVisibles] = useState<number[] | null>(null);
  const [showForm, setShowForm] = useState(false);

  function toggleNumber(n: number) {
    setSeleccionados((prev) =>
      prev.includes(n) ? prev.filter((x) => x !== n) : [...prev, n]
    );
  }

  const vendidosSet = new Set(vendidos);
  const apartadosSet = new Set(apartados);
  const selSet = new Set(seleccionados);
  const numerosDisponibles: number[] = [];
  for (let i = rifa.num_inicio; i <= rifa.num_fin; i++) {
    if (!vendidosSet.has(i) && !apartadosSet.has(i) && !selSet.has(i)) numerosDisponibles.push(i);
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <ImageCarousel
          images={
            rifa.imagenes_url?.length
              ? rifa.imagenes_url
              : rifa.imagen_url
              ? [rifa.imagen_url]
              : []
          }
          alt={rifa.nombre}
        />

        <div className="mt-6">
          <h1 className="text-3xl font-bold uppercase tracking-widest mb-2">{rifa.nombre}</h1>
          <span className="accent-bar" />
          <p className="text-gray-400 mb-4 mt-4">{rifa.descripcion}</p>

          {rifa.texto_inferior && (
            <div className="bg-brand-dark border border-gray-800 rounded-sm p-5 mb-4 whitespace-pre-wrap text-sm text-gray-300 leading-relaxed shadow-inner">
              {rifa.texto_inferior}
            </div>
          )}

          {rifa.premios && rifa.premios.length > 0 && (
            <div className="mb-8 mt-2 space-y-4">
              <h2 className="text-xl font-bold uppercase tracking-wider flex items-center gap-2">
                <span className="w-8 h-1 bg-brand-red rounded-full" />
                Premios y Beneficios
              </h2>
              <div className="flex flex-col gap-3">
                {rifa.premios.map((p) => {
                  const isPlace = /^[0-9]/.test(p.nombre); // Detection for 2DO, 3ER, etc.
                  const isBonus = p.condicion || p.nombre.toLowerCase().includes('bono');
                  
                  return (
                    <div 
                      key={p.id} 
                      className={`p-4 rounded-sm border transition-shadow ${
                        p.es_principal 
                          ? 'bg-gradient-to-br from-yellow-900/40 to-brand-dark border-yellow-700/50 shadow-[0_0_15px_rgba(234,179,8,0.1)]' 
                          : isBonus 
                          ? 'bg-brand-red/5 border-brand-red/20'
                          : 'bg-brand-dark border-gray-800'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-sm flex items-center justify-center flex-shrink-0 text-2xl ${
                          p.es_principal 
                            ? 'bg-yellow-500 text-yellow-950' 
                            : isBonus 
                            ? 'bg-brand-red text-white' 
                            : 'bg-gray-800 text-gray-400'
                        }`}>
                          {p.es_principal ? '🏆' : isPlace ? '🥈' : isBonus ? '⚡' : '🎁'}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <h3 className={`font-bold text-lg leading-tight uppercase ${p.es_principal ? 'text-yellow-400' : 'text-white'}`}>
                              {p.nombre}
                            </h3>
                            {p.es_principal && (
                              <span className="text-[10px] bg-yellow-500 text-yellow-950 font-black px-1.5 py-0.5 rounded-sm uppercase tracking-tighter">
                                Principal
                              </span>
                            )}
                          </div>
                          {p.descripcion && (
                            <p className="text-sm text-gray-400 leading-relaxed mb-2">{p.descripcion}</p>
                          )}
                          {p.condicion && (
                            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-brand-red/20 border border-brand-red/30 rounded-sm mt-1 animate-pulse">
                              <span className="text-brand-red text-[11px] font-black uppercase tracking-widest flex items-center gap-1">
                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10zm0-2a8 8 0 100-16 8 8 0 000 16zm-1-5h2v2h-2v-2zm0-8h2v6h-2V7z"/></svg>
                                Condición
                              </span>
                              <span className="text-white text-xs font-bold uppercase">{p.condicion}</span>
                            </div>
                          )}
                        </div>

                        {/* Prize Image on the Right */}
                        {p.imagen_url && (
                          <div className="flex-shrink-0 w-24 h-24 sm:w-32 sm:h-20 ml-2 rounded-sm overflow-hidden border border-gray-700/50 shadow-lg">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={p.imagen_url} alt={p.nombre} className="w-full h-full object-cover" />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-4">
            <div className="bg-brand-red/20 border border-brand-red/30 rounded-sm px-4 py-2">
              <p className="text-xs text-brand-red">Precio boleto</p>
              <p className="font-bold text-xl text-brand-red">
                ${rifa.precio_boleto.toLocaleString("es-MX")} MXN
              </p>
            </div>
            <div className="bg-brand-dark border border-gray-800 rounded-sm px-4 py-2">
              <p className="text-xs text-gray-500">Fecha sorteo</p>
              <p className="font-bold text-white">{new Date(rifa.fecha_sorteo).toLocaleDateString("es-MX")}</p>
            </div>
          </div>

          {rifa.ofertas && rifa.ofertas.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-3">
              <div className="w-full">
                 <h2 className="text-sm font-bold uppercase tracking-wider text-green-500 flex items-center gap-2 mb-2">
                   <span className="text-lg">💰</span> Ofertas Especiales
                 </h2>
              </div>
              {rifa.ofertas.sort((a,b)=>a.cantidad-b.cantidad).map((of, idx) => (
                <div key={idx} className="bg-green-900/20 border border-green-500/30 rounded-sm px-4 py-2 flex items-center gap-2 shadow-sm">
                  <span className="font-black text-green-400 text-lg">{of.cantidad}</span>
                  <span className="text-xs text-green-500/80 uppercase mt-1 tracking-widest leading-none">boletos por</span>
                  <span className="font-bold text-white text-lg">${of.precio.toLocaleString("es-MX")}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Random picker */}
      <div className="mb-6">
        <RandomPicker
          disponibles={numerosDisponibles}
          onPick={(nums) => setSeleccionados((prev) => Array.from(new Set([...prev, ...nums])))}
        />
      </div>

      {/* Search */}
      <div className="mb-6">
        <h2 className="text-lg font-bold uppercase tracking-wider mb-3">Buscar numeros</h2>
        <NumberSearch
          numInicio={rifa.num_inicio}
          numFin={rifa.num_fin}
          onResult={setVisibles}
        />
      </div>

      {/* Grid */}
      <div className="mb-8">
        <h2 className="text-lg font-bold uppercase tracking-wider mb-3">
          Selecciona tus numeros
          {visibles !== null && (
            <span className="ml-2 text-sm font-normal text-gray-500">
              ({visibles.length} resultados)
            </span>
          )}
        </h2>
        <NumberGrid
          numInicio={rifa.num_inicio}
          numFin={rifa.num_fin}
          vendidos={vendidos}
          apartados={apartados}
          seleccionados={seleccionados}
          visibles={visibles}
          mostrarApartados={mostrarApartados}
          onToggle={toggleNumber}
        />
      </div>

      {/* Floating cart */}
      {seleccionados.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-brand-dark border-t border-gray-800 p-4 shadow-2xl">
          <div className="max-w-2xl mx-auto flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-white">{seleccionados.length} boleto(s) seleccionado(s)</p>
              <p className="text-xs text-gray-500">
                Total: ${calcularSubtotal(seleccionados.length, rifa.precio_boleto, rifa.ofertas).toLocaleString("es-MX")} MXN
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setSeleccionados([])}
                className="px-4 py-2 text-sm border border-gray-700 rounded-sm hover:bg-gray-800 text-gray-400 transition-colors"
              >
                Limpiar
              </button>
              <button
                onClick={() => setShowForm(true)}
                className="px-6 py-2 bg-brand-red hover:bg-red-700 text-white font-bold rounded-sm transition-colors"
              >
                Apartar
              </button>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <ApartadoForm
          rifa={rifa}
          numeros={seleccionados}
          onClose={() => setShowForm(false)}
        />
      )}
    </div>
  );
}
