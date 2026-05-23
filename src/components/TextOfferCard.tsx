import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ClipboardCopy, Share2, Package, Tag, Barcode, Zap, Sparkle, Trophy } from "lucide-react";
import type { TextOffer } from "@/lib/text-offers";
import type { PriceBaseRow } from "@/lib/price-base";
import { toast } from "sonner";

const fmtBRL = (n: number | null | undefined) =>
  n == null ? "—" : Number(n).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtDate = (d: string) => new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });

function useCountdown(target: string | null) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!target) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [target]);
  if (!target) return null;
  const diff = new Date(target).getTime() - now;
  if (diff <= 0) return { ended: true, label: "ENCERRADA" };
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return { ended: false, label: h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}` };
}

function statusInfo(offer: TextOffer): { label: string; cls: string; emoji: string } {
  const now = Date.now();
  const start = new Date(offer.starts_at).getTime();
  const end = new Date(offer.expires_at).getTime();
  if (end < now) return { label: "ENCERRADA", cls: "bg-muted text-muted-foreground border-border", emoji: "⛔" };
  if (start > now) return { label: "AGENDADA", cls: "bg-primary/15 text-primary border-primary/40", emoji: "🗓" };
  const hoursLeft = (end - now) / 3600000;
  if (hoursLeft <= 24) return { label: `ENCERRA EM ${Math.max(1, Math.ceil(hoursLeft))}h`, cls: "bg-warning/15 text-warning border-warning/40", emoji: "⏰" };
  return { label: "ATIVA", cls: "bg-success/15 text-success border-success/40", emoji: "✅" };
}

/** Cada linha comercial mostrada no comparativo. */
export interface ComparativeLine {
  key: string; // id (offer-xxx ou base)
  name: string; // "Base Mãe" ou título da promoção
  ptabela: number | null;
  precoFinal: number | null;
  descontoPct: number | null;
  source: "base" | "offer";
  offer?: TextOffer;
}

interface Props {
  /** Ofertas vigentes para o mesmo EAN/CODPROD. A primeira é usada como representativa do card. */
  offers: TextOffer[];
  /** Linha equivalente na Base Mãe (se houver). */
  baseRow?: PriceBaseRow | null;
  onAskDoubt?: () => void;
}

export function TextOfferCard({ offers, baseRow, onAskDoubt: _onAskDoubt }: Props) {
  const primary = offers[0];
  const expired = new Date(primary.expires_at).getTime() < Date.now();
  const countdown = useCountdown(primary.flash_until);
  const flashing = !!countdown && !countdown.ended && !expired;
  const status = statusInfo(primary);
  const isNew = Date.now() - new Date(primary.created_at).getTime() < 24 * 3600 * 1000;

  // Monta tabela comparativa
  const lines = useMemo<ComparativeLine[]>(() => {
    const list: ComparativeLine[] = [];
    if (baseRow) {
      const pct = baseRow.ptabela && baseRow.preco_final
        ? ((baseRow.ptabela - baseRow.preco_final) / baseRow.ptabela) * 100
        : null;
      list.push({
        key: `base-${baseRow.id}`,
        name: "Base Mãe",
        ptabela: baseRow.ptabela,
        precoFinal: baseRow.preco_final,
        descontoPct: pct,
        source: "base",
      });
    }
    for (const o of offers) {
      const pt = baseRow?.ptabela ?? null;
      const pf = o.price;
      const pct = pt && pf != null ? ((pt - pf) / pt) * 100 : null;
      list.push({
        key: `offer-${o.id}`,
        name: o.title || "Promoção avulsa",
        ptabela: pt,
        precoFinal: pf,
        descontoPct: pct,
        source: "offer",
        offer: o,
      });
    }
    return list;
  }, [baseRow, offers]);

  const bestKey = useMemo(() => {
    let best: ComparativeLine | null = null;
    for (const l of lines) {
      if (l.precoFinal == null) continue;
      if (!best || (best.precoFinal != null && l.precoFinal < best.precoFinal)) best = l;
    }
    return best?.key ?? null;
  }, [lines]);

  const [selectedKey, setSelectedKey] = useState<string>(() => bestKey ?? lines[0]?.key ?? "");
  useEffect(() => {
    if (!selectedKey && (bestKey || lines[0])) setSelectedKey(bestKey ?? lines[0].key);
  }, [bestKey, lines, selectedKey]);

  const selected = lines.find((l) => l.key === selectedKey) ?? lines[0];

  const description = baseRow?.descricao ?? primary.description;
  const brand = baseRow?.marca ?? primary.brand;
  const codprod = baseRow?.codprod ?? primary.codprod;
  const ean = baseRow?.ean ?? primary.ean;

  const buildInternalText = () => {
    const lns = [
      selected?.name && selected.source === "offer" ? `🎯 *${selected.name}*` : null,
      `*${description}*`,
      brand ? `Marca: ${brand}` : null,
      codprod ? `Código: ${codprod}` : null,
      ean ? `EAN: ${ean}` : null,
      primary.stock != null ? `Estoque: ${primary.stock} un` : null,
      selected?.ptabela != null ? `Preço Tabela: ${fmtBRL(selected.ptabela)}` : null,
      selected?.descontoPct != null ? `Desconto: ${selected.descontoPct.toFixed(1)}%` : null,
      selected?.precoFinal != null ? `\n💰 *PREÇO LÍQUIDO: ${fmtBRL(selected.precoFinal)}*` : null,
      flashing ? `\n⚡ Oferta relâmpago — corre que acaba!` : null,
      `\n${status.emoji} ${status.label}`,
      `📅 Válido até ${fmtDate(primary.expires_at)}`,
    ].filter(Boolean);
    return lns.join("\n");
  };

  const buildClientText = () => {
    const lns = [
      `Olá! 👋 Veja essa oferta especial:`,
      ``,
      `🛒 *${description}*`,
      brand ? `Marca: ${brand}` : null,
      selected?.precoFinal != null ? `Por apenas *${fmtBRL(selected.precoFinal)}*` : null,
      flashing ? `⚡ Oferta relâmpago — corre, é por tempo limitado!` : null,
      ``,
      `📅 Garanta no seu próximo pedido até ${fmtDate(primary.expires_at)}.`,
    ].filter((l) => l !== null);
    return lns.join("\n");
  };

  const copyData = async () => {
    if (expired) { toast.error("Oferta encerrada — dados arquivados."); return; }
    await navigator.clipboard.writeText(buildInternalText());
    toast.success("Dados copiados!", { description: selected?.name });
  };

  const shareClient = async () => {
    if (expired) { toast.error("Oferta encerrada — não pode ser compartilhada."); return; }
    const text = buildClientText();
    if (typeof navigator !== "undefined" && (navigator as any).share) {
      try { await (navigator as any).share({ text, title: description }); return; } catch { /* cancelado */ }
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  return (
    <Card
      data-state={expired ? "muted" : flashing ? "warning" : undefined}
      className={`card-lit-edge relative overflow-hidden rounded-2xl shadow-card hover:shadow-elevated transition-all duration-300 ${flashing ? "ring-2 ring-warning/40" : ""} bg-card/95 ${expired ? "opacity-60" : ""}`}
    >
      {isNew && !expired && (
        <div className="absolute top-2 right-2 z-10 flex items-center gap-1 px-2 py-1 rounded-full bg-success text-white text-[10px] font-display tracking-widest uppercase shadow-elevated animate-pulse">
          <Sparkle className="h-3 w-3" /> Novo
        </div>
      )}

      {primary.title && (
        <div className="bg-gradient-to-r from-accent/20 to-transparent px-4 py-1.5 border-b border-accent/30">
          <div className="font-display text-xs tracking-widest uppercase text-accent truncate">{primary.title}</div>
        </div>
      )}
      {flashing && (
        <div className="bg-warning text-warning-foreground px-4 py-1.5 flex items-center justify-between gap-2 animate-pulse">
          <div className="flex items-center gap-1.5 text-[10px] font-display tracking-widest uppercase">
            <Zap className="h-3 w-3" /> Relâmpago
          </div>
          <div className="font-mono font-bold text-sm tabular-nums">{countdown!.label}</div>
        </div>
      )}
      <div className="p-4 space-y-3">
        <div>
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-accent font-display mb-1">
            <Package className="h-3 w-3" /> Oferta de texto
            {lines.length > 1 && (
              <span className="ml-auto px-1.5 py-0.5 rounded bg-accent/20 text-accent text-[9px]">
                {lines.length} condições
              </span>
            )}
          </div>
          <h3 className="font-display text-lg leading-tight line-clamp-2">{description}</h3>
        </div>

        <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] font-display tracking-widest uppercase ${status.cls}`}>
          {status.label}
        </div>

        {selected?.precoFinal != null && (
          <div className="rounded-lg bg-success/10 border border-success/30 px-3 py-2 text-center">
            <div className="text-[10px] uppercase tracking-widest text-success font-display flex items-center justify-center gap-1">
              {selected.key === bestKey && lines.length > 1 && <Trophy className="h-3 w-3" />}
              Preço líquido · {selected.name}
            </div>
            <div className="font-display text-2xl text-success leading-none">{fmtBRL(selected.precoFinal)}</div>
            {selected.descontoPct != null && selected.descontoPct > 0 && (
              <div className="text-[10px] text-success/80 mt-0.5">{selected.descontoPct.toFixed(1)}% off vs tabela</div>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
          {brand && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Tag className="h-3 w-3 shrink-0" />
              <span className="truncate"><span className="text-foreground">{brand}</span></span>
            </div>
          )}
          {codprod && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <span className="text-[10px] font-mono">COD</span>
              <span className="text-foreground font-mono">{codprod}</span>
            </div>
          )}
          {ean && (
            <div className="flex items-center gap-1.5 text-muted-foreground col-span-2">
              <Barcode className="h-3 w-3 shrink-0" />
              <span className="text-foreground font-mono text-[11px] truncate">{ean}</span>
            </div>
          )}
          {primary.stock != null && (
            <div className="flex items-center gap-1.5 text-muted-foreground col-span-2">
              <Package className="h-3 w-3 shrink-0" />
              Estoque: <span className={`text-foreground font-display ${primary.stock < 10 ? "text-warning" : ""}`}>{primary.stock} un</span>
            </div>
          )}
        </div>

        {lines.length > 1 && (
          <Accordion type="single" collapsible className="border-t border-border/60 pt-1">
            <AccordionItem value="cmp" className="border-0">
              <AccordionTrigger className="py-2 text-[11px] font-display tracking-widest uppercase text-muted-foreground hover:text-foreground">
                Comparar {lines.length} condições
              </AccordionTrigger>
              <AccordionContent>
                <div className="rounded-md border border-border/60 overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-8 px-1"></TableHead>
                        <TableHead className="text-[10px]">Promoção</TableHead>
                        <TableHead className="text-[10px] text-right">PTabela</TableHead>
                        <TableHead className="text-[10px] text-right">Desc.</TableHead>
                        <TableHead className="text-[10px] text-right">Líquido</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lines.map((l) => {
                        const isBest = l.key === bestKey;
                        const isSel = l.key === selectedKey;
                        return (
                          <TableRow
                            key={l.key}
                            onClick={() => setSelectedKey(l.key)}
                            className={`cursor-pointer ${isBest ? "bg-success/10" : ""} ${isSel ? "ring-1 ring-inset ring-primary/60" : ""}`}
                          >
                            <TableCell className="px-1 text-center">
                              <input type="radio" checked={isSel} onChange={() => setSelectedKey(l.key)} aria-label={`Selecionar ${l.name}`} />
                            </TableCell>
                            <TableCell className="text-[11px]">
                              <div className="flex items-center gap-1">
                                {isBest && <Trophy className="h-3 w-3 text-success" />}
                                <span className={isBest ? "text-success font-display" : ""}>{l.name}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-[11px] text-right tabular-nums">{fmtBRL(l.ptabela)}</TableCell>
                            <TableCell className="text-[11px] text-right tabular-nums">
                              {l.descontoPct != null ? `${l.descontoPct.toFixed(1)}%` : "—"}
                            </TableCell>
                            <TableCell className={`text-[11px] text-right tabular-nums font-display ${isBest ? "text-success" : ""}`}>
                              {fmtBRL(l.precoFinal)}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
                <p className="text-[10px] text-muted-foreground mt-2">
                  Clique em uma linha para selecionar essa condição como dados copiados.
                </p>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        )}

        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
          Válido até {fmtDate(primary.expires_at)}
        </div>

        <div className="flex gap-2 pt-1">
          <Button
            onClick={copyData}
            disabled={expired}
            size="lg"
            className="flex-1 h-12 font-display tracking-widest text-sm bg-primary hover:bg-primary/90 text-primary-foreground shadow-elevated"
          >
            <ClipboardCopy className="h-4 w-4 mr-2" />
            COPIAR DADOS
          </Button>
          <Button
            onClick={shareClient}
            disabled={expired}
            size="lg"
            variant="outline"
            className="h-12 w-12 p-0 border-success/50 text-success hover:bg-success/10"
            aria-label="Compartilhar com cliente"
            title="Enviar texto amigável ao cliente"
          >
            <Share2 className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
