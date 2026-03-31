import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Consultar Boleto",
  description:
    "Consulta el estado de tu boleto de sorteo. Busca por folio, número de teléfono o número de boleto en Sorteos Jans.",
  alternates: { canonical: "https://www.sorteosjans.com.mx/consulta" },
  openGraph: {
    title: "Consultar Boleto | Sorteos Jans",
    description: "Consulta el estado de tu boleto de sorteo. Busca por folio, número de teléfono o número de boleto en Sorteos Jans.",
    url: "https://www.sorteosjans.com.mx/consulta",
    type: "website",
  },
};

export default function ConsultaLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
