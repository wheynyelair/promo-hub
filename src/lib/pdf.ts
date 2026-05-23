import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { Lamina } from "./laminas";
import type { TextOffer } from "./text-offers";
import type { PriceBaseRow } from "./price-base";

const fmt = (d: string) => new Date(d).toLocaleDateString("pt-BR");
const money = (n: number | null | undefined) =>
  n == null ? "-" : `R$ ${Number(n).toFixed(2).replace(".", ",")}`;

export function generateWeeklyPdf(laminas: Lamina[], branchLabel: string) {
  const doc = new jsPDF();
  const now = new Date();
  doc.setFontSize(18);
  doc.text(`Ações Ativas - ${branchLabel}`, 14, 18);
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Gerado em ${now.toLocaleDateString("pt-BR")} ${now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`, 14, 25);

  autoTable(doc, {
    startY: 32,
    head: [["Título", "Categoria", "Marca", "Início", "Expira"]],
    body: laminas.map((l) => [
      l.title,
      l.category,
      l.industry ?? "-",
      fmt(l.starts_at),
      fmt(l.expires_at),
    ]),
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [15, 27, 61] },
  });

  doc.save(`acoes-${branchLabel.toLowerCase().replace(/\s+/g, "-")}-${now.toISOString().slice(0, 10)}.pdf`);
}

export interface CatalogGroup {
  key: string;
  offers: TextOffer[];
  baseRow: PriceBaseRow | null | undefined;
}


export interface CatalogOptions {
  branchLabel: string;
  logoUrl?: string | null;
  filters?: { marca?: string | null; onlyActive?: boolean; search?: string | null };
}

/**
 * Catálogo Inteligente — 1 bloco por produto agrupado por EAN/CODPROD.
 * Destaca melhor preço (preco_final mínimo) e calcula desconto vs PTABELA.
 */
export async function generateCatalogPdf(groups: CatalogGroup[], opts: CatalogOptions) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const now = new Date();

  // Header
  let headerY = 14;
  if (opts.logoUrl) {
    try {
      const dataUrl = await toDataUrl(opts.logoUrl);
      doc.addImage(dataUrl, "PNG", 14, 10, 16, 16);
      headerY = 16;
    } catch { /* ignore logo failure */ }
  }
  doc.setFontSize(16);
  doc.setTextColor(15, 27, 61);
  doc.text(`Catálogo de Ofertas — ${opts.branchLabel}`, opts.logoUrl ? 34 : 14, headerY);
  doc.setFontSize(9);
  doc.setTextColor(110);
  doc.text(
    `Gerado em ${now.toLocaleDateString("pt-BR")} ${now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`,
    opts.logoUrl ? 34 : 14,
    headerY + 6,
  );

  const chips: string[] = [];
  if (opts.filters?.marca) chips.push(`Marca: ${opts.filters.marca}`);
  if (opts.filters?.onlyActive) chips.push("Apenas ativas");
  if (opts.filters?.search) chips.push(`Busca: "${opts.filters.search}"`);
  if (chips.length) {
    doc.setFontSize(8);
    doc.setTextColor(80);
    doc.text(chips.join("  ·  "), 14, headerY + 12);
  }

  // Body
  const rows: any[] = [];
  for (const g of groups) {
    const first = g.offers[0];
    if (!first) continue;
    const allLines: { tag: string; ptabela: number | null; preco: number | null }[] = [];
    if (g.baseRow) allLines.push({ tag: "Base Mãe", ptabela: g.baseRow.ptabela ?? null, preco: g.baseRow.preco_final ?? null });
    g.offers.forEach((o, i) => allLines.push({
      tag: o.title || `Promo ${i + 1}`,
      ptabela: g.baseRow?.ptabela ?? null,
      preco: o.price ?? null,
    }));
    const prices = allLines.map((l) => l.preco).filter((p): p is number => p != null);
    const best = prices.length ? Math.min(...prices) : null;
    const ptabela = g.baseRow?.ptabela ?? null;
    const desc = best != null && ptabela ? ((ptabela - best) / ptabela) * 100 : null;

    rows.push([
      first.description + (first.brand ? `\n${first.brand}` : "") + (first.ean ? `\nEAN: ${first.ean}` : ""),
      money(ptabela),
      money(best) + (desc != null ? `\n(-${desc.toFixed(0)}%)` : ""),
      allLines.map((l) => `${l.tag}: ${money(l.preco)}`).join("\n"),
    ]);
  }

  autoTable(doc, {
    startY: headerY + (chips.length ? 16 : 10),
    head: [["Produto", "PTABELA", "Melhor Preço", "Condições"]],
    body: rows,
    styles: { fontSize: 8, cellPadding: 2.5, valign: "top" },
    headStyles: { fillColor: [15, 27, 61], textColor: 255 },
    columnStyles: {
      0: { cellWidth: 70 },
      1: { cellWidth: 22, halign: "right" },
      2: { cellWidth: 30, halign: "right", textColor: [22, 101, 52], fontStyle: "bold" },
      3: { cellWidth: pageW - 14 * 2 - 70 - 22 - 30 },
    },
    rowPageBreak: "avoid",
    didDrawPage: () => {
      const pageH = doc.internal.pageSize.getHeight();
      doc.setFontSize(8);
      doc.setTextColor(140);
      doc.text("Centrofarma — Catálogo gerado automaticamente", 14, pageH - 8);
      const page = doc.getNumberOfPages();
      doc.text(`Página ${page}`, pageW - 24, pageH - 8);
    },
  });

  doc.save(`catalogo-${opts.branchLabel.toLowerCase().replace(/\s+/g, "-")}-${now.toISOString().slice(0, 10)}.pdf`);
}

async function toDataUrl(url: string): Promise<string> {
  const res = await fetch(url);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onloadend = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
}
