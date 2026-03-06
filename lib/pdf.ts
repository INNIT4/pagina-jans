"use client";

import { Boleto } from "./firestore";

export async function downloadComprobante(boleto: Boleto, rifaNombre: string): Promise<void> {
  const { jsPDF } = await import("jspdf");

  const doc = new jsPDF({ unit: "mm", format: "a4" });

  // Header — red + black
  doc.setFillColor(185, 28, 28); // red-700
  doc.rect(0, 0, 210, 35, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("Sorteos Jans", 105, 15, { align: "center" });
  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.text("Comprobante de Boleto", 105, 25, { align: "center" });

  // Reset color
  doc.setTextColor(30, 30, 30);

  // Folio badge
  doc.setFillColor(254, 242, 242); // red-50
  doc.roundedRect(15, 42, 180, 18, 3, 3, "F");
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Folio:", 22, 53);
  doc.setFontSize(14);
  doc.setTextColor(185, 28, 28); // red-700
  doc.text(boleto.folio, 42, 53);

  // Status badge
  const isPagado = boleto.status === "pagado";
  doc.setFillColor(isPagado ? 220 : 254, isPagado ? 252 : 243, isPagado ? 231 : 199);
  doc.roundedRect(130, 44, 60, 14, 3, 3, "F");
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(isPagado ? 22 : 146, isPagado ? 101 : 64, isPagado ? 52 : 14);
  doc.text(isPagado ? "PAGADO" : "PENDIENTE", 160, 52.5, { align: "center" });

  // Details
  doc.setTextColor(30, 30, 30);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");

  const rows: [string, string][] = [
    ["Rifa", rifaNombre],
    ["Nombre", `${boleto.nombre} ${boleto.apellidos}`],
    ["Estado", boleto.estado],
    ["Precio Total", `$${boleto.precio_total.toLocaleString("es-MX")} MXN`],
    ["Fecha de apartado", boleto.created_at?.toDate?.()?.toLocaleDateString("es-MX") ?? "—"],
  ];

  const valueMaxWidth = 120; // mm — from x=70 to right margin
  let y = 70;

  rows.forEach(([label, value]) => {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(100, 100, 100);
    doc.text(label + ":", 20, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(30, 30, 30);
    const lines = doc.splitTextToSize(value, valueMaxWidth) as string[];
    doc.text(lines, 70, y);
    y += 10 * lines.length;
  });

  // Números — wrapped
  const numerosText = [...boleto.numeros].sort((a, b) => a - b).join(", ");
  const numerosLines = doc.splitTextToSize(numerosText, valueMaxWidth) as string[];
  doc.setFont("helvetica", "bold");
  doc.setTextColor(100, 100, 100);
  doc.text(`Números (${boleto.numeros.length}):`, 20, y);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(30, 30, 30);
  doc.text(numerosLines, 70, y);
  y += 10 * numerosLines.length;

  // Footer — red-50 bg
  doc.setFillColor(254, 242, 242); // red-50
  doc.rect(0, 260, 210, 37, "F");
  doc.setFontSize(9);
  doc.setTextColor(185, 28, 28); // red-700
  doc.setFont("helvetica", "bold");
  doc.text("¡Gracias por tu confianza!", 105, 272, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setTextColor(120, 120, 120);
  doc.text("Sorteos Jans — Todos los derechos reservados", 105, 280, { align: "center" });

  doc.save(`comprobante-${boleto.folio}.pdf`);
}
