import BankCards from "@/components/BankCards";

export default function TarjetasPage({
  searchParams,
}: {
  searchParams: { folio?: string };
}) {
  const folio = searchParams.folio;

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      {folio && (
        <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-2xl p-6 mb-8 text-center">
          <p className="text-3xl mb-2">🎉</p>
          <h2 className="text-2xl font-black text-green-700 dark:text-green-300 mb-1">
            Boletos apartados exitosamente
          </h2>
          <p className="text-green-600 dark:text-green-400 mb-2">
            Tu folio de apartado es:
          </p>
          <p className="text-4xl font-black tracking-wider text-green-800 dark:text-green-200 bg-white dark:bg-slate-800 inline-block px-8 py-3 rounded-xl border-2 border-green-300 dark:border-green-600">
            {folio}
          </p>
          <p className="text-sm text-green-600 dark:text-green-400 mt-3">
            Guarda este folio para consultar el estado de tu boleto en cualquier momento.
          </p>
        </div>
      )}

      <h1 className="text-3xl font-black mb-2">Realiza tu pago</h1>
      <p className="text-slate-500 dark:text-slate-400 mb-2">
        Transfiere el monto exacto a cualquiera de las siguientes cuentas.
      </p>
      {folio && (
        <p className="text-slate-500 dark:text-slate-400 mb-8">
          Indica tu folio <strong className="text-red-600">{folio}</strong> en el concepto de la transferencia.
        </p>
      )}

      <BankCards />

      <div className="mt-8 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 rounded-2xl p-5">
        <h3 className="font-bold text-amber-800 dark:text-amber-300 mb-2">Instrucciones de pago</h3>
        <ol className="text-sm text-amber-700 dark:text-amber-400 space-y-1 list-decimal list-inside">
          <li>Elige cualquiera de las cuentas bancarias arriba.</li>
          <li>Realiza la transferencia por el monto exacto de tus boletos.</li>
          <li>En el campo de concepto/referencia escribe tu folio: <strong>{folio ?? "JNS-XXXXXX"}</strong></li>
          <li>Envíanos el comprobante por WhatsApp para agilizar la confirmación.</li>
          <li>Una vez verificado, tu estado cambiará a &ldquo;Pagado&rdquo; en el sistema.</li>
        </ol>
      </div>
    </div>
  );
}
