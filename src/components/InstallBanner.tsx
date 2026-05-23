import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, X, Share } from "lucide-react";

const KEY = "dam_install_dismissed_v1";

export function InstallBanner() {
  const [show, setShow] = useState(false);
  const [evt, setEvt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem(KEY)) return;
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (window.navigator as any).standalone;
    if (standalone) return;
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(ios);
    const onPrompt = (e: any) => { e.preventDefault(); setEvt(e); setShow(true); };
    window.addEventListener("beforeinstallprompt", onPrompt);
    if (ios) setShow(true);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (!show) return null;
  const dismiss = () => { localStorage.setItem(KEY, "1"); setShow(false); };
  const install = async () => {
    if (evt) { evt.prompt(); await evt.userChoice; dismiss(); }
  };

  return (
    <div className="fixed bottom-20 md:bottom-4 inset-x-3 md:inset-x-auto md:right-4 md:max-w-sm z-40 glass-strong rounded-2xl shadow-elevated p-3 flex items-center gap-3 animate-fade-in">
      <Download className="h-5 w-5 text-accent shrink-0" />
      <div className="flex-1 text-xs">
        <div className="font-display tracking-wider text-sm">INSTALAR APP</div>
        {isIOS ? (
          <div className="text-muted-foreground">Toque em <Share className="h-3 w-3 inline mx-0.5"/> e em "Adicionar à Tela de Início".</div>
        ) : (
          <div className="text-muted-foreground">Acesso instantâneo na tela inicial.</div>
        )}
      </div>
      {!isIOS && <Button size="sm" onClick={install} className="font-display tracking-wider">Instalar</Button>}
      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={dismiss}><X className="h-4 w-4"/></Button>
    </div>
  );
}
