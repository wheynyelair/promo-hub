import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useLaminas, isExpired, type Lamina } from "@/lib/laminas";
import { useTextOffers, isOfferExpired, type TextOffer } from "@/lib/text-offers";
import { LaminaCard } from "@/components/LaminaCard";
import { LaminaViewer } from "@/components/LaminaViewer";
import { TextOfferCard } from "@/components/TextOfferCard";
import { FiltersDrawer, EMPTY_FILTERS, type FiltersState } from "@/components/FiltersDrawer";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Search, Archive, Package, Image as ImageIcon, X } from "lucide-react";

export const Route = createFileRoute("/_app/arquivo")({ component: Arquivo });

const MONTHS = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];
const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
const monthLabel = (key: string) => {
  const [y, m] = key.split("-").map(Number);
  return `${MONTHS[m - 1]} ${y}`;
};
const monthRange = (key: string) => {
  const [y, m] = key.split("-").map(Number);
  return { first: new Date(y, m - 1, 1).getTime(), last: new Date(y, m, 1).getTime() - 1 };
};

function Arquivo() {
  const { profile } = useAuth();
  const { data: laminas = [] } = useLaminas(profile);
  const { data: offers = [] } = useTextOffers(profile);
  const [open, setOpen] = useState<Lamina | null>(null);
  const [q, setQ] = useState("");
  const [filters, setFilters] = useState<FiltersState>({ ...EMPTY_FILTERS, period: "expired" });
  const [month, setMonth] = useState<string>("all");
  const [tab, setTab] = useState<"laminas" | "textos">("laminas");

  const archivedLaminas = useMemo(() => laminas.filter(isExpired), [laminas]);
  const archivedOffers = useMemo(() => offers.filter(isOfferExpired), [offers]);

  // Lista de meses (com base no expires_at dos arquivados)
  const months = useMemo(() => {
    const set = new Set<string>();
    const source = tab === "laminas" ? archivedLaminas : archivedOffers;
    source.forEach((it: any) => {
      const s = new Date(it.starts_at);
      const e = new Date(it.expires_at);
      const cur = new Date(s.getFullYear(), s.getMonth(), 1);
      const last = new Date(e.getFullYear(), e.getMonth(), 1);
      while (cur <= last) {
        set.add(monthKey(cur));
        cur.setMonth(cur.getMonth() + 1);
      }
    });
    return Array.from(set).sort((a, b) => (a < b ? 1 : -1));
  }, [tab, archivedLaminas, archivedOffers]);

  const industries = useMemo(() => {
    const set = new Set<string>();
    archivedLaminas.forEach((l) => l.industry && set.add(l.industry));
    archivedOffers.forEach((o) => o.brand && set.add(o.brand));
    return Array.from(set).sort();
  }, [archivedLaminas, archivedOffers]);

  // Filtro de período (mês)
  const inMonth = (starts: string, expires: string) => {
    if (month === "all") return true;
    const { first, last } = monthRange(month);
    const s = new Date(starts).getTime();
    const e = new Date(expires).getTime();
    return s <= last && e >= first;
  };

  // Filtro por intervalo customizado (filters.range)
  const inRange = (starts: string, expires: string) => {
    if (!filters.range?.from) return true;
    const from = filters.range.from.getTime();
    const to = (filters.range.to ?? filters.range.from).getTime() + 86399000;
    const s = new Date(starts).getTime();
    const e = new Date(expires).getTime();
    return e >= from && s <= to;
  };

  const lower = q.toLowerCase();
  const filteredLaminas = useMemo(() => {
    return archivedLaminas
      .filter((l) => inMonth(l.starts_at, l.expires_at))
      .filter((l) => inRange(l.starts_at, l.expires_at))
      .filter((l) => !filters.industry || l.industry === filters.industry)
      .filter((l) =>
        !q ||
        l.title.toLowerCase().includes(lower) ||
        (l.description ?? "").toLowerCase().includes(lower) ||
        (l.industry ?? "").toLowerCase().includes(lower) ||
        (l.ean ?? "").includes(q)
      );
  }, [archivedLaminas, q, filters, month]);

  const filteredOffers = useMemo(() => {
    return archivedOffers
      .filter((o) => inMonth(o.starts_at, o.expires_at))
      .filter((o) => inRange(o.starts_at, o.expires_at))
      .filter((o) => !filters.industry || (o.brand ?? "").toLowerCase() === filters.industry!.toLowerCase())
      .filter((o) =>
        !q ||
        o.description.toLowerCase().includes(lower) ||
        (o.brand ?? "").toLowerCase().includes(lower) ||
        (o.ean ?? "").includes(q) ||
        (o.codprod ?? "").includes(q)
      );
  }, [archivedOffers, q, filters, month]);

  return (
    <main className="max-w-7xl mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-2">
        <Archive className="h-7 w-7 text-muted-foreground" />
        <h1 className="font-display text-4xl md:text-5xl">ARQUIVO MORTO</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-6">
        Lâminas e ofertas com vigência expirada. Use os filtros para localizar promoções antigas.
      </p>

      {/* Busca + filtros */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nome, marca, EAN ou código…"
            className="pl-9 h-11 font-display tracking-wider"
          />
          {q && (
            <button
              onClick={() => setQ("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-muted"
              aria-label="Limpar busca"
            >
              <X className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          )}
        </div>
        <FiltersDrawer industries={industries} value={filters} onChange={setFilters} />
      </div>

      {/* Seletor mês/ano */}
      <div className="sticky top-14 z-20 -mx-4 px-4 py-3 mb-4 glass-strong bg-background/80 backdrop-blur">
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-1 px-1">
          <button
            onClick={() => setMonth("all")}
            className={`shrink-0 px-4 py-2 rounded-full text-xs font-display tracking-widest uppercase transition-all border ${
              month === "all"
                ? "bg-primary text-primary-foreground border-primary shadow-elevated"
                : "bg-muted/40 text-muted-foreground border-transparent hover:bg-muted"
            }`}
          >
            Todos os períodos
          </button>
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

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <TabsList className="mb-4">
          <TabsTrigger value="laminas" className="font-display tracking-wider">
            <ImageIcon className="h-4 w-4 mr-2" />
            LÂMINAS ARQUIVADAS
            <span className="ml-2 text-[10px] text-muted-foreground">({filteredLaminas.length})</span>
          </TabsTrigger>
          <TabsTrigger value="textos" className="font-display tracking-wider">
            <Package className="h-4 w-4 mr-2" />
            TEXTOS ARQUIVADOS
            <span className="ml-2 text-[10px] text-muted-foreground">({filteredOffers.length})</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="laminas">
          {filteredLaminas.length === 0 ? (
            <EmptyState label="lâmina" />
          ) : (
            <div className="columns-2 md:columns-3 lg:columns-4 gap-4">
              {filteredLaminas.map((l) => (
                <div
                  key={l.id}
                  className="mb-4 break-inside-avoid grayscale opacity-70 hover:opacity-100 hover:grayscale-0 transition"
                >
                  <LaminaCard lamina={l} onOpen={() => setOpen(l)} />
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="textos">
          {filteredOffers.length === 0 ? (
            <EmptyState label="oferta" />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 opacity-80">
              {filteredOffers.map((o: TextOffer) => (
                <TextOfferCard key={o.id} offers={[o]} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <LaminaViewer lamina={open} onClose={() => setOpen(null)} />
    </main>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="text-center py-20 text-muted-foreground">
      <p className="font-display text-2xl mb-2">NENHUMA {label.toUpperCase()} ARQUIVADA</p>
      <p className="text-sm">Ajuste os filtros, mude o mês ou limpe a busca.</p>
    </div>
  );
}
