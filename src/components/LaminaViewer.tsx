import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Download, Share2, Sparkles, Loader2, Copy, HelpCircle } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { logEvent, useBranchSettings, type Lamina } from "@/lib/laminas";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { DuvidaDialog } from "./DuvidaDialog";

export function LaminaViewer({ lamina, onClose }: { lamina: Lamina | null; onClose: () => void }) {
  const { user, profile } = useAuth();
  const { data: branchSettings = [] } = useBranchSettings();
  const [duvidaOpen, setDuvidaOpen] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [watermark, setWatermark] = useState(true);
  const [wmText, setWmText] = useState("");
  const [busy, setBusy] = useState(false);
  const [copy, setCopy] = useState("");
  const [genBusy, setGenBusy] = useState(false);

  useEffect(() => {
    if (lamina && user) {
      logEvent(lamina.id, "view", user.id);
      setWmText(profile?.phone || profile?.display_name || lamina.branch.toUpperCase());
      setCopy("");
    }
  }, [lamina, user, profile]);

  if (!lamina) return null;

  const renderCanvas = async (): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const c = canvasRef.current ?? document.createElement("canvas");
        c.width = img.naturalWidth;
        c.height = img.naturalHeight;
        const ctx = c.getContext("2d")!;
        ctx.drawImage(img, 0, 0);
        if (watermark && wmText) {
          const fs = Math.max(28, Math.floor(c.width / 28));
          ctx.font = `700 ${fs}px Barlow, sans-serif`;
          const padding = fs * 0.6;
          const textW = ctx.measureText(wmText).width;
          const boxW = textW + padding * 2;
          const boxH = fs + padding;
          const x = c.width - boxW - 20;
          const y = c.height - boxH - 20;
          ctx.fillStyle = "rgba(15,27,61,0.85)";
          ctx.fillRect(x, y, boxW, boxH);
          ctx.fillStyle = "#fff";
          ctx.textBaseline = "middle";
          ctx.fillText(wmText, x + padding, y + boxH / 2);
        }
        c.toBlob((b) => (b ? resolve(b) : reject(new Error("blob fail"))), "image/jpeg", 0.92);
      };
      img.onerror = () => reject(new Error("img fail"));
      img.src = lamina.image_url + (lamina.image_url.includes("?") ? "&" : "?") + "t=" + Date.now();
    });
  };

  const download = async () => {
    setBusy(true);
    try {
      const blob = await renderCanvas();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${lamina.title.replace(/\s+/g, "-")}.jpg`;
      a.click();
      URL.revokeObjectURL(url);
      logEvent(lamina.id, "download", user?.id);
      toast.success("Imagem baixada!");
    } catch (e) {
      toast.error("Falha ao baixar");
    } finally {
      setBusy(false);
    }
  };

  const shareWhatsApp = async () => {
    setBusy(true);
    try {
      const blob = await renderCanvas();
      const file = new File([blob], `${lamina.title}.jpg`, { type: "image/jpeg" });
      const text = copy || `${lamina.title}${lamina.description ? "\n" + lamina.description : ""}`;
      logEvent(lamina.id, "share", user?.id);
      const nav: any = navigator;
      if (nav.canShare && nav.canShare({ files: [file] })) {
        await nav.share({ files: [file], text, title: lamina.title });
      } else {
        const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
        window.open(url, "_blank");
        await download();
        toast.info("Texto enviado pro WhatsApp. Anexe a imagem baixada.");
      }
    } catch (e) {
      // user cancelled
    } finally {
      setBusy(false);
    }
  };

  const generateCopy = async () => {
    setGenBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-copy", {
        body: { title: lamina.title, description: lamina.description, badges: lamina.badges },
      });
      if (error) throw error;
      if ((data as any)?.error) {
        toast.error((data as any).error);
      } else {
        setCopy((data as any).text);
      }
    } catch (e: any) {
      toast.error("Falha na IA: " + (e.message ?? e));
    } finally {
      setGenBusy(false);
    }
  };

  return (
    <Dialog open={!!lamina} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[95vh] overflow-y-auto p-0">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle className="font-display text-2xl tracking-wide">{lamina.title}</DialogTitle>
        </DialogHeader>
        <div className="px-6 pb-6 space-y-4">
          <div className="relative bg-muted rounded-lg overflow-hidden">
            <img src={lamina.image_url} alt={lamina.title} decoding="async" fetchPriority="high" className="w-full h-auto" />
            {watermark && wmText && (
              <div className="absolute bottom-4 right-4 bg-sidebar/85 text-sidebar-foreground px-3 py-1.5 rounded font-semibold text-sm shadow-elevated">{wmText}</div>
            )}
          </div>
          {lamina.description && <p className="text-sm text-muted-foreground whitespace-pre-line">{lamina.description}</p>}

          <div className="rounded-lg border p-3 bg-secondary/50">
            <div className="flex items-center justify-between mb-2">
              <Label className="flex items-center gap-2 cursor-pointer">
                <Switch checked={watermark} onCheckedChange={setWatermark} />
                Marca d'água
              </Label>
            </div>
            {watermark && (
              <Input value={wmText} onChange={(e) => setWmText(e.target.value)} placeholder="Telefone, nome ou logo da filial" />
            )}
          </div>

          <div className="rounded-lg border p-3 space-y-2">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-accent"/>Copy de WhatsApp</Label>
              <Button size="sm" variant="ghost" onClick={generateCopy} disabled={genBusy}>
                {genBusy ? <Loader2 className="h-4 w-4 animate-spin"/> : "Gerar com IA"}
              </Button>
            </div>
            <textarea
              value={copy}
              onChange={(e) => setCopy(e.target.value)}
              rows={4}
              placeholder="Clique em 'Gerar com IA' ou digite seu próprio texto..."
              className="w-full text-sm rounded border bg-background p-2 resize-none"
            />
            {copy && (
              <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(copy); toast.success("Copiado!"); }}>
                <Copy className="h-3 w-3 mr-1"/>Copiar texto
              </Button>
            )}
          </div>

          {(() => {
            const mgr = branchSettings.find((b) => b.branch === lamina.branch);
            if (!mgr?.manager_phone) return null;
            return (
              <Button type="button" variant="outline" className="w-full" size="sm" onClick={() => setDuvidaOpen(true)}>
                <HelpCircle className="h-4 w-4 mr-2"/>Tirar dúvida com {mgr.manager_name ?? "gestor"}
              </Button>
            );
          })()}

          <div className="grid grid-cols-2 gap-2 sticky bottom-0 bg-background pt-2">
            <Button onClick={download} disabled={busy} size="lg" className="h-14 font-display tracking-wider text-base">
              <Download className="h-5 w-5 mr-2"/>BAIXAR
            </Button>
            <Button onClick={shareWhatsApp} disabled={busy} size="lg" className="h-14 font-display tracking-wider text-base bg-success hover:bg-success/90 text-white">
              <Share2 className="h-5 w-5 mr-2"/>WHATSAPP
            </Button>
          </div>
          <canvas ref={canvasRef} className="hidden" />
        </div>
      </DialogContent>
      {(() => {
        const mgr = branchSettings.find((b) => b.branch === lamina.branch);
        return (
          <DuvidaDialog
            lamina={duvidaOpen ? lamina : null}
            onClose={() => setDuvidaOpen(false)}
            managerName={mgr?.manager_name}
            managerPhone={mgr?.manager_phone}
            rcaName={profile?.display_name}
          />
        );
      })()}
    </Dialog>
  );
}
