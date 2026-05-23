import { useState } from "react";
import * as XLSX from "@e965/xlsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { FileSpreadsheet, Upload, Loader2, X, Download, Database, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useUpsertPriceBase, type PriceBaseRow } from "@/lib/price-base";
import { toast } from "sonner";

interface ParsedRow {
  codprod: string | null;
  ean: string | null;
  description: string;
  brand: string | null;
  stock: number | null;
  price: number | null;
}

const HEADERS_MAP: Record<string, keyof ParsedRow> = {
  codprod: "codprod", cod: "codprod", codigo: "codprod", "código": "codprod",
  ean: "ean", "códigodebarras": "ean",
  descricao: "description", "descrição": "description", produto: "description",
  marca: "brand",
  estoque: "stock", qtd: "stock", quantidade: "stock",
  preco: "price", "preço": "price", valor: "price",
};

const norm = (s: string) => String(s ?? "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "");

function parseNumber(v: unknown): number | null {
  if (v == null || v === "") return null;
  if (typeof v === "number") return v;
  let s = String(v).replace(/[^\d.,-]/g, "").trim();
  const hasComma = s.includes(","), hasDot = s.includes(".");
  if (hasComma && hasDot) s = s.replace(/\./g, "").replace(",", ".");
  else if (hasComma) s = s.replace(",", ".");
  const n = Number(s);
  return isFinite(n) ? n : null;
}

function readWorkbook(file: File): Promise<Record<string, unknown>[]> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = (e) => {
      try {
        const wb = XLSX.read(e.target?.result, { type: "binary" });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        resolve(XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null }));
      } catch (err) { reject(err); }
    };
    r.onerror = () => reject(r.error);
    r.readAsBinaryString(file);
  });
}

async function parseOffers(file: File): Promise<ParsedRow[]> {
  const rows = await readWorkbook(file);
  return rows.map((r) => {
    const out: any = { codprod: null, ean: null, description: "", brand: null, stock: null, price: null };
    for (const [k, v] of Object.entries(r)) {
      const target = HEADERS_MAP[norm(k)];
      if (!target) continue;
      if (target === "stock") out.stock = v == null || v === "" ? null : Number(String(v).replace(/[^\d-]/g, ""));
      else if (target === "price") out.price = parseNumber(v);
      else out[target] = v == null ? null : String(v).trim();
    }
    return out;
  }).filter((r) => r.description && r.description.length > 0);
}

const BASE_FIELDS = ["codfilial", "codprod", "ean", "descricao", "departamento", "linha", "marca", "secao", "ptabela", "preco_final"];
const BASE_ALIASES: Record<string, string> = {
  codfilial: "codfilial", filial: "codfilial",
  codprod: "codprod", codigo: "codprod", "código": "codprod",
  ean: "ean", "códigodebarras": "ean",
  descricao: "descricao", "descrição": "descricao", produto: "descricao",
  departamento: "departamento", depto: "departamento",
  linha: "linha",
  marca: "marca",
  secao: "secao", "seção": "secao",
  ptabela: "ptabela", "preçotabela": "ptabela", "preco_tabela": "ptabela", precotabela: "ptabela",
  preco_final: "preco_final", precofinal: "preco_final", "preçofinal": "preco_final", "preço_final": "preco_final",
};

const BRANCH_BY_CODFILIAL: Record<string, string> = {
  "1": "filial01", "01": "filial01", "filial01": "filial01",
  "2": "filial02", "02": "filial02", "filial02": "filial02",
  "3": "filial03", "03": "filial03", "filial03": "filial03",
};

async function parseBase(file: File): Promise<Partial<PriceBaseRow>[]> {
  const rows = await readWorkbook(file);
  const out: Partial<PriceBaseRow>[] = [];
  for (const r of rows) {
    const o: any = {};
    for (const [k, v] of Object.entries(r)) {
      const t = BASE_ALIASES[norm(k)];
      if (!t) continue;
      if (t === "ptabela" || t === "preco_final") o[t] = parseNumber(v);
      else o[t] = v == null ? null : String(v).trim();
    }
    if (!o.codprod || !o.descricao || !o.codfilial) continue;
    o.codfilial = String(o.codfilial).trim();
    o.branch = BRANCH_BY_CODFILIAL[o.codfilial.toLowerCase()] ?? null;
    out.push(o);
  }
  return out;
}

