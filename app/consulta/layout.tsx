import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Consultar Boleto",
  description:
    "Consulta el estado de tu boleto de sorteo. Busca por folio, número de teléfono o número de boleto en Sorteos Jans.",
  alternates: { canonical: "https://www.sorteosjans.com.mx/consulta" },
};

export default function ConsultaLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
