import type { Metadata } from "next";
import BankCards from "@/components/BankCards";
import TarjetasActions from "@/components/TarjetasActions";
import { getBankAccounts } from "@/lib/firestore";

export const metadata: Metadata = {
  title: "Métodos de Pago",
  description:
    "Consulta las cuentas bancarias para pagar tu boleto de rifa. Transferencia bancaria disponible en Sorteos Jans.",
  alternates: { canonical: "https://www.sorteosjans.com.mx/tarjetas" },
};

export default async function TarjetasPage({
  searchParams,
}: {
  searchParams: Promise<{ folio?: string }>;
}) {
  const { folio } = await searchParams;
  const accounts = (await getBankAccounts()).filter((a) => a.activo);

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      {folio && (
        <div className="bg-green-900/30 border border-green-700 rounded-sm p-6 mb-8 text-center">
          <p className="text-3xl mb-2">🎉</p>
          <h2 className="text-2xl font-bold text-green-400 mb-1 uppercase tracking-wider">
            Boletos apartados exitosamente
          </h2>
          <p className="text-green-400 mb-2">
            Tu folio de apartado es:
          </p>
          <p className="text-4xl font-bold tracking-wider text-green-300 bg-brand-dark inline-block px-8 py-3 rounded-sm border-2 border-green-600">
            {folio}
          </p>
          <p className="text-sm text-green-500 mt-3">
            Guarda este folio para consultar el estado de tu boleto en cualquier momento.
          </p>
          <TarjetasActions folio={folio} />
        </div>
      )}

      <h1 className="text-3xl font-bold uppercase tracking-widest mb-2">Realiza tu pago</h1>
      <span className="accent-bar" />
      <p className="text-gray-400 mb-2 mt-4">
        Transfiere el monto exacto a cualquiera de las siguientes cuentas.
      </p>
      {folio && (
        <p className="text-gray-400 mb-8">
          Indica tu folio <strong className="text-brand-red">{folio}</strong> en el concepto de la transferencia.
        </p>
      )}

      <BankCards accounts={accounts} />

      <div className="mt-8 bg-amber-900/20 border border-amber-700 rounded-sm p-5">
        <h3 className="font-bold text-amber-400 mb-2">Instrucciones de pago</h3>
        <ol className="text-sm text-amber-400/80 space-y-1 list-decimal list-inside">
          <li>Elige cualquiera de las cuentas bancarias arriba.</li>
          <li>Realiza la transferencia por el monto exacto de tus boletos.</li>
          <li>En el campo de concepto/referencia escribe tu folio: <strong>{folio ?? "JNS-XXXXXX"}</strong></li>
          <li>Envianos el comprobante por WhatsApp para agilizar la confirmacion.</li>
          <li>Una vez verificado, tu estado cambiara a &ldquo;Pagado&rdquo; en el sistema.</li>
        </ol>
      </div>
    </div>
  );
}
