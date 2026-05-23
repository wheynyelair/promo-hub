import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useLaminas, CATEGORIES, CATEGORY_LABEL, type Lamina, type LaminaCategory } from "@/lib/laminas";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EditLaminaDialog } from "@/components/EditLaminaDialog";
import { BrandingPanel } from "@/components/BrandingPanel";
import { ImportOffersDialog } from "@/components/ImportOffersDialog";
import {
  useTextOffers,
  useDeleteTextOffer,
  useDeleteTextOffersBatch,
  useUpdateTextOffer,
  useUpdateTextOffersBatch,
  useDuplicateTextOffersBatch,
  isOfferExpired,
  isOfferFuture,
  type TextOffer,
} from "@/lib/text-offers";
import { generateWeeklyPdf } from "@/lib/pdf";
import { isExpired, isFuture } from "@/lib/laminas";
import {
  Plus, Trash2, Eye, Download, Share2, Upload, Loader2, CalendarRange, FileDown,
  Pencil, Timer, X, Copy, Package, MoreVertical, Send, Sparkles,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/admin")({ component: Admin });

const BADGES = ["Urgente", "Estoque Baixo", "Últimas Horas"];

// ───────────────────────────── status helpers ─────────────────────────────

type StatusKind = "active" | "future" | "expired";

function StatusBadge({ kind }: { kind: StatusKind }) {
  const map: Record<StatusKind, { label: string; cls: string }> = {
    active: { label: "Ativa", cls: "bg-success/15 text-success border-success/40" },
    future: { label: "Agendada", cls: "bg-warning/15 text-warning border-warning/40" },
    expired: { label: "Vencida", cls: "bg-muted text-muted-foreground border-border" },
  };
  const { label, cls } = map[kind];
  return (
    <span className={`px-1.5 py-0.5 rounded border text-[10px] font-display tracking-widest uppercase ${cls}`}>
      {label}
    </span>
  );
}

const laminaStatus = (l: Lamina): StatusKind => (isExpired(l) ? "expired" : isFuture(l) ? "future" : "active");
const offerStatus = (o: TextOffer): StatusKind => (isOfferExpired(o) ? "expired" : isOfferFuture(o) ? "future" : "active");

function isNew(iso: string) {
  return Date.now() - new Date(iso).getTime() < 24 * 3600 * 1000;
}

// ───────────────────────────── main ─────────────────────────────

function Admin() {
  const { profile } = useAuth();
  const nav = useNavigate();
  const { data: laminas = [], refetch } = useLaminas(profile);
  const qc = useQueryClient();
  const [edit, setEdit] = useState<Lamina | null>(null);
  const [tab, setTab] = useState<"laminas" | "ofertas" | "branding" | "pdf">("laminas");

  useEffect(() => {
    if (profile && !profile.is_admin) nav({ to: "/galeria" });
  }, [profile, nav]);

  const [periodFilter, setPeriodFilter] = useState<"active" | "future" | "expired" | "all">("active");
  const [search, setSearch] = useState("");

  if (!profile?.is_admin) return null;

  const remove = async (l: Lamina) => {
    if (!confirm(`Excluir "${l.title}"?`)) return;
    await supabase.storage.from("laminas").remove([l.storage_path]);
    await supabase.from("laminas").delete().eq("id", l.id);
    toast.success("Lâmina removida");
    refetch();
  };

  const duplicate = async (l: Lamina) => {
    try {
      const ext = l.storage_path.split(".").pop() || "jpg";
      const newPath = `${l.branch}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const cp = await supabase.storage.from("laminas").copy(l.storage_path, newPath);
      if (cp.error) throw cp.error;
      const { data: pub } = supabase.storage.from("laminas").getPublicUrl(newPath);
      const ins = await supabase.from("laminas").insert({
        title: `${l.title} (cópia)`,
        description: l.description,
        industry: l.industry,
        branch: l.branch as any,
        branches: (l.branches ?? [l.branch]) as any,
        category: l.category,
        badges: l.badges,
        starts_at: l.starts_at,
        expires_at: l.expires_at,
        flash_until: l.flash_until,
        ean: l.ean,
        price_from: l.price_from,
        price_to: l.price_to,
        image_url: pub.publicUrl,
        storage_path: newPath,
        created_by: profile.id,
      } as any);
      if (ins.error) throw ins.error;
      toast.success("Lâmina duplicada — ajuste o que precisar");
      refetch();
    } catch (e: any) {
      toast.error("Erro ao duplicar: " + (e.message ?? e));
    }
  };

  const cleanupExpired = async () => {
    const expired = laminas.filter((l) => isExpired(l));
    if (expired.length === 0) { toast.info("Não há lâminas vencidas para limpar."); return; }
    if (!confirm(`Excluir ${expired.length} lâmina(s) vencida(s) definitivamente? Esta ação não pode ser desfeita.`)) return;
    try {
      await supabase.storage.from("laminas").remove(expired.map((l) => l.storage_path));
      const { error } = await supabase.from("laminas").delete().in("id", expired.map((l) => l.id));
      if (error) throw error;
      toast.success(`${expired.length} lâmina(s) vencida(s) removida(s).`);
      refetch();
    } catch (e: any) {
      toast.error("Erro: " + (e.message ?? e));
    }
  };

  const filteredLaminas = useMemo(() => laminas.filter((l) => {
    const s = laminaStatus(l);
    if (periodFilter !== "all" && periodFilter !== s) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const hay = `${l.title} ${l.industry ?? ""} ${l.description ?? ""} ${l.ean ?? ""}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  }), [laminas, periodFilter, search]);

  const grouped = useMemo(() => {
    const map = new Map<string, Lamina[]>();
    for (const l of filteredLaminas) {
      const d = new Date(l.starts_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      map.set(key, [...(map.get(key) ?? []), l]);
    }
    const MONTHS = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];
    return Array.from(map.entries())
      .sort((a, b) => (a[0] < b[0] ? 1 : -1))
      .map(([key, items]) => {
        const [y, m] = key.split("-").map(Number);
        return { key, label: `${MONTHS[m - 1]} ${y}`, items };
      });
  }, [filteredLaminas]);

  const totals = laminas.reduce((acc, l) => ({
    v: acc.v + l.view_count,
    d: acc.d + l.download_count,
    s: acc.s + l.share_count,
  }), { v: 0, d: 0, s: 0 });

  const weeklyPdf = (branch: string) => {
    const filtered = laminas.filter((l) => !isExpired(l) && !isFuture(l)).filter((l) =>
      l.branch === branch || (l.branches ?? []).includes(branch)
    );
    if (filtered.length === 0) { toast.error("Nenhuma ação ativa para essa filial."); return; }
    generateWeeklyPdf(filtered, branch.toUpperCase());
  };

  return (
    <main className="max-w-7xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="font-display text-4xl md:text-5xl">PAINEL ADMIN</h1>
          <p className="text-sm text-muted-foreground">{laminas.length} lâminas no sistema</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" onClick={cleanupExpired} className="font-display tracking-wider">
            <Trash2 className="h-4 w-4 mr-2"/>LIMPEZA RÁPIDA
          </Button>
          <ImportOffersDialog onDone={() => qc.invalidateQueries({ queryKey: ["text_offers"] })} />
          <UploadDialog onDone={() => { refetch(); qc.invalidateQueries({ queryKey: ["laminas"] }); }} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <Card className="glass p-4 rounded-2xl"><div className="text-xs text-muted-foreground uppercase tracking-wider">Visualizações</div><div className="font-display text-3xl">{totals.v}</div></Card>
        <Card className="glass p-4 rounded-2xl"><div className="text-xs text-muted-foreground uppercase tracking-wider">Downloads</div><div className="font-display text-3xl">{totals.d}</div></Card>
        <Card className="glass p-4 rounded-2xl"><div className="text-xs text-muted-foreground uppercase tracking-wider">Compartilhamentos</div><div className="font-display text-3xl">{totals.s}</div></Card>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 mb-4">
          <TabsTrigger value="laminas" className="font-display tracking-wider">Lâminas</TabsTrigger>
          <TabsTrigger value="ofertas" className="font-display tracking-wider">Ofertas de texto</TabsTrigger>
          <TabsTrigger value="branding" className="font-display tracking-wider">Branding</TabsTrigger>
          <TabsTrigger value="pdf" className="font-display tracking-wider">PDF semanal</TabsTrigger>
        </TabsList>

        {/* ───── LÂMINAS ───── */}
        <TabsContent value="laminas" className="mt-0">
          <Card className="glass p-3 rounded-2xl mb-4 flex flex-wrap items-center gap-2 sticky top-2 z-30 backdrop-blur-md shadow-md">
            <span className="text-xs uppercase tracking-widest text-muted-foreground font-display mr-1">Período</span>
            {([
              ["active", "Ativas"],
              ["future", "Agendadas"],
              ["expired", "Vencidas"],
              ["all", "Todas"],
            ] as const).map(([k, l]) => (
              <button key={k} type="button" onClick={() => setPeriodFilter(k)}
                className={`px-3 py-1.5 rounded-md border text-xs font-display tracking-wider uppercase transition ${periodFilter === k ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-secondary"}`}>
                {l}
              </button>
            ))}
            <div className="flex-1 min-w-[180px]">
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por título, marca, EAN..." className="h-8" />
            </div>
            <span className="text-xs text-muted-foreground">{filteredLaminas.length} de {laminas.length}</span>
          </Card>

          <div className="space-y-6">
            {grouped.map(({ key, label, items }) => (
              <section key={key}>
                <div className="flex items-baseline gap-3 mb-3">
                  <h2 className="font-display text-xl tracking-widest uppercase">{label}</h2>
                  <span className="text-xs text-muted-foreground">· {items.length} {items.length === 1 ? "lâmina" : "lâminas"}</span>
                  <div className="h-px flex-1 bg-border" />
                </div>
                <div className="grid gap-3">
                  {items.map((l) => {
                    const status = laminaStatus(l);
                    return (
                      <Card key={l.id} data-state={status === "expired" ? "muted" : status === "future" ? "warning" : undefined}
                        className="card-lit-edge glass p-3 flex gap-4 items-center rounded-2xl">
                        <img src={l.image_url} alt="" loading="lazy" className="w-28 h-28 object-cover rounded-lg shrink-0 ring-1 ring-border" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <div className="font-display text-lg truncate">{l.title}</div>
                            <StatusBadge kind={status} />
                            {isNew(l.created_at) && (
                              <span className="px-1.5 py-0.5 rounded bg-accent text-accent-foreground text-[10px] font-display tracking-widest">NOVA</span>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground flex flex-wrap gap-2 items-center mt-1">
                            <Badge variant="outline">{l.branch}</Badge>
                            <Badge variant="secondary">{CATEGORY_LABEL[l.category]}</Badge>
                            {l.industry && <Badge variant="outline">{l.industry}</Badge>}
                            {l.badges.map((b) => <Badge key={b} variant="secondary">{b}</Badge>)}
                            {l.flash_until && new Date(l.flash_until).getTime() > Date.now() && (
                              <Badge className="bg-destructive text-destructive-foreground"><Timer className="h-3 w-3 mr-1"/>Relâmpago</Badge>
                            )}
                            <span>{new Date(l.starts_at).toLocaleDateString("pt-BR")} → {new Date(l.expires_at).toLocaleDateString("pt-BR")}</span>
                          </div>
                          <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1"><Eye className="h-3 w-3"/>{l.view_count}</span>
                            <span className="flex items-center gap-1"><Download className="h-3 w-3"/>{l.download_count}</span>
                            <span className="flex items-center gap-1"><Share2 className="h-3 w-3"/>{l.share_count}</span>
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" title="Mais ações"><MoreVertical className="h-4 w-4"/></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem onClick={() => setEdit(l)}><Pencil className="h-4 w-4 mr-2"/>Editar</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => duplicate(l)}><Copy className="h-4 w-4 mr-2"/>Duplicar</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => remove(l)} className="text-destructive focus:text-destructive">
                              <Trash2 className="h-4 w-4 mr-2"/>Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </Card>
                    );
                  })}
                </div>
              </section>
            ))}
            {laminas.length === 0 && <p className="text-muted-foreground text-center py-8">Nenhuma lâmina ainda. Clique em "Nova lâmina".</p>}
            {laminas.length > 0 && filteredLaminas.length === 0 && (
              <p className="text-muted-foreground text-center py-8">Nenhuma lâmina nesse filtro.</p>
            )}
          </div>
        </TabsContent>

        {/* ───── OFERTAS ───── */}
        <TabsContent value="ofertas" className="mt-0">
          <TextOffersAdminSection />
        </TabsContent>

        {/* ───── BRANDING ───── */}
        <TabsContent value="branding" className="mt-0">
          <BrandingPanel />
        </TabsContent>

        {/* ───── PDF ───── */}
        <TabsContent value="pdf" className="mt-0">
          <Card className="glass p-4 rounded-2xl">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <div className="font-display text-xl tracking-wider">PDF DE AÇÕES DA SEMANA</div>
                <p className="text-xs text-muted-foreground">Gere um resumo em PDF das lâminas ativas por filial.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {["filial01", "filial02", "filial03"].map((b) => (
                  <Button key={b} variant="outline" onClick={() => weeklyPdf(b)} className="font-display tracking-wider">
                    <FileDown className="h-4 w-4 mr-2"/>{b.toUpperCase()}
                  </Button>
                ))}
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      <EditLaminaDialog lamina={edit} onClose={() => setEdit(null)} onSaved={() => { refetch(); qc.invalidateQueries({ queryKey: ["laminas"] }); }} />
    </main>
  );
}

// ───────────────────────────── upload dialog (unchanged) ─────────────────────────────

function UploadDialog({ onDone }: { onDone: () => void }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [industry, setIndustry] = useState("");
  const [branches, setBranches] = useState<string[]>(["filial01"]);
  const [category, setCategory] = useState<LaminaCategory>("campanhas");
  const [badges, setBadges] = useState<string[]>([]);
  const today = new Date().toISOString().slice(0, 10);
  const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
  const [startsAt, setStartsAt] = useState(today);
  const [expiresAt, setExpiresAt] = useState(nextWeek);
  const [flashUntil, setFlashUntil] = useState("");
  const [ean, setEan] = useState("");
  const [priceFrom, setPriceFrom] = useState("");
  const [priceTo, setPriceTo] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);

  const toggleBranch = (b: string) =>
    setBranches((curr) => (curr.includes(b) ? curr.filter((x) => x !== b) : [...curr, b]));

  const addFiles = (list: FileList | File[]) => {
    const arr = Array.from(list).filter((f) => f.type.startsWith("image/"));
    setFiles((curr) => [...curr, ...arr]);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (files.length === 0 || !title || branches.length === 0) return;
    setBusy(true);
    setProgress(0);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const ext = file.name.split(".").pop() || "jpg";
        const path = `${branches[0]}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const up = await supabase.storage.from("laminas").upload(path, file, { contentType: file.type });
        if (up.error) throw up.error;
        const { data: pub } = supabase.storage.from("laminas").getPublicUrl(path);
        const finalTitle = files.length > 1 ? `${title} (${i + 1})` : title;
        const ins = await supabase.from("laminas").insert({
          title: finalTitle,
          description,
          industry: industry || null,
          branch: branches[0] as any,
          branches: branches as any,
          category,
          badges,
          starts_at: new Date(startsAt).toISOString(),
          expires_at: new Date(expiresAt + "T23:59:59").toISOString(),
          flash_until: flashUntil ? new Date(flashUntil).toISOString() : null,
          ean: ean.trim() || null,
          price_from: priceFrom ? Number(priceFrom) : null,
          price_to: priceTo ? Number(priceTo) : null,
          image_url: pub.publicUrl,
          storage_path: path,
          created_by: user?.id,
        } as any);
        if (ins.error) throw ins.error;
        setProgress(i + 1);
      }
      toast.success(`${files.length} lâmina(s) publicada(s) para ${branches.length} filial(is)!`);
      setOpen(false);
      setFiles([]); setTitle(""); setDescription(""); setIndustry(""); setBadges([]); setBranches(["filial01"]); setCategory("campanhas"); setFlashUntil(""); setEan(""); setPriceFrom(""); setPriceTo("");
      onDone();
    } catch (e: any) {
      toast.error("Erro: " + (e.message ?? e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="lg" className="font-display tracking-wider"><Plus className="h-5 w-5 mr-1"/>NOVA LÂMINA</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[95vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="font-display text-2xl">NOVA LÂMINA</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label htmlFor="f">Imagens (arraste ou selecione)</Label>
            <label
              htmlFor="f"
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files); }}
              className={`cursor-pointer mt-1 flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-lg p-6 transition ${dragOver ? "bg-accent/10 border-accent" : "hover:bg-secondary"}`}
            >
              <Upload className="h-6 w-6"/>
              <span className="text-sm text-center">{files.length ? `${files.length} arquivo(s) selecionado(s)` : "Arraste imagens aqui ou clique para selecionar"}</span>
              <span className="text-xs text-muted-foreground">Suporta múltiplos arquivos</span>
            </label>
            <input id="f" type="file" accept="image/*" multiple hidden onChange={(e) => e.target.files && addFiles(e.target.files)} />
            {files.length > 0 && (
              <div className="grid grid-cols-4 gap-2 mt-2">
                {files.map((f, i) => (
                  <div key={i} className="relative">
                    <img src={URL.createObjectURL(f)} alt="" className="w-full h-16 object-cover rounded" />
                    <button type="button" onClick={() => setFiles(files.filter((_, j) => j !== i))} className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-0.5">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div>
            <Label htmlFor="t">Título {files.length > 1 && <span className="text-xs text-muted-foreground">(numerado automaticamente)</span>}</Label>
            <Input id="t" value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>
          <div>
            <Label>Categoria / Referência</Label>
            <div className="flex flex-wrap gap-2 mt-1">
              {CATEGORIES.map((c) => (
                <button type="button" key={c} onClick={() => setCategory(c)}
                  className={`px-3 py-2 rounded-md border text-sm font-display tracking-wider uppercase transition ${category === c ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-secondary"}`}>
                  {CATEGORY_LABEL[c]}
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label>Marca / Indústria</Label>
            <Input value={industry} onChange={(e) => setIndustry(e.target.value)} placeholder="Ex.: Coca-Cola, Ambev, Nestlé..." />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label>EAN</Label>
              <Input inputMode="numeric" value={ean} onChange={(e) => setEan(e.target.value)} placeholder="7891..." />
            </div>
            <div>
              <Label>DE (R$)</Label>
              <Input inputMode="decimal" value={priceFrom} onChange={(e) => setPriceFrom(e.target.value)} placeholder="0,00" />
            </div>
            <div>
              <Label>POR (R$)</Label>
              <Input inputMode="decimal" value={priceTo} onChange={(e) => setPriceTo(e.target.value)} placeholder="0,00" />
            </div>
          </div>
          <div>
            <Label>Descrição da ação</Label>
            <Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Mecânica da promoção..." />
          </div>
          <div>
            <Label>Filiais que receberão</Label>
            <div className="flex flex-wrap gap-3 mt-1">
              {[["filial01","Filial 01"],["filial02","Filial 02"],["filial03","Filial 03"]].map(([v,l]) => (
                <label key={v} className="flex items-center gap-2 text-sm cursor-pointer border rounded-md px-3 py-2">
                  <Checkbox checked={branches.includes(v)} onCheckedChange={() => toggleBranch(v)} />{l}
                </label>
              ))}
            </div>
          </div>
          <div>
            <Label>Selos</Label>
            <div className="flex flex-wrap gap-3 mt-1">
              {BADGES.map((b) => (
                <label key={b} className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox checked={badges.includes(b)} onCheckedChange={(v) => setBadges(v ? [...badges, b] : badges.filter((x) => x !== b))} />{b}
                </label>
              ))}
            </div>
          </div>
          <div>
            <Label className="flex items-center gap-1.5"><CalendarRange className="h-4 w-4"/>Vigência</Label>
            <div className="grid grid-cols-2 gap-3 mt-1">
              <div>
                <Label className="text-xs text-muted-foreground">Início</Label>
                <Input type="date" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Expira em</Label>
                <Input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
              </div>
            </div>
          </div>
          <div>
            <Label className="flex items-center gap-1.5"><Timer className="h-4 w-4"/>Cronômetro relâmpago (opcional)</Label>
            <Input type="datetime-local" value={flashUntil} onChange={(e) => setFlashUntil(e.target.value)} />
            <p className="text-xs text-muted-foreground mt-1">Quando preenchido, o card mostra contagem regressiva e borda pulsante.</p>
          </div>
          <Button type="submit" disabled={busy || files.length === 0 || !title} className="w-full h-12 font-display tracking-wider">
            {busy ? <><Loader2 className="h-5 w-5 animate-spin mr-2"/> {progress}/{files.length}</> : `PUBLICAR ${files.length > 0 ? `(${files.length})` : ""}`}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ───────────────────────────── text offers section ─────────────────────────────

function TextOffersAdminSection() {
  const { profile } = useAuth();
  const { data: offers = [], isLoading } = useTextOffers(profile);
  const del = useDeleteTextOffer();
  const delBatch = useDeleteTextOffersBatch();
  const updateBatch = useUpdateTextOffersBatch();
  const dupBatch = useDuplicateTextOffersBatch();
  const [period, setPeriod] = useState<"active" | "future" | "expired" | "all">("active");
  const [q, setQ] = useState("");
  const [editOffer, setEditOffer] = useState<TextOffer | null>(null);
  const [rescheduleGroup, setRescheduleGroup] = useState<{ ids: string[]; offers: TextOffer[]; mode: "reschedule" | "duplicate" } | null>(null);

  const filteredOffers = useMemo(() => offers.filter((o) => {
    const s = offerStatus(o);
    if (period !== "all" && period !== s) return false;
    if (q.trim()) {
      const t = q.toLowerCase();
      const hay = `${o.description} ${o.brand ?? ""} ${o.ean ?? ""} ${o.codprod ?? ""} ${o.title ?? ""}`.toLowerCase();
      if (!hay.includes(t)) return false;
    }
    return true;
  }), [offers, period, q]);

  const grouped = useMemo(() => {
    const map = new Map<string, TextOffer[]>();
    for (const o of filteredOffers) {
      const d = new Date(o.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
      map.set(key, [...(map.get(key) ?? []), o]);
    }
    return Array.from(map.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [filteredOffers]);

  const removeBatch = async (ids: string[]) => {
    if (!confirm(`Excluir ${ids.length} oferta(s) desta importação?`)) return;
    try { await delBatch.mutateAsync(ids); toast.success("Importação removida."); }
    catch (e: any) { toast.error("Erro: " + (e.message ?? e)); }
  };

  const removeOne = async (id: string, desc: string) => {
    if (!confirm(`Excluir oferta "${desc}"?`)) return;
    try { await del.mutateAsync(id); toast.success("Oferta removida."); }
    catch (e: any) { toast.error("Erro: " + (e.message ?? e)); }
  };

  const buildGroupWhatsappText = (items: TextOffer[]) => {
    const first = items[0];
    const lines: string[] = [];
    lines.push(first.title ? `🎯 *${first.title.toUpperCase()}*` : "🎯 *OFERTAS DA SEMANA*");
    lines.push(`Válido até ${new Date(first.expires_at).toLocaleDateString("pt-BR")}`);
    lines.push("");
    items.forEach((o) => {
      const price = o.price != null ? ` — *R$ ${Number(o.price).toFixed(2).replace(".", ",")}*` : "";
      const brand = o.brand ? ` (${o.brand})` : "";
      lines.push(`• ${o.description}${brand}${price}`);
    });
    lines.push("");
    lines.push("Aproveite! 🛒");
    return lines.join("\n");
  };

  const shareGroupWa = (items: TextOffer[]) => {
    const text = buildGroupWhatsappText(items);
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  const copyGroup = async (items: TextOffer[]) => {
    await navigator.clipboard.writeText(buildGroupWhatsappText(items));
    toast.success("Mensagem completa copiada!");
  };

  return (
    <Card className="glass p-4 rounded-2xl">
      <div className="sticky top-2 z-20 -mx-4 -mt-4 px-4 py-3 mb-4 backdrop-blur-md bg-card/85 border-b border-border/60 rounded-t-2xl">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-accent" />
            <div>
              <div className="font-display text-xl tracking-wider">OFERTAS DE TEXTO IMPORTADAS</div>
              <p className="text-xs text-muted-foreground">{filteredOffers.length} de {offers.length} oferta(s) · agrupadas por importação</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {([
              ["active", "Ativas"],
              ["future", "Agendadas"],
              ["expired", "Vencidas"],
              ["all", "Todas"],
            ] as const).map(([k, l]) => (
              <button key={k} type="button" onClick={() => setPeriod(k)}
                className={`px-2.5 py-1 rounded-md border text-[11px] font-display tracking-wider uppercase transition ${period === k ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-secondary"}`}>
                {l}
              </button>
            ))}
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar..." className="h-8 w-40" />
          </div>
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground py-4">Carregando...</p>
      ) : offers.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">Nenhuma oferta importada ainda. Use o botão "IMPORTAR OFERTAS" acima.</p>
      ) : (
        <div className="space-y-4">
          {grouped.map(([key, items]) => {
            const ids = items.map((i) => i.id);
            const first = items[0];
            const groupStatus = offerStatus(first);
            return (
              <div key={key} data-state={groupStatus === "expired" ? "muted" : groupStatus === "future" ? "warning" : undefined}
                className="card-lit-edge rounded-xl border border-border/60 overflow-hidden">
                <div className="bg-muted/40 px-3 py-2 flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 text-xs flex-wrap">
                    <Badge variant="secondary" className="font-display tracking-wider">{items.length} ofertas</Badge>
                    <StatusBadge kind={groupStatus} />
                    {isNew(first.created_at) && (
                      <span className="px-1.5 py-0.5 rounded bg-accent text-accent-foreground text-[10px] font-display tracking-widest">NOVA</span>
                    )}
                    {first.title && <span className="font-display tracking-wider text-accent">"{first.title}"</span>}
                    <span className="text-muted-foreground">· {new Date(first.created_at).toLocaleString("pt-BR")}</span>
                    <span className="text-muted-foreground">· Filiais: {(first.branches ?? []).join(", ") || first.branch}</span>
                    <span className="text-muted-foreground">· Validade: {new Date(first.expires_at).toLocaleDateString("pt-BR")}</span>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="sm" variant="ghost" className="h-7">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuItem onClick={() => shareGroupWa(items)}>
                        <Send className="h-4 w-4 mr-2"/>Enviar todas no WhatsApp
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => copyGroup(items)}>
                        <Copy className="h-4 w-4 mr-2"/>Copiar mensagem completa
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => setRescheduleGroup({ ids, offers: items, mode: "reschedule" })}>
                        <CalendarRange className="h-4 w-4 mr-2"/>Reagendar validade
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setRescheduleGroup({ ids, offers: items, mode: "duplicate" })}>
                        <Sparkles className="h-4 w-4 mr-2"/>Duplicar para nova vigência
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => removeBatch(ids)} className="text-destructive focus:text-destructive">
                        <Trash2 className="h-4 w-4 mr-2"/>Excluir importação
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="max-h-72 overflow-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-background/50 sticky top-0">
                      <tr className="text-left text-muted-foreground">
                        <th className="p-2">Descrição</th>
                        <th className="p-2">Marca</th>
                        <th className="p-2">EAN</th>
                        <th className="p-2">Estoque</th>
                        <th className="p-2">Preço</th>
                        <th className="p-2 w-10"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((o) => {
                        const s = offerStatus(o);
                        return (
                          <tr key={o.id} className="border-t hover:bg-muted/30">
                            <td className="p-2">
                              <div className="flex items-center gap-2">
                                <span className="font-medium truncate max-w-[280px]">{o.description}</span>
                                {s !== "active" && <StatusBadge kind={s} />}
                              </div>
                            </td>
                            <td className="p-2">{o.brand ?? "—"}</td>
                            <td className="p-2 font-mono">{o.ean ?? "—"}</td>
                            <td className="p-2">{o.stock ?? "—"}</td>
                            <td className="p-2">{o.price != null ? `R$ ${Number(o.price).toFixed(2)}` : "—"}</td>
                            <td className="p-2">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button size="icon" variant="ghost" className="h-7 w-7">
                                    <MoreVertical className="h-3.5 w-3.5" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => setEditOffer(o)}>
                                    <Pencil className="h-4 w-4 mr-2"/>Editar
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => removeOne(o.id, o.description)} className="text-destructive focus:text-destructive">
                                    <Trash2 className="h-4 w-4 mr-2"/>Excluir
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <EditTextOfferDialog offer={editOffer} onClose={() => setEditOffer(null)} />
      <RescheduleGroupDialog
        state={rescheduleGroup}
        onClose={() => setRescheduleGroup(null)}
        onConfirm={async (startsAt, expiresAt) => {
          if (!rescheduleGroup) return;
          try {
            if (rescheduleGroup.mode === "reschedule") {
              await updateBatch.mutateAsync({
                ids: rescheduleGroup.ids,
                patch: { starts_at: startsAt, expires_at: expiresAt },
              });
              toast.success("Vigência atualizada para todo o grupo.");
            } else {
              await dupBatch.mutateAsync({
                offers: rescheduleGroup.offers,
                startsAt,
                expiresAt,
              });
              toast.success(`${rescheduleGroup.offers.length} oferta(s) duplicada(s).`);
            }
            setRescheduleGroup(null);
          } catch (e: any) {
            toast.error("Erro: " + (e.message ?? e));
          }
        }}
      />
    </Card>
  );
}

// ───────────────────────────── edit single offer dialog ─────────────────────────────

function EditTextOfferDialog({ offer, onClose }: { offer: TextOffer | null; onClose: () => void }) {
  const update = useUpdateTextOffer();
  const [description, setDescription] = useState("");
  const [brand, setBrand] = useState("");
  const [ean, setEan] = useState("");
  const [stock, setStock] = useState("");
  const [price, setPrice] = useState("");
  const [title, setTitle] = useState("");
  const [expiresAt, setExpiresAt] = useState("");

  useEffect(() => {
    if (!offer) return;
    setDescription(offer.description);
    setBrand(offer.brand ?? "");
    setEan(offer.ean ?? "");
    setStock(offer.stock?.toString() ?? "");
    setPrice(offer.price?.toString() ?? "");
    setTitle(offer.title ?? "");
    setExpiresAt(offer.expires_at.slice(0, 10));
  }, [offer]);

  const save = async () => {
    if (!offer) return;
    try {
      await update.mutateAsync({
        id: offer.id,
        patch: {
          description,
          brand: brand || null,
          ean: ean || null,
          stock: stock === "" ? null : Number(stock),
          price: price === "" ? null : Number(price),
          title: title || null,
          expires_at: new Date(expiresAt + "T23:59:59").toISOString(),
        },
      });
      toast.success("Oferta atualizada");
      onClose();
    } catch (e: any) {
      toast.error("Erro: " + (e.message ?? e));
    }
  };

  return (
    <Dialog open={!!offer} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle className="font-display text-xl">EDITAR OFERTA</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Título (opcional)</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <Label>Descrição</Label>
            <Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Marca</Label>
              <Input value={brand} onChange={(e) => setBrand(e.target.value)} />
            </div>
            <div>
              <Label>EAN</Label>
              <Input value={ean} onChange={(e) => setEan(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Estoque</Label>
              <Input inputMode="numeric" value={stock} onChange={(e) => setStock(e.target.value)} />
            </div>
            <div>
              <Label>Preço (R$)</Label>
              <Input inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Validade</Label>
            <Input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={save} disabled={update.isPending} className="font-display tracking-wider">
            {update.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2"/> : null}
            SALVAR
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ───────────────────────────── bulk reschedule / duplicate ─────────────────────────────

function RescheduleGroupDialog({
  state, onClose, onConfirm,
}: {
  state: { ids: string[]; offers: TextOffer[]; mode: "reschedule" | "duplicate" } | null;
  onClose: () => void;
  onConfirm: (startsAt: string, expiresAt: string) => void;
}) {
  const [startsAt, setStartsAt] = useState("");
  const [expiresAt, setExpiresAt] = useState("");

  useEffect(() => {
    if (!state) return;
    const first = state.offers[0];
    if (state.mode === "reschedule") {
      setStartsAt(first.starts_at.slice(0, 10));
      setExpiresAt(first.expires_at.slice(0, 10));
    } else {
      const today = new Date().toISOString().slice(0, 10);
      const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
      setStartsAt(today);
      setExpiresAt(nextWeek);
    }
  }, [state]);

  if (!state) return null;
  const isDup = state.mode === "duplicate";

  return (
    <Dialog open={!!state} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            {isDup ? "DUPLICAR PARA NOVA VIGÊNCIA" : "REAGENDAR VIGÊNCIA"}
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          {isDup
            ? `Cria ${state.offers.length} nova(s) oferta(s) com as mesmas informações e a vigência abaixo.`
            : `Aplica a nova vigência a ${state.offers.length} oferta(s) deste grupo.`}
        </p>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label>Início</Label>
            <Input type="date" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
          </div>
          <div>
            <Label>Validade</Label>
            <Input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button
            onClick={() => onConfirm(
              new Date(startsAt).toISOString(),
              new Date(expiresAt + "T23:59:59").toISOString(),
            )}
            className="font-display tracking-wider"
          >
            {isDup ? "DUPLICAR" : "APLICAR"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
