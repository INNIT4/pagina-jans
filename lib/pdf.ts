"use client";

import { Boleto } from "./firestore";

// ─── color helpers ────────────────────────────────────────────────────────────
type RGB = [number, number, number];

const RED: RGB        = [185, 28,  28];
const RED_MID: RGB    = [220, 60,  60];
const RED_DARK: RGB   = [150, 15,  15];
const RED_100: RGB    = [254, 226, 226];
const RED_50: RGB     = [255, 241, 242];
const GOLD: RGB       = [251, 191, 36];
const BLUE_BG: RGB    = [239, 246, 255];
const BLUE_TEXT: RGB  = [30,  64,  175];
const GREEN: RGB      = [22,  163, 74];
const GREEN_BG: RGB   = [220, 252, 231];
const AMBER_TEXT: RGB = [146, 64,  14];
const AMBER_BG: RGB   = [254, 243, 199];
const SLATE_50: RGB   = [248, 250, 252];
const DARK: RGB       = [15,  23,  42];
const WHITE: RGB      = [255, 255, 255];


export async function downloadComprobante(boleto: Boleto, rifaNombre: string): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  const f = (...c: RGB) => doc.setFillColor(...c);
  const t = (...c: RGB) => doc.setTextColor(...c);
  const d = (...c: RGB) => doc.setDrawColor(...c);

  // ── Header ─────────────────────────────────────────────────────────────────
  f(...RED);
  doc.rect(0, 0, 210, 44, "F");

  // Decorative circles
  f(...RED_DARK);
  doc.circle(195, 5, 28, "F");
  f(...RED_MID);
  doc.circle(180, 30, 14, "F");
  f(...RED_DARK);
  doc.circle(10, 50, 20, "F");

  // Gold accent dots
  f(...GOLD);
  for (const [x, y] of [[45, 7], [75, 38], [130, 6], [158, 36]] as [number,number][]) {
    doc.circle(x, y, 1.4, "F");
  }

  // Title
  t(...WHITE);
  doc.setFontSize(26);
  doc.setFont("helvetica", "bold");
  doc.text("Sorteos Jans", 105, 20, { align: "center" });

  t(...RED_100);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Comprobante Oficial de Boleto", 105, 31, { align: "center" });

  // Thin gold line under header
  f(...GOLD);
  doc.rect(0, 44, 210, 1.2, "F");

  // ── Folio + Status ──────────────────────────────────────────────────────────
  // Card background
  f(...RED_50);
  doc.roundedRect(14, 50, 182, 20, 4, 4, "F");

  // Red accent bar
  f(...RED);
  doc.roundedRect(14, 50, 32, 20, 4, 4, "F");
  f(...RED); // cover right-side rounded corners of accent bar
  doc.rect(30, 50, 16, 20, "F");

  t(...WHITE);
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.text("FOLIO", 30, 58, { align: "center" });
  doc.setFontSize(8);
  doc.text("No.", 30, 65, { align: "center" });

  t(...RED);
  doc.setFontSize(17);
  doc.setFont("helvetica", "bold");
  doc.text(boleto.folio, 110, 63, { align: "center" });

  // Status badge
  const isPagado = boleto.status === "pagado";
  f(...(isPagado ? GREEN_BG : AMBER_BG));
  doc.roundedRect(138, 53, 54, 14, 3, 3, "F");
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  t(...(isPagado ? GREEN : AMBER_TEXT));
  doc.text(isPagado ? "PAGADO" : "PENDIENTE", 165, 62, { align: "center" });

  // ── Info rows ───────────────────────────────────────────────────────────────
  let y = 77;
  const infoRows: [string, string][] = [
    ["Rifa",            rifaNombre],
    ["Participante",    `${boleto.nombre} ${boleto.apellidos}`],
    ["Estado / Ciudad", boleto.estado],
    ["Total",           `$${boleto.precio_total.toLocaleString("es-MX")} MXN`],
    ["Fecha",           boleto.created_at?.toDate?.()?.toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" }) ?? "—"],
  ];

  for (let i = 0; i < infoRows.length; i++) {
    const [label, value] = infoRows[i];
    const lines = doc.splitTextToSize(value, 118) as string[];
    const rowH = Math.max(12, 7 * lines.length + 5);

    f(...(i % 2 === 0 ? SLATE_50 : WHITE));
    doc.roundedRect(14, y, 182, rowH, 2, 2, "F");

    // Label pill
    f(...RED);
    doc.roundedRect(17, y + (rowH - 8) / 2, 44, 8, 2, 2, "F");
    t(...WHITE);
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.text(label.toUpperCase(), 39, y + (rowH - 8) / 2 + 5.5, { align: "center" });

    // Value
    t(...DARK);
    doc.setFontSize(9.5);
    doc.setFont("helvetica", "normal");
    doc.text(lines, 67, y + (rowH - 7 * lines.length) / 2 + 6.5);

    y += rowH + 2;
  }

  y += 3;

  // Decorative divider
  d(...RED_100);
  doc.setLineWidth(0.4);
  doc.line(14, y, 196, y);
  f(...GOLD);
  doc.circle(105, y, 2.2, "F");
  t(...GOLD);
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.text("*", 105, y + 0.8, { align: "center" });

  y += 7;

  // ── Numbers section ─────────────────────────────────────────────────────────
  const CONTENT_BOTTOM = 255;
  const sorted = [...(boleto.numeros_completos ?? boleto.numeros)].sort((a, b) => a - b);

  const CHIP_W    = 11;
  const CHIP_H    = 7;
  const GAP_X     = 1.5;
  const GAP_Y     = 2;
  const START_X   = 14;
  const NUM_COLS  = Math.floor(182 / (CHIP_W + GAP_X)); // ~14 cols

  // Section header banner
  function drawNumHeader(yy: number) {
    f(...RED);
    doc.roundedRect(14, yy, 182, 12, 3, 3, "F");
    f(...GOLD);
    doc.circle(22, yy + 6, 2, "F");
    doc.circle(190, yy + 6, 2, "F");
    t(...WHITE);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(`Tus Numeros (${sorted.length})`, 105, yy + 8, { align: "center" });
    return yy + 16;
  }

  if (y + 12 > CONTENT_BOTTOM) { doc.addPage(); y = 20; }
  y = drawNumHeader(y);

  // Chips grid
  let col = 0;
  for (const num of sorted) {
    if (col === 0 && y + CHIP_H > CONTENT_BOTTOM) {
      doc.addPage();
      y = 20;
    }

    const x = START_X + col * (CHIP_W + GAP_X);

    f(...BLUE_BG);
    d(...BLUE_BG);
    doc.setLineWidth(0.3);
    doc.roundedRect(x, y, CHIP_W, CHIP_H, 2, 2, "FD");
    t(...BLUE_TEXT);
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "bold");
    doc.text(String(num), x + CHIP_W / 2, y + 4.8, { align: "center" });

    col++;
    if (col >= NUM_COLS) {
      col = 0;
      y += CHIP_H + GAP_Y;
    }
  }
  if (col > 0) y += CHIP_H + GAP_Y;

  // ── Footer ──────────────────────────────────────────────────────────────────
  if (y + 30 > 297) { doc.addPage(); y = 10; }

  // Decorative top edge of footer
  f(...GOLD);
  doc.rect(0, 262, 210, 1.5, "F");

  f(...RED);
  doc.rect(0, 263.5, 210, 33.5, "F");

  // Gold dots
  f(...GOLD);
  for (const [fx, fy] of [[18, 270], [35, 282], [60, 269], [150, 272], [175, 280], [192, 269], [105, 291]] as [number,number][]) {
    doc.circle(fx, fy, 1, "F");
  }

  // Small decorative circles
  f(...RED_DARK);
  doc.circle(15, 297, 16, "F");
  doc.circle(195, 263, 14, "F");

  t(...WHITE);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Gracias por tu confianza!", 105, 275, { align: "center" });

  t(...RED_100);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("Sorteos Jans  —  Todos los derechos reservados", 105, 284, { align: "center" });

  doc.save(`comprobante-${boleto.folio}.pdf`);
}
