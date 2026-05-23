import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, useRef } from "react";
import { useAuth } from "@/lib/auth";
import { useLaminas, useBranchSettings, isExpired, isFuture, CATEGORY_LABEL, type Lamina, type LaminaCategory } from "@/lib/laminas";
import { useTextOffers, isOfferExpired, isOfferFuture, type TextOffer } from "@/lib/text-offers";
import { usePriceBase, indexBase } from "@/lib/price-base";
import { useFavorites, useToggleFavorite } from "@/lib/favorites";
import { useMyShareHistory, formatRelative } from "@/lib/send-history";
import { markSeen } from "@/lib/last-seen";
import { useBranding, BRANCH_NAME } from "@/lib/branding";
import { LaminaCard } from "@/components/LaminaCard";
import { LaminaViewer } from "@/components/LaminaViewer";
import { EditLaminaDialog } from "@/components/EditLaminaDialog";
import { DuvidaDialog } from "@/components/DuvidaDialog";
import { TextOfferCard } from "@/components/TextOfferCard";
import { FiltersDrawer, EMPTY_FILTERS, type FiltersState } from "@/components/FiltersDrawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from "@/components/ui/carousel";
import { useQueryClient } from "@tanstack/react-query";
import { Search, ChevronLeft, ChevronRight, Presentation, X, Mic, MicOff, Tag, Target, EyeOff, Eye, Package, FileDown } from "lucide-react";
import { toast } from "sonner";
import { generateCatalogPdf } from "@/lib/pdf";


export const Route = createFileRoute("/_app/galeria")({ component: Galeria });

const MONTHS = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];
const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
const monthLabel = (key: string) => {
  const [y, m] = key.split("-").map(Number);
  return `${MONTHS[m - 1]} ${y}`;
};

type TopTab = "promocoes" | "campanhas" | "ofertas_texto";
const PROMO_CATEGORIES: LaminaCategory[] = ["acoes", "compre_ganhe", "diversos"];

