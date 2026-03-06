"use client";

import { useEffect, useState } from "react";
import {
  getSiteTexts,
  setSiteTexts,
  DEFAULT_SITE_TEXTS,
  SiteTexts,
  FaqItem,
  HowItWorksStep,
  ValueCard,
} from "@/lib/firestore";

type Tab = "inicio" | "pasos" | "nosotros" | "faq";

export default function AdminContenidoPage() {
  const [texts, setTexts] = useState<SiteTexts>(DEFAULT_SITE_TEXTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [tab, setTab] = useState<Tab>("inicio");

  useEffect(() => {
    getSiteTexts().then((t) => { setTexts(t); setLoading(false); });
  }, []);

  async function save() {
    setSaving(true);
    await setSiteTexts(texts);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  function set<K extends keyof SiteTexts>(key: K, value: SiteTexts[K]) {
    setTexts((prev) => ({ ...prev, [key]: value }));
  }

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="animate-spin w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full" />
    </div>
  );

  const tabs: { id: Tab; label: string }[] = [
    { id: "inicio", label: "Inicio" },
    { id: "pasos", label: "Cómo participar" },
    { id: "nosotros", label: "Sobre nosotros" },
    { id: "faq", label: "FAQ" },
  ];

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-black">Contenido del sitio</h1>
        <button
          onClick={save}
          disabled={saving}
          className="px-5 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold rounded-xl text-sm transition-colors"
        >
          {saving ? "Guardando..." : saved ? "Guardado!" : "Guardar cambios"}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-1 mb-6">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
              tab === t.id
                ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow"
                : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Inicio ── */}
      {tab === "inicio" && (
        <div className="space-y-4">
          <Field label="Título del hero">
            <input
              value={texts.hero_title}
              onChange={(e) => set("hero_title", e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Subtítulo del hero">
            <textarea
              value={texts.hero_subtitle}
              onChange={(e) => set("hero_subtitle", e.target.value)}
              rows={3}
              className={inputCls}
            />
          </Field>
          <Field label="Texto de métodos de pago (hero)">
            <input
              value={texts.hero_banks_text}
              onChange={(e) => set("hero_banks_text", e.target.value)}
              className={inputCls}
              placeholder="Azteca · Nu · BBVA"
            />
          </Field>
        </div>
      )}

      {/* ── Cómo participar ── */}
      {tab === "pasos" && (
        <div className="space-y-4">
          <Field label="Título de la sección">
            <input
              value={texts.how_it_works_title}
              onChange={(e) => set("how_it_works_title", e.target.value)}
              className={inputCls}
            />
          </Field>
          {texts.how_it_works_steps.map((step, i) => (
            <div key={i} className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 space-y-2">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Paso {i + 1}</p>
              <Field label="Título">
                <input
                  value={step.title}
                  onChange={(e) => {
                    const updated: HowItWorksStep[] = texts.how_it_works_steps.map((s, j) =>
                      j === i ? { ...s, title: e.target.value } : s
                    );
                    set("how_it_works_steps", updated);
                  }}
                  className={inputCls}
                />
              </Field>
              <Field label="Descripción">
                <textarea
                  value={step.desc}
                  onChange={(e) => {
                    const updated: HowItWorksStep[] = texts.how_it_works_steps.map((s, j) =>
                      j === i ? { ...s, desc: e.target.value } : s
                    );
                    set("how_it_works_steps", updated);
                  }}
                  rows={2}
                  className={inputCls}
                />
              </Field>
            </div>
          ))}
        </div>
      )}

      {/* ── Sobre nosotros ── */}
      {tab === "nosotros" && (
        <div className="space-y-4">
          <Field label="Título de misión">
            <input
              value={texts.about_mission_title}
              onChange={(e) => set("about_mission_title", e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Texto de misión">
            <textarea
              value={texts.about_mission_text}
              onChange={(e) => set("about_mission_text", e.target.value)}
              rows={4}
              className={inputCls}
            />
          </Field>

          <p className="text-sm font-bold mt-2">Tarjetas de valores</p>
          {texts.about_values.map((card, i) => (
            <div key={i} className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 space-y-2">
              <div className="grid grid-cols-3 gap-2">
                <Field label="Icono (emoji)">
                  <input
                    value={card.icon}
                    onChange={(e) => {
                      const updated: ValueCard[] = texts.about_values.map((c, j) =>
                        j === i ? { ...c, icon: e.target.value } : c
                      );
                      set("about_values", updated);
                    }}
                    className={inputCls}
                    maxLength={4}
                  />
                </Field>
                <div className="col-span-2">
                  <Field label="Título">
                    <input
                      value={card.title}
                      onChange={(e) => {
                        const updated: ValueCard[] = texts.about_values.map((c, j) =>
                          j === i ? { ...c, title: e.target.value } : c
                        );
                        set("about_values", updated);
                      }}
                      className={inputCls}
                    />
                  </Field>
                </div>
              </div>
              <Field label="Descripción">
                <textarea
                  value={card.desc}
                  onChange={(e) => {
                    const updated: ValueCard[] = texts.about_values.map((c, j) =>
                      j === i ? { ...c, desc: e.target.value } : c
                    );
                    set("about_values", updated);
                  }}
                  rows={2}
                  className={inputCls}
                />
              </Field>
            </div>
          ))}

          <Field label="Título ¿Por qué elegirnos?">
            <input
              value={texts.about_why_title}
              onChange={(e) => set("about_why_title", e.target.value)}
              className={inputCls}
            />
          </Field>
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-500">Puntos de la lista</p>
            {texts.about_why_items.map((item, i) => (
              <div key={i} className="flex gap-2">
                <input
                  value={item}
                  onChange={(e) => {
                    const updated = texts.about_why_items.map((v, j) => (j === i ? e.target.value : v));
                    set("about_why_items", updated);
                  }}
                  className={`${inputCls} flex-1`}
                />
                <button
                  onClick={() => set("about_why_items", texts.about_why_items.filter((_, j) => j !== i))}
                  className="px-3 py-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-sm"
                >
                  ✕
                </button>
              </div>
            ))}
            <button
              onClick={() => set("about_why_items", [...texts.about_why_items, ""])}
              className="text-sm text-red-600 hover:text-red-700 font-semibold"
            >
              + Agregar punto
            </button>
          </div>
        </div>
      )}

      {/* ── FAQ ── */}
      {tab === "faq" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Título de la página">
              <input
                value={texts.faq_title}
                onChange={(e) => set("faq_title", e.target.value)}
                className={inputCls}
              />
            </Field>
            <Field label="Subtítulo">
              <input
                value={texts.faq_subtitle}
                onChange={(e) => set("faq_subtitle", e.target.value)}
                className={inputCls}
              />
            </Field>
          </div>

          <p className="text-sm font-bold">Preguntas y respuestas</p>
          {texts.faq_items.map((item, i) => (
            <div key={i} className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pregunta {i + 1}</p>
                <button
                  onClick={() => set("faq_items", texts.faq_items.filter((_, j) => j !== i))}
                  className="text-xs text-red-500 hover:text-red-700 font-semibold"
                >
                  Eliminar
                </button>
              </div>
              <Field label="Pregunta">
                <input
                  value={item.q}
                  onChange={(e) => {
                    const updated: FaqItem[] = texts.faq_items.map((f, j) =>
                      j === i ? { ...f, q: e.target.value } : f
                    );
                    set("faq_items", updated);
                  }}
                  className={inputCls}
                />
              </Field>
              <Field label="Respuesta">
                <textarea
                  value={item.a}
                  onChange={(e) => {
                    const updated: FaqItem[] = texts.faq_items.map((f, j) =>
                      j === i ? { ...f, a: e.target.value } : f
                    );
                    set("faq_items", updated);
                  }}
                  rows={3}
                  className={inputCls}
                />
              </Field>
            </div>
          ))}
          <button
            onClick={() => set("faq_items", [...texts.faq_items, { q: "", a: "" }])}
            className="text-sm text-red-600 hover:text-red-700 font-semibold"
          >
            + Agregar pregunta
          </button>
        </div>
      )}

      {/* Bottom save button */}
      <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700">
        <button
          onClick={save}
          disabled={saving}
          className="w-full py-3 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold rounded-xl text-sm transition-colors"
        >
          {saving ? "Guardando..." : saved ? "Guardado!" : "Guardar cambios"}
        </button>
      </div>
    </div>
  );
}

const inputCls =
  "w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold mb-1 text-slate-600 dark:text-slate-400">{label}</label>
      {children}
    </div>
  );
}
