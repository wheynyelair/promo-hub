import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBranding } from "@/lib/branding";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Image as ImageIcon, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";

async function uploadAsset(file: File, kind: "logo" | "cover") {
  const ext = file.name.split(".").pop() || "png";
  const path = `${kind}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from("branding").upload(path, file, { upsert: true, contentType: file.type });
  if (error) throw error;
  const { data } = supabase.storage.from("branding").getPublicUrl(path);
  return data.publicUrl;
}

export function BrandingPanel() {
  const { data: branding, refetch } = useBranding();
  const qc = useQueryClient();
  const [welcome, setWelcome] = useState(branding?.welcome_text ?? "");
  const [busy, setBusy] = useState<string | null>(null);

  const save = async (patch: { logo_url?: string; cover_url?: string; welcome_text?: string }) => {
    const { error } = await supabase.from("branding_settings").update(patch as any).eq("id", true);
    if (error) { toast.error(error.message); return; }
    toast.success("Branding atualizado");
    refetch();
    qc.invalidateQueries({ queryKey: ["branding"] });
  };

  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>, kind: "logo" | "cover") => {
    const f = e.target.files?.[0];
    if (!f) return;
    setBusy(kind);
    try {
      const url = await uploadAsset(f, kind);
      await save({ [`${kind}_url`]: url } as any);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBusy(null);
      e.target.value = "";
    }
  };

  return (
    <Card className="glass p-4 rounded-2xl mb-6">
      <div className="font-display text-xl tracking-wider mb-1">IDENTIDADE VISUAL</div>
      <p className="text-xs text-muted-foreground mb-4">Atualize a logo, capa e a saudação exibidas no portal.</p>
      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Logo (PNG / SVG transparente)</Label>
          <div className="flex items-center gap-3">
            <div className="h-16 w-16 rounded-xl bg-muted flex items-center justify-center overflow-hidden border">
              {branding?.logo_url ? <img src={branding.logo_url} alt="Logo" className="max-h-full max-w-full object-contain"/> : <ImageIcon className="h-6 w-6 text-muted-foreground"/>}
            </div>
            <label className="cursor-pointer">
              <input type="file" accept="image/*" className="hidden" onChange={(e) => onUpload(e, "logo")} />
              <Button asChild variant="outline" size="sm" disabled={busy === "logo"}>
                <span>{busy === "logo" ? <Loader2 className="h-4 w-4 animate-spin"/> : <><Upload className="h-4 w-4 mr-2"/>Enviar logo</>}</span>
              </Button>
            </label>
          </div>
        </div>
        <div className="space-y-2">
          <Label>Capa (banner do topo)</Label>
          <div className="flex items-center gap-3">
            <div className="h-16 w-28 rounded-xl bg-muted overflow-hidden border">
              {branding?.cover_url ? <img src={branding.cover_url} alt="Capa" className="w-full h-full object-cover"/> : null}
            </div>
            <label className="cursor-pointer">
              <input type="file" accept="image/*" className="hidden" onChange={(e) => onUpload(e, "cover")} />
              <Button asChild variant="outline" size="sm" disabled={busy === "cover"}>
                <span>{busy === "cover" ? <Loader2 className="h-4 w-4 animate-spin"/> : <><Upload className="h-4 w-4 mr-2"/>Enviar capa</>}</span>
              </Button>
            </label>
          </div>
        </div>
      </div>
      <div className="mt-4 space-y-2">
        <Label>Mensagem de boas-vindas (login)</Label>
        <div className="flex gap-2">
          <Input value={welcome} onChange={(e) => setWelcome(e.target.value)} placeholder="Portal de Vendas" />
          <Button onClick={() => save({ welcome_text: welcome })}>Salvar</Button>
        </div>
      </div>
    </Card>
  );
}
