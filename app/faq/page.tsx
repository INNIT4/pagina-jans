"use client";

import { useState } from "react";

const FAQ_ITEMS = [
  {
    q: "¿Cómo aparto mis boletos?",
    a: "Selecciona los números que deseas en la cuadrícula, haz clic en 'Apartar', llena el formulario con tus datos y confirma. Te llegará un folio de confirmación.",
  },
  {
    q: "¿Cómo realizo el pago?",
    a: "Después de apartar, serás redirigido a la página de tarjetas con los datos bancarios. Realiza la transferencia por el monto exacto e indica tu folio en el concepto.",
  },
  {
    q: "¿Cuánto tiempo tengo para pagar?",
    a: "Tienes 24 horas para realizar el pago después de apartar. Pasado ese tiempo, los números pueden liberarse.",
  },
  {
    q: "¿Cómo sé si mi pago fue confirmado?",
    a: "Puedes consultar el estado de tu boleto en la sección 'Consultar Boleto' usando tu folio o número de celular. También te notificaremos por WhatsApp.",
  },
  {
    q: "¿Puedo apartar varios números?",
    a: "Sí, puedes seleccionar todos los números que quieras en la cuadrícula antes de apartar.",
  },
  {
    q: "¿Cómo funciona el sorteo?",
    a: "El sorteo se realiza en la fecha indicada en cada rifa. El ganador se notifica públicamente y por WhatsApp.",
  },
  {
    q: "¿Tienen códigos de descuento?",
    a: "Sí, en ocasiones especiales emitimos códigos de descuento. Introdúcelos en el formulario de apartado para ver si aplican.",
  },
  {
    q: "¿Cómo contactarlos?",
    a: "Puedes contactarnos por WhatsApp usando el botón verde en la esquina inferior derecha, o enviar un mensaje directamente.",
  },
];

export default function FAQPage() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-4xl font-black mb-2">Preguntas Frecuentes</h1>
      <p className="text-slate-500 dark:text-slate-400 mb-8">Respuestas a las dudas más comunes.</p>

      <div className="space-y-3">
        {FAQ_ITEMS.map((item, i) => (
          <div
            key={i}
            className="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 overflow-hidden"
          >
            <button
              className="w-full text-left px-6 py-4 flex items-center justify-between font-semibold text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              onClick={() => setOpen(open === i ? null : i)}
            >
              {item.q}
              <span className={`text-red-500 transition-transform ${open === i ? "rotate-180" : ""}`}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </span>
            </button>
            {open === i && (
              <div className="px-6 pb-4 text-slate-600 dark:text-slate-300 text-sm leading-relaxed">
                {item.a}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