function Galeria() {
  const { profile } = useAuth();
  const { data: branding } = useBranding();
  const qc = useQueryClient();
  const { data: laminas = [], isLoading } = useLaminas(profile);
  const { data: textOffers = [] } = useTextOffers(profile);
  const { data: priceBase = [] } = usePriceBase(profile);
  const { data: branchSettings = [] } = useBranchSettings();
  const { data: favSet } = useFavorites();
  const toggleFav = useToggleFavorite();
  const { data: shareHistory } = useMyShareHistory();
  const [q, setQ] = useState("");
  const [filters, setFilters] = useState<FiltersState>(EMPTY_FILTERS);
  const [open, setOpen] = useState<Lamina | null>(null);
  const [edit, setEdit] = useState<Lamina | null>(null);
  const [duvida, setDuvida] = useState<Lamina | null>(null);
  const [presentMode, setPresentMode] = useState(false);
  const [month, setMonth] = useState<string>(() => monthKey(new Date()));
  const [tab, setTab] = useState<TopTab>("promocoes");
  const [clientMode, setClientMode] = useState(false);

  // Marca galeria como vista (zera badge "novidades")
  useEffect(() => { markSeen(); }, []);

  const branchInfo = useMemo(
    () => branchSettings.find((b) => b.branch === profile?.branch),
    [branchSettings, profile?.branch]
  );

  // Client mode forces "promocoes" and hides the campaigns tab entirely
  useEffect(() => { if (clientMode && tab === "campanhas") setTab("promocoes"); }, [clientMode, tab]);

  const onlyActive = filters.period === "active";
  const toggleOnlyActive = (v: boolean) => setFilters({ ...filters, period: v ? "active" : "all" });

  const industries = useMemo(() => {
    const set = new Set<string>();
    laminas.forEach((l) => l.industry && set.add(l.industry));
    return Array.from(set).sort();
  }, [laminas]);

  // Build months list: include every month a lâmina overlaps (start..end), plus current month
  const months = useMemo(() => {
    const set = new Set<string>();
    set.add(monthKey(new Date()));
    laminas.forEach((l) => {
      const s = new Date(l.starts_at);
      const e = new Date(l.expires_at);
      const cur = new Date(s.getFullYear(), s.getMonth(), 1);
      const last = new Date(e.getFullYear(), e.getMonth(), 1);
      while (cur <= last) {
        set.add(monthKey(cur));
        cur.setMonth(cur.getMonth() + 1);
      }
    });
    return Array.from(set).sort((a, b) => (a < b ? 1 : -1));
  }, [laminas]);

  useEffect(() => {
    if (months.length && !months.includes(month)) setMonth(months[0]);
  }, [months, month]);

  // Helpers: month boundaries + overlap test
  const monthBounds = (key: string) => {
    const [y, m] = key.split("-").map(Number);
    const first = new Date(y, m - 1, 1).getTime();
    const last = new Date(y, m, 1).getTime() - 1;
    return { first, last };
  };
  const overlapsMonth = (l: Lamina, key: string) => {
    const { first, last } = monthBounds(key);
    const s = new Date(l.starts_at).getTime();
    const e = new Date(l.expires_at).getTime();
    return s <= last && e >= first;
  };

  const filtered = useMemo(() => {
    if (tab === "ofertas_texto") return [];
    return laminas
      // STRICT separation: campaign category lives only on the "campanhas" tab
      .filter((l) => tab === "campanhas" ? l.category === "campanhas" : l.category !== "campanhas")
      // "Apenas Ativas" bypasses the month selector entirely
      .filter((l) => onlyActive ? (!isExpired(l) && !isFuture(l)) : overlapsMonth(l, month))
      .filter((l) => {
        if (onlyActive) return true; // already filtered above
        if (filters.period === "expired") return isExpired(l);
        if (filters.period === "future") return isFuture(l);
        return true;
      })
      .filter((l) => !filters.industry || l.industry === filters.industry)
      .filter((l) => {
        if (!filters.range?.from) return true;
        const start = new Date(l.starts_at).getTime();
        const end = new Date(l.expires_at).getTime();
        const from = filters.range.from.getTime();
        const to = (filters.range.to ?? filters.range.from).getTime() + 86399000;
        return end >= from && start <= to;
      })
      .filter((l) => !filters.favoritesOnly || (favSet?.has(l.id) ?? false))
      .filter((l) => !q || l.title.toLowerCase().includes(q.toLowerCase()) || (l.description ?? "").toLowerCase().includes(q.toLowerCase()) || (l.industry ?? "").toLowerCase().includes(q.toLowerCase()) || (l.ean ?? "").toLowerCase().includes(q.toLowerCase()));
  }, [laminas, q, filters, month, tab, onlyActive, favSet]);

  const filteredOffers = useMemo<TextOffer[]>(() => {
    if (tab !== "ofertas_texto" || filters.favoritesOnly) return [];
    const lower = q.toLowerCase();
    return textOffers
      .filter((o) => onlyActive ? (!isOfferExpired(o) && !isOfferFuture(o)) : true)
      .filter((o) => !filters.industry || (o.brand ?? "").toLowerCase() === filters.industry.toLowerCase())
      .filter((o) => !q || o.description.toLowerCase().includes(lower) || (o.brand ?? "").toLowerCase().includes(lower) || (o.ean ?? "").includes(q) || (o.codprod ?? "").includes(q));
  }, [textOffers, q, filters.industry, filters.favoritesOnly, onlyActive, tab]);

  /** Agrupa ofertas por EAN (fallback CODPROD) e anexa linha da Base Mãe. */
  const offerGroups = useMemo(() => {
    const { byEan, byCodprod } = indexBase(priceBase);
    const groups = new Map<string, { key: string; offers: TextOffer[]; baseRow: ReturnType<typeof byEan.get> | null }>();
    for (const o of filteredOffers) {
      const key = (o.ean && `ean:${o.ean}`) || (o.codprod && `cod:${o.codprod}`) || `id:${o.id}`;
      if (!groups.has(key)) {
        const baseRow = (o.ean ? byEan.get(o.ean) : null) ?? (o.codprod ? byCodprod.get(o.codprod) : null) ?? null;
        groups.set(key, { key, offers: [], baseRow });
      }
      groups.get(key)!.offers.push(o);
    }
    return Array.from(groups.values());
  }, [filteredOffers, priceBase]);

  // Group by category, then split each into Active vs Expired sections
  const byCategory = useMemo(() => {
    const { first: monthStart } = monthBounds(month);
    const map = new Map<LaminaCategory, Lamina[]>();
    for (const l of filtered) map.set(l.category, [...(map.get(l.category) ?? []), l]);
    const order = tab === "campanhas" ? (["campanhas"] as LaminaCategory[]) : PROMO_CATEGORIES;
    return order
      .map((c) => {
        const items = map.get(c) ?? [];
        const ativas = items.filter((l) => !isExpired(l));
        const encerradas = items.filter((l) => isExpired(l));
        return { category: c, ativas, encerradas, monthStart };
      })
      .filter((g) => g.ativas.length + g.encerradas.length > 0);
  }, [filtered, tab, month]);

  // Format "Remanescente de MES" for items that started before the visible month
  const remnantLabel = (l: Lamina, monthStart: number) => {
    const s = new Date(l.starts_at);
    if (onlyActive) return null;
    if (s.getTime() >= monthStart) return null;
    return `Remanescente de ${MONTHS[s.getMonth()]}`;
  };

  if (presentMode) return <PresentMode laminas={filtered} onExit={() => setPresentMode(false)} />;

  const itemLabel = tab === "campanhas" ? "campanha" : tab === "ofertas_texto" ? "oferta" : "promoção";
  const itemLabelPlural = tab === "campanhas" ? "campanhas" : tab === "ofertas_texto" ? "ofertas" : "promoções";
  const counterContext = filters.industry ? ` da ${filters.industry}` : "";
  const totalCount = tab === "ofertas_texto" ? filteredOffers.length : filtered.length;

  return (
    <main className={`max-w-7xl mx-auto px-4 py-6 ${tab === "campanhas" ? "accent-gold" : ""}`}>
      {/* Hero banner */}
      <section className="relative rounded-3xl overflow-hidden mb-6 h-40 md:h-56 shadow-elevated">
        {branding?.cover_url ? (
          <img src={branding.cover_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 gradient-hero" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
        <div className="relative h-full flex items-end justify-between p-5 text-white">
          <div className="flex items-center gap-3">
            {branding?.logo_url && (
              <img src={branding.logo_url} alt="Logo" className="h-14 w-14 md:h-16 md:w-16 object-contain rounded-xl bg-white/10 p-1.5 backdrop-blur" />
            )}
            <div>
              <div className="text-xs uppercase tracking-widest opacity-80">{BRANCH_NAME[profile?.branch ?? ""] ?? profile?.branch}</div>
              <h1 className="font-display text-3xl md:text-5xl leading-none">
                {tab === "campanhas" ? "CAMPANHAS" : tab === "ofertas_texto" ? "OFERTAS (TEXTO)" : "PROMOÇÕES"}
              </h1>
            </div>
          </div>
        </div>
      </section>

      {/* Top-level master tabs */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="inline-flex p-1 rounded-2xl bg-muted/60 border border-border">
          <button
            onClick={() => setTab("promocoes")}
            className={`px-4 py-2 rounded-xl text-xs font-display tracking-widest uppercase transition-all flex items-center gap-2 ${
              tab === "promocoes" ? "bg-background shadow-card text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Tag className="h-3.5 w-3.5" /> Promoções &amp; Ofertas
          </button>
          <button
            onClick={() => setTab("ofertas_texto")}
            className={`px-4 py-2 rounded-xl text-xs font-display tracking-widest uppercase transition-all flex items-center gap-2 ${
              tab === "ofertas_texto" ? "bg-background shadow-card text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Package className="h-3.5 w-3.5" /> Ofertas (Texto)
          </button>
          {!clientMode && (
            <button
              onClick={() => setTab("campanhas")}
              className={`px-4 py-2 rounded-xl text-xs font-display tracking-widest uppercase transition-all flex items-center gap-2 ${
                tab === "campanhas" ? "bg-background shadow-card text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Target className="h-3.5 w-3.5" /> Campanhas de Incentivo
            </button>
          )}
        </div>
        <div className="ml-auto flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-card/60">
          {clientMode ? <EyeOff className="h-3.5 w-3.5 text-accent" /> : <Eye className="h-3.5 w-3.5 text-muted-foreground" />}
          <Label htmlFor="client-mode" className="text-xs font-display tracking-wider uppercase cursor-pointer">Modo Cliente</Label>
          <Switch id="client-mode" checked={clientMode} onCheckedChange={setClientMode} />
        </div>
      </div>

      {tab === "campanhas" && (
        <div className="mb-4 rounded-xl border border-accent/40 bg-accent/10 px-3 py-2 text-xs text-foreground/80">
          Área exclusiva do RCA. Regras, metas e prêmios. Não exibir ao cliente.
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <Switch id="only-active" checked={onlyActive} onCheckedChange={toggleOnlyActive} />
          <Label htmlFor="only-active" className="font-display tracking-wider text-xs uppercase cursor-pointer">
            Apenas ativas
          </Label>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <SmartSearch value={q} onChange={setQ} />
          <FiltersDrawer industries={industries} value={filters} onChange={setFilters} />
          {tab === "ofertas_texto" && offerGroups.length > 0 && (
            <Button
              variant="secondary"
              className="font-display tracking-wider"
              onClick={() =>
                generateCatalogPdf(offerGroups, {
                  branchLabel: BRANCH_NAME[profile?.branch ?? ""] ?? profile?.branch ?? "Filial",
                  logoUrl: branding?.logo_url ?? null,
                  filters: { marca: filters.industry, onlyActive, search: q || null },
                }).catch((e) => toast.error(e.message ?? "Falha ao gerar PDF"))
              }
            >
              <FileDown className="h-4 w-4 mr-2" />PDF CATÁLOGO
            </Button>
          )}
          <Button onClick={() => setPresentMode(true)} className="font-display tracking-wider"><Presentation className="h-4 w-4 mr-2"/>APRESENTAR</Button>
        </div>

      </div>

      {/* Sticky month selector — não se aplica a ofertas de texto */}
      {tab !== "ofertas_texto" && (
      <div className="sticky top-14 z-20 -mx-4 px-4 py-3 mb-4 glass-strong bg-background/80 backdrop-blur">
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-1 px-1">
          {months.map((key) => {
            const active = month === key;
            return (
              <button
                key={key}
                onClick={() => setMonth(key)}
                className={`shrink-0 px-4 py-2 rounded-full text-xs font-display tracking-widest uppercase transition-all border ${
                  active
                    ? "bg-primary text-primary-foreground border-primary shadow-elevated"
                    : "bg-muted/40 text-muted-foreground border-transparent hover:bg-muted"
                }`}
              >
                {monthLabel(key)}
              </button>
            );
          })}
        </div>
      </div>
      )}

      {/* Active brand chip (compact indicator only — full brand search lives in Filtros) */}
      {filters.industry && (
        <div className="mb-4 flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-widest font-display text-muted-foreground">Marca:</span>
          <button
            onClick={() => setFilters({ ...filters, industry: null })}
            className="px-3 py-1 rounded-full text-[11px] font-display tracking-widest uppercase border bg-accent text-accent-foreground border-accent inline-flex items-center gap-1.5"
          >
            {filters.industry}
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* Results counter */}
      <div className="mb-4 text-xs text-muted-foreground font-display tracking-wider uppercase">
        Exibindo <span className="text-foreground">{totalCount}</span> {totalCount === 1 ? itemLabel : itemLabelPlural}{counterContext}
        {tab === "ofertas_texto" ? (onlyActive ? " ativas hoje" : "") : (onlyActive ? " ativas hoje" : ` em ${monthLabel(month)}`)}
      </div>

      {isLoading ? (
        <div className="lamina-grid animate-fade-in">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-2xl overflow-hidden border border-border/60">
              <Skeleton className="w-full aspect-[3/4]" />
              <div className="p-3 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <Skeleton className="h-10" />
                  <Skeleton className="h-10" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : byCategory.length === 0 && filteredOffers.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground animate-fade-in">
          <p className="font-display text-2xl mb-2">NADA POR AQUI</p>
          <p className="text-sm">Sem {itemLabelPlural} {onlyActive ? "ativas no momento" : `em ${monthLabel(month)}`}. Troque o mês ou ajuste os filtros.</p>
        </div>
      ) : (
        <div className="space-y-10 animate-fade-in">
          {filteredOffers.length > 0 && (
            <section>
              <div className="flex items-baseline gap-3 mb-4">
                <h2 className="font-display text-2xl tracking-wider uppercase flex items-center gap-2">
                  <Package className="h-5 w-5 text-accent" /> Ofertas de Texto
                </h2>
                <span className="text-xs text-muted-foreground">· {offerGroups.length} {offerGroups.length === 1 ? "produto" : "produtos"} ({filteredOffers.length} condições)</span>
                <div className="h-px flex-1 bg-border" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {offerGroups.map((g) => (
                  <TextOfferCard key={g.key} offers={g.offers} baseRow={g.baseRow} />
                ))}
              </div>
            </section>
          )}

          {byCategory.map(({ category, ativas, encerradas, monthStart }) => {
            const total = ativas.length + encerradas.length;
            const renderItem = (l: Lamina) => (
              <LaminaCard
                key={l.id}
                lamina={l}
                onOpen={() => setOpen(l)}
                isAdmin={profile?.is_admin && !clientMode}
                onEdit={() => setEdit(l)}
                onAskDoubt={!clientMode ? () => setDuvida(l) : undefined}
                variant={tab === "campanhas" ? "campaign" : "promo"}
                remnantOf={remnantLabel(l, monthStart)}
                isFavorite={favSet?.has(l.id) ?? false}
                onToggleFavorite={() => toggleFav.mutate({ laminaId: l.id, on: !(favSet?.has(l.id) ?? false) })}
              />
            );
            return (
              <section key={category}>
                <div className="flex items-baseline gap-3 mb-4">
                  <h2 className="font-display text-2xl tracking-wider uppercase">{CATEGORY_LABEL[category]}</h2>
                  <span className="text-xs text-muted-foreground">· {total} {total === 1 ? "lâmina" : "lâminas"}</span>
                  <div className="h-px flex-1 bg-border" />
                </div>

                {ativas.length > 0 && (
                  <div className="mb-6">
                    <div className="text-[11px] font-display tracking-widest uppercase text-success mb-2">Promoções Ativas · {ativas.length}</div>
                    <div className={tab === "campanhas" ? "lamina-stack" : "lamina-grid"}>
                      {ativas.map(renderItem)}
                    </div>
                  </div>
                )}

                {encerradas.length > 0 && !onlyActive && (
                  <div>
                    <div className="text-[11px] font-display tracking-widest uppercase text-muted-foreground mb-2">Promoções Encerradas · {encerradas.length}</div>
                    <div className={tab === "campanhas" ? "lamina-stack" : "lamina-grid"}>
                      {encerradas.map(renderItem)}
                    </div>
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}

      <LaminaViewer lamina={open} onClose={() => setOpen(null)} />
      <EditLaminaDialog lamina={edit} onClose={() => setEdit(null)} onSaved={() => qc.invalidateQueries({ queryKey: ["laminas"] })} />
      <DuvidaDialog
        lamina={duvida}
        onClose={() => setDuvida(null)}
        managerName={branchInfo?.manager_name ?? null}
        managerPhone={branchInfo?.manager_phone ?? null}
        rcaName={profile?.display_name ?? null}
      />
    </main>
  );
}

function SmartSearch({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [listening, setListening] = useState(false);
  const recRef = useRef<any>(null);

  const supported = typeof window !== "undefined" && (("SpeechRecognition" in window) || ("webkitSpeechRecognition" in window));

  const toggleVoice = () => {
    if (!supported) { toast.error("Busca por voz não suportada neste navegador."); return; }
    if (listening) { recRef.current?.stop(); return; }
    const Ctor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const rec = new Ctor();
    rec.lang = "pt-BR";
    rec.interimResults = true;
    rec.continuous = false;
    rec.onresult = (e: any) => {
      const txt = Array.from(e.results).map((r: any) => r[0].transcript).join("");
      onChange(txt);
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    rec.start();
    recRef.current = rec;
    setListening(true);
  };

  return (
    <div className="relative w-full sm:w-64">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input className="pl-9 pr-10 w-full" placeholder="Buscar título, marca ou EAN..." value={value} onChange={(e) => onChange(e.target.value)} />
      <Button type="button" size="icon" variant="ghost" onClick={toggleVoice}
        className={`absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 ${listening ? "text-destructive animate-pulse" : ""}`}>
        {listening ? <MicOff className="h-4 w-4"/> : <Mic className="h-4 w-4"/>}
      </Button>
    </div>
  );
}

function PresentMode({ laminas, onExit }: { laminas: Lamina[]; onExit: () => void }) {
  const [api, setApi] = useState<CarouselApi>();
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (!api) return;
    setIdx(api.selectedScrollSnap());
    api.on("select", () => setIdx(api.selectedScrollSnap()));
  }, [api]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onExit();
      if (e.key === "ArrowRight") api?.scrollNext();
      if (e.key === "ArrowLeft") api?.scrollPrev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [api, onExit]);

  if (laminas.length === 0) {
    return (
      <div className="fixed inset-0 z-50 bg-black text-white flex flex-col items-center justify-center gap-4">
        <p className="font-display text-2xl">Nenhuma lâmina para apresentar.</p>
        <Button onClick={onExit} variant="secondary">Sair</Button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
      <Button onClick={onExit} size="icon" variant="ghost" className="absolute top-4 right-4 z-10 text-white hover:bg-white/10"><X className="h-6 w-6"/></Button>
      <div className="absolute top-4 left-4 z-10 text-white/70 text-sm font-display tracking-wider">{idx + 1} / {laminas.length}</div>
      <Carousel setApi={setApi} opts={{ loop: true }} className="w-full h-full">
        <CarouselContent className="h-screen">
          {laminas.map((l) => (
            <CarouselItem key={l.id} className="h-screen flex items-center justify-center">
              <img src={l.image_url} alt={l.title} className="max-h-screen max-w-full object-contain" />
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>
      <Button onClick={() => api?.scrollPrev()} size="icon" variant="ghost" className="absolute left-4 top-1/2 -translate-y-1/2 z-10 h-14 w-14 text-white hover:bg-white/10"><ChevronLeft className="h-8 w-8"/></Button>
      <Button onClick={() => api?.scrollNext()} size="icon" variant="ghost" className="absolute right-4 top-1/2 -translate-y-1/2 z-10 h-14 w-14 text-white hover:bg-white/10"><ChevronRight className="h-8 w-8"/></Button>
    </div>
  );
}
