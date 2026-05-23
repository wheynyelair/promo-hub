import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { CATEGORIES, CATEGORY_LABEL, type Lamina, type LaminaCategory } from "@/lib/laminas";

const BADGES = ["Urgente", "Estoque Baixo", "Últimas Horas"];

export function EditLaminaDialog({ lamina, onClose, onSaved }: { lamina: Lamina | null; onClose: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [industry, setIndustry] = useState("");
  const [category, setCategory] = useState<LaminaCategory>("diversos");
  const [badges, setBadges] = useState<string[]>([]);
  const [startsAt, setStartsAt] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [flashUntil, setFlashUntil] = useState("");
  const [ean, setEan] = useState("");
  const [priceFrom, setPriceFrom] = useState("");
  const [priceTo, setPriceTo] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!lamina) return;
    setTitle(lamina.title);
    setDescription(lamina.description ?? "");
    setIndustry(lamina.industry ?? "");
    setCategory(lamina.category);
    setBadges(lamina.badges);
    setStartsAt(new Date(lamina.starts_at).toISOString().slice(0, 10));
    setExpiresAt(new Date(lamina.expires_at).toISOString().slice(0, 10));
    setFlashUntil(lamina.flash_until ? new Date(lamina.flash_until).toISOString().slice(0, 16) : "");
    setEan(lamina.ean ?? "");
    setPriceFrom(lamina.price_from != null ? String(lamina.price_from) : "");
    setPriceTo(lamina.price_to != null ? String(lamina.price_to) : "");
    setFile(null);
  }, [lamina]);

  if (!lamina) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const patch: any = {
        title,
        description,
        industry: industry || null,
        category,
        badges,
        starts_at: new Date(startsAt).toISOString(),
        expires_at: new Date(expiresAt + "T23:59:59").toISOString(),
        flash_until: flashUntil ? new Date(flashUntil).toISOString() : null,
        ean: ean.trim() || null,
        price_from: priceFrom ? Number(priceFrom) : null,
        price_to: priceTo ? Number(priceTo) : null,
      };
      if (file) {
        const ext = file.name.split(".").pop() || "jpg";
        const path = `${lamina.branch}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const up = await supabase.storage.from("laminas").upload(path, file, { contentType: file.type });
        if (up.error) throw up.error;
        const { data: pub } = supabase.storage.from("laminas").getPublicUrl(path);
        await supabase.storage.from("laminas").remove([lamina.storage_path]);
        patch.image_url = pub.publicUrl;
        patch.storage_path = path;
      }
      const { error } = await supabase.from("laminas").update(patch).eq("id", lamina.id);
      if (error) throw error;
      toast.success("Lâmina atualizada!");
      onSaved();
      onClose();
    } catch (e: any) {
      toast.error("Erro: " + (e.message ?? e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={!!lamina} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[95vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="font-display text-2xl">EDITAR LÂMINA</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <img src={lamina.image_url} alt="" className="max-h-40 rounded mx-auto" />
          <div>
            <Label htmlFor="ef">Trocar imagem (opcional)</Label>
            <label htmlFor="ef" className="cursor-pointer mt-1 flex items-center justify-center gap-2 border-2 border-dashed rounded-lg p-3 hover:bg-secondary transition text-sm">
              <Upload className="h-4 w-4" />{file ? file.name : "Selecionar nova imagem"}
            </label>
            <input id="ef" type="file" accept="image/*" hidden onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </div>
          <div>
            <Label>Título</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>
          <div>
            <Label>Categoria</Label>
            <div className="flex flex-wrap gap-2 mt-1">
              {CATEGORIES.map((c) => (
                <button type="button" key={c} onClick={() => setCategory(c)}
                  className={`px-3 py-2 rounded-md border text-sm font-display tracking-wider uppercase ${category === c ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-secondary"}`}>
                  {CATEGORY_LABEL[c]}
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label>Marca / Indústria</Label>
            <Input value={industry} onChange={(e) => setIndustry(e.target.value)} />
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
            <Label>Descrição</Label>
            <Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div>
            <Label>Selos</Label>
            <div className="flex flex-wrap gap-3 mt-1">
              {BADGES.map((b) => (
                <label key={b} className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox checked={badges.includes(b)} onCheckedChange={(v) => setBadges(v ? [...badges, b] : badges.filter((x) => x !== b))} />
                  {b}
                </label>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Início</Label>
              <Input type="date" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
            </div>
            <div>
              <Label>Expira em</Label>
              <Input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Cronômetro relâmpago (opcional)</Label>
            <Input type="datetime-local" value={flashUntil} onChange={(e) => setFlashUntil(e.target.value)} />
            <p className="text-xs text-muted-foreground mt-1">Quando preenchido, mostra contagem regressiva e borda pulsante até a data informada.</p>
          </div>
          <Button type="submit" disabled={busy} className="w-full h-12 font-display tracking-wider">
            {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : "SALVAR ALTERAÇÕES"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