export function ImportOffersDialog({ onDone }: { onDone: () => void }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const upsertBase = useUpsertPriceBase();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="lg" variant="outline" className="font-display tracking-wider">
          <FileSpreadsheet className="h-5 w-5 mr-1" />IMPORTAR PLANILHA
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">IMPORTAR PLANILHA</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="avulsa" className="w-full">
          <TabsList className="w-full grid grid-cols-2 h-auto">
            <TabsTrigger value="base" className="flex flex-col items-start gap-0.5 py-2 text-left h-auto">
              <span className="flex items-center gap-2"><Database className="h-4 w-4" />Base Geral (Tabela Mãe)</span>
              <span className="text-[10px] opacity-70 font-normal">Referência de produtos por filial</span>
            </TabsTrigger>
            <TabsTrigger value="avulsa" className="flex flex-col items-start gap-0.5 py-2 text-left h-auto">
              <span className="flex items-center gap-2"><Sparkles className="h-4 w-4" />Promoção Avulsa</span>
              <span className="text-[10px] opacity-70 font-normal">Condições temporárias / laboratório</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="base" className="mt-4">
            <BaseImporter onDone={async (rows) => {
              try {
                await upsertBase.mutateAsync(rows.map((r) => ({ ...r, updated_by: user?.id })));
                toast.success(`${rows.length} linha(s) atualizadas na Base Mãe.`);
                setOpen(false); onDone();
              } catch (err: any) { toast.error("Erro: " + (err.message ?? err)); }
            }} busy={upsertBase.isPending} />
          </TabsContent>

          <TabsContent value="avulsa" className="mt-4">
            <AvulsaImporter onDone={() => { setOpen(false); onDone(); }} userId={user?.id} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================
// BASE MÃE
// ============================================================
function BaseImporter({ onDone, busy }: { onDone: (rows: Partial<PriceBaseRow>[]) => void; busy: boolean }) {
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<Partial<PriceBaseRow>[]>([]);
  const [parsing, setParsing] = useState(false);

  const handleFile = async (f: File) => {
    setFile(f); setParsing(true);
    try {
      const parsed = await parseBase(f);
      if (parsed.length === 0) {
        toast.error("Nenhuma linha válida. Confira colunas CODFILIAL, CODPROD, DESCRICAO.");
        setRows([]);
      } else {
        setRows(parsed);
        toast.success(`${parsed.length} linha(s) prontas para atualizar.`);
      }
    } catch (err: any) { toast.error("Falha: " + (err.message ?? err)); setRows([]); }
    finally { setParsing(false); }
  };

  const downloadExample = () => {
    const sample = [
      { CODFILIAL: "01", CODPROD: "12345", EAN: "7891000100103", DESCRICAO: "DIPIRONA 500MG CX 20CP", DEPARTAMENTO: "Genérico", LINHA: "Analgésico", MARCA: "EMS", SECAO: "Medicamentos", PTABELA: 12.50, PRECO_FINAL: 8.99 },
      { CODFILIAL: "02", CODPROD: "67890", EAN: "7891910000197", DESCRICAO: "PARACETAMOL 750MG CX 20CP", DEPARTAMENTO: "Genérico", LINHA: "Analgésico", MARCA: "Medley", SECAO: "Medicamentos", PTABELA: 15.90, PRECO_FINAL: 11.49 },
    ];
    const ws = XLSX.utils.json_to_sheet(sample);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "BaseMae");
    XLSX.writeFile(wb, "exemplo-base-mae.xlsx");
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-dashed p-3 bg-muted/30 text-xs text-muted-foreground">
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className="font-display tracking-wider text-foreground">Colunas obrigatórias:</span>
          <Button type="button" size="sm" variant="ghost" className="h-7 text-xs" onClick={downloadExample}>
            <Download className="h-3 w-3 mr-1" />Exemplo
          </Button>
        </div>
        <code className="block">{BASE_FIELDS.join(" · ").toUpperCase()}</code>
        <div className="mt-1">Atualiza a Tabela Mãe (substitui linhas com mesmo CODFILIAL+CODPROD). Não apaga promoções avulsas.</div>
      </div>

      <label className="cursor-pointer flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-lg p-6 hover:bg-secondary transition">
        <Upload className="h-6 w-6" />
        <span className="text-sm">{file ? file.name : "Selecionar planilha da Base Mãe"}</span>
        <input type="file" accept=".csv,.xlsx,.xls" hidden onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
      </label>

      {parsing && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Analisando...</div>}

      {rows.length > 0 && (
        <>
          <div className="flex items-center justify-between">
            <Badge variant="secondary" className="font-display tracking-wider">{rows.length} produtos</Badge>
            <Button variant="ghost" size="sm" onClick={() => { setRows([]); setFile(null); }}><X className="h-4 w-4 mr-1" />Trocar</Button>
          </div>
          <div className="rounded-lg border max-h-60 overflow-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/50 sticky top-0">
                <tr><th className="text-left p-2">Filial</th><th className="text-left p-2">CodProd</th><th className="text-left p-2">Descrição</th><th className="text-right p-2">PTabela</th><th className="text-right p-2">Líquido</th></tr>
              </thead>
              <tbody>
                {rows.slice(0, 50).map((r, i) => (
                  <tr key={i} className="border-t">
                    <td className="p-2 font-mono">{r.codfilial}</td>
                    <td className="p-2 font-mono">{r.codprod}</td>
                    <td className="p-2 truncate max-w-[200px]">{r.descricao}</td>
                    <td className="p-2 text-right tabular-nums">{r.ptabela?.toFixed(2) ?? "—"}</td>
                    <td className="p-2 text-right tabular-nums">{r.preco_final?.toFixed(2) ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length > 50 && <div className="p-2 text-center text-muted-foreground text-[10px]">+ {rows.length - 50} linhas</div>}
          </div>

          <Button onClick={() => onDone(rows)} disabled={busy} size="lg" className="w-full font-display tracking-wider">
            {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Database className="h-4 w-4 mr-2" />}
            ATUALIZAR BASE MÃE ({rows.length})
          </Button>
        </>
      )}
    </div>
  );
}

// ============================================================
// PROMOÇÃO AVULSA (fluxo original)
// ============================================================
function AvulsaImporter({ onDone, userId }: { onDone: () => void; userId?: string }) {
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [branches, setBranches] = useState<string[]>(["filial01"]);
  const today = new Date().toISOString().slice(0, 10);
  const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
  const [startsAt, setStartsAt] = useState(today);
  const [expiresAt, setExpiresAt] = useState(nextWeek);
  const [title, setTitle] = useState("");
  const [flashEnabled, setFlashEnabled] = useState(false);
  const [flashUntil, setFlashUntil] = useState("");

  const handleFile = async (f: File) => {
    setFile(f); setParsing(true);
    try {
      const parsed = await parseOffers(f);
      if (parsed.length === 0) { toast.error("Nenhuma linha válida. Confira a coluna Descrição."); setRows([]); }
      else { setRows(parsed); toast.success(`${parsed.length} linha(s) encontrada(s).`); }
    } catch (err: any) { toast.error("Falha: " + (err.message ?? err)); setRows([]); }
    finally { setParsing(false); }
  };

  const toggleBranch = (b: string) =>
    setBranches((c) => (c.includes(b) ? c.filter((x) => x !== b) : [...c, b]));

  const submit = async () => {
    if (rows.length === 0 || branches.length === 0) return;
    setBusy(true);
    try {
      const flashIso = flashEnabled && flashUntil ? new Date(flashUntil).toISOString() : null;
      const payload = rows.map((r) => ({
        ...r, branch: branches[0], branches,
        title: title.trim() || null, flash_until: flashIso,
        starts_at: new Date(startsAt).toISOString(),
        expires_at: new Date(expiresAt + "T23:59:59").toISOString(),
        created_by: userId,
      }));
      const { error } = await supabase.from("text_offers" as any).insert(payload as any);
      if (error) throw error;
      toast.success(`${rows.length} promoção(ões) importada(s)!`);
      onDone();
    } catch (err: any) { toast.error("Erro: " + (err.message ?? err)); }
    finally { setBusy(false); }
  };

  const downloadExample = () => {
    const sample = [
      { Codprod: "12345", EAN: "7891000100103", "Descrição": "DIPIRONA 500MG CX 20CP", Marca: "EMS", Estoque: 240, "Preço": 7.49 },
      { Codprod: "67890", EAN: "7891910000197", "Descrição": "PARACETAMOL 750MG CX 20CP", Marca: "Medley", Estoque: 80, "Preço": 9.90 },
    ];
    const ws = XLSX.utils.json_to_sheet(sample);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Avulsa");
    XLSX.writeFile(wb, "exemplo-promocao-avulsa.xlsx");
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-dashed p-3 bg-muted/30 text-xs text-muted-foreground">
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className="font-display tracking-wider text-foreground">Colunas aceitas:</span>
          <Button type="button" size="sm" variant="ghost" className="h-7 text-xs" onClick={downloadExample}>
            <Download className="h-3 w-3 mr-1" />Exemplo
          </Button>
        </div>
        <code>Codprod · EAN · Descrição · Marca · Estoque · Preço</code>
        <div className="mt-1">Cria condições comerciais temporárias por EAN. Não altera a Base Mãe.</div>
      </div>

      <label className="cursor-pointer flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-lg p-6 hover:bg-secondary transition">
        <Upload className="h-6 w-6" />
        <span className="text-sm">{file ? file.name : "Selecionar planilha de promoção"}</span>
        <input type="file" accept=".csv,.xlsx,.xls" hidden onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
      </label>

      {parsing && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Analisando...</div>}

      {rows.length > 0 && (
        <>
          <div className="flex items-center justify-between">
            <Badge variant="secondary" className="font-display tracking-wider">{rows.length} ofertas</Badge>
            <Button variant="ghost" size="sm" onClick={() => { setRows([]); setFile(null); }}><X className="h-4 w-4 mr-1" />Trocar</Button>
          </div>

          <div>
            <Label>Título da promoção (opcional)</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Mega Promo Maio" maxLength={120} />
          </div>

          <div>
            <Label>Filiais</Label>
            <div className="flex flex-wrap gap-3 mt-1">
              {[["filial01", "Filial 01"], ["filial02", "Filial 02"], ["filial03", "Filial 03"]].map(([v, l]) => (
                <label key={v} className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={branches.includes(v)} onChange={() => toggleBranch(v)} />
                  <span className="text-sm">{l}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div><Label>Início</Label><Input type="date" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} /></div>
            <div><Label>Validade</Label><Input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} /></div>
          </div>

          <div className="rounded-lg border p-3 space-y-2 bg-muted/20">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={flashEnabled} onChange={(e) => {
                setFlashEnabled(e.target.checked);
                if (e.target.checked && !flashUntil) {
                  const d = new Date(Date.now() + 6 * 3600 * 1000);
                  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
                  setFlashUntil(d.toISOString().slice(0, 16));
                }
              }} />
              <span className="text-sm font-display tracking-wider">⚡ Oferta relâmpago</span>
            </label>
            {flashEnabled && (
              <Input type="datetime-local" value={flashUntil} onChange={(e) => setFlashUntil(e.target.value)} />
            )}
          </div>

          <Button onClick={submit} disabled={busy || branches.length === 0} size="lg" className="w-full font-display tracking-wider">
            {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
            IMPORTAR {rows.length} OFERTA(S)
          </Button>
        </>
      )}
    </div>
  );
}
