export default function SobreNosotrosPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-4xl font-black mb-2">Sobre Nosotros</h1>
      <p className="text-slate-500 dark:text-slate-400 mb-10">Conoce más sobre Sorteos Jans.</p>

      <div className="bg-gradient-to-br from-red-600 to-black rounded-3xl p-8 text-white mb-10">
        <h2 className="text-3xl font-black mb-4">Nuestra misión</h2>
        <p className="text-red-100 text-lg leading-relaxed">
          En Sorteos Jans creemos en la transparencia y la confianza. Nuestro objetivo es brindarte una
          experiencia de compra de boletos segura, sencilla y emocionante desde la comodidad de tu hogar.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6 mb-10">
        {[
          { icon: "🔒", title: "Seguridad", desc: "Tus datos están protegidos y nunca compartimos tu información con terceros." },
          { icon: "✅", title: "Transparencia", desc: "Los sorteos se realizan de forma pública y verificable. Todo queda registrado." },
          { icon: "💬", title: "Soporte", desc: "Estamos disponibles por WhatsApp para resolver cualquier duda antes, durante y después del sorteo." },
        ].map((item) => (
          <div
            key={item.title}
            className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow border border-slate-100 dark:border-slate-700 text-center"
          >
            <span className="text-4xl block mb-3">{item.icon}</span>
            <h3 className="font-bold text-lg mb-2">{item.title}</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm">{item.desc}</p>
          </div>
        ))}
      </div>

      <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-8">
        <h2 className="text-2xl font-bold mb-4">¿Por qué elegirnos?</h2>
        <ul className="space-y-3 text-slate-600 dark:text-slate-300">
          {[
            "Sistema completamente en línea — disponible 24/7",
            "Múltiples opciones de pago bancario",
            "Confirmación inmediata por WhatsApp",
            "Historial completo de rifas anteriores",
            "Códigos de descuento exclusivos para nuestros clientes frecuentes",
          ].map((item) => (
            <li key={item} className="flex items-start gap-3">
              <span className="text-red-500 font-bold mt-0.5">✓</span>
              {item}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
