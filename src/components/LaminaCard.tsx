import { useEffect, useState } from "react";
import { Eye, Download, Copy, Calendar, Tag, Pencil, Timer, Share2, Target, HelpCircle, Star } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CATEGORY_LABEL, isFuture, logEvent, type Lamina } from "@/lib/laminas";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

const BADGE_STYLES: Record<string, string> = {
  Urgente: "bg-urgent text-white",
  "Estoque Baixo": "bg-warning text-foreground",
  "Últimas Horas": "bg-destructive text-destructive-foreground animate-pulse",
};

const fmt = (d: string) => new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });

function useCountdown(target: string | null) {
  const [text, setText] = useState<string>("");
  useEffect(() => {
    if (!target) return;
    const tick = () => {
      const diff = new Date(target).getTime() - Date.now();
      if (diff <= 0) { setText("ENCERRADO"); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setText(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [target]);
  return text;
}

interface Props {
  lamina: Lamina;
  onOpen: () => void;
  isAdmin?: boolean;
  onEdit?: () => void;
  onAskDoubt?: () => void;
  variant?: "promo" | "campaign";
  remnantOf?: string | null;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  lastSharedLabel?: string | null;
}

export function LaminaCard({ lamina, onOpen, isAdmin, onEdit, onAskDoubt, variant = "promo", remnantOf, isFavorite, onToggleFavorite, lastSharedLabel }: Props) {
  const { user } = useAuth();
  const now = Date.now();
  const start = new Date(lamina.starts_at).getTime();
  const end = new Date(lamina.expires_at).getTime();
  const total = Math.max(1, end - start);
  const elapsed = Math.min(total, Math.max(0, now - start));
  const progress = Math.round((1 - elapsed / total) * 100); // remaining %
  const daysLeft = Math.ceil((end - now) / 86400000);
  const ending = daysLeft >= 0 && daysLeft <= 2;
  const isNew = now - new Date(lamina.created_at).getTime() < 24 * 3600 * 1000;
  const future = isFuture(lamina);
  const expired = end < now;
  const flashActive = lamina.flash_until && new Date(lamina.flash_until).getTime() > now;
  const countdown = useCountdown(flashActive ? lamina.flash_until : null);

  const edgeState = expired ? "muted" : flashActive || progress <= 15 ? "danger" : ending || progress <= 40 ? "warning" : undefined;

  const buildText = () =>
    `*${lamina.title}*\n\n${lamina.description ?? ""}\n\n📅 Válido de ${fmt(lamina.starts_at)} a ${fmt(lamina.expires_at)}`;

  const copy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(buildText());
    toast.success("Texto copiado!");
  };

  const shareWa = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (expired) {
      toast.error("Promoção encerrada — não pode ser compartilhada.");
      return;
    }
    logEvent(lamina.id, "share", user?.id);
    const url = `https://wa.me/?text=${encodeURIComponent(buildText() + "\n\n" + lamina.image_url)}`;
    window.open(url, "_blank");
  };

  const toggleFav = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleFavorite?.();
  };

  const FavButton = onToggleFavorite ? (
    <Button
      type="button"
      size="icon"
      variant="ghost"
      onClick={toggleFav}
      aria-label={isFavorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}
      className={`h-8 w-8 backdrop-blur-sm bg-background/70 hover:bg-background ${isFavorite ? "text-amber-500" : "text-muted-foreground"}`}
    >
      <Star className={`h-4 w-4 ${isFavorite ? "fill-amber-500" : ""}`} />
    </Button>
  ) : null;

  // Vigência progress bar — fixed at top of card
  const ProgressBar = (
    <div className="absolute top-0 left-0 right-0 h-1 bg-border/40 z-10">
      <div
        className={`h-full transition-all ${progress <= 15 ? "bg-destructive" : progress <= 40 ? "bg-warning" : "bg-success"}`}
        style={{ width: `${progress}%` }}
      />
    </div>
  );

  // ---------- CAMPAIGN VARIANT (horizontal, rule-summary first) ----------
  if (variant === "campaign") {
    return (
      <Card
        onClick={onOpen}
        data-state={edgeState}
        className={`card-lit-edge relative overflow-hidden glass shadow-card hover:shadow-elevated transition-all duration-300 cursor-pointer group p-0 gap-0 rounded-2xl border-border/60 hover:scale-[1.01] hover:ring-2 hover:ring-accent/60 ${flashActive ? "pulse-border" : ""}`}
      >
        {ProgressBar}
        <div className="grid grid-cols-[140px_1fr] sm:grid-cols-[180px_1fr]">
          <div className="relative bg-muted">
            <img src={lamina.image_url} alt={lamina.title} loading="lazy" decoding="async" fetchPriority="low" className={`w-full h-full object-cover aspect-square ${expired ? "grayscale opacity-60" : ""}`} />
            {expired && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/40">
                <Badge className="bg-foreground/80 text-background font-display tracking-widest text-[10px]">ENCERRADA</Badge>
              </div>
            )}
            {flashActive && !expired && (
              <div className="absolute bottom-1 left-1 right-1 flex items-center justify-center gap-1 bg-destructive/90 text-destructive-foreground rounded px-1 py-0.5 text-[10px] font-display tracking-widest">
                <Timer className="h-3 w-3" /> {countdown}
              </div>
            )}
          </div>
          <div className="p-3 flex flex-col gap-2">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-accent font-display">
                  <Target className="h-3 w-3" />
                  {lamina.industry ?? "Campanha RCA"}
                </div>
                <h3 className="font-display text-lg leading-tight line-clamp-2">{lamina.title}</h3>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {FavButton}
                {isAdmin && onEdit && (
                  <Button size="sm" variant="ghost" className="h-7 px-2" onClick={(e) => { e.stopPropagation(); onEdit(); }}>
                    <Pencil className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
            {lamina.description && (
              <div className="rounded-md bg-accent/10 border border-accent/20 px-2 py-1.5 text-xs leading-snug line-clamp-3">
                <span className="font-display tracking-wider text-[10px] uppercase text-accent block mb-0.5">Resumo da regra</span>
                {lamina.description}
              </div>
            )}
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{fmt(lamina.starts_at)} → {fmt(lamina.expires_at)}</span>
              {remnantOf && <Badge variant="outline" className="text-[10px] font-display tracking-wider border-accent/60 text-accent">{remnantOf}</Badge>}
              {ending && !future && !expired && <Badge className="bg-destructive text-destructive-foreground text-[10px]">ÚLTIMOS DIAS</Badge>}
              {future && <Badge className="bg-primary text-primary-foreground text-[10px]">AGENDADA</Badge>}
              {expired && <Badge className="bg-muted text-muted-foreground text-[10px]">ENCERRADA</Badge>}
            </div>
            {lastSharedLabel && (
              <div className="text-[10px] font-display tracking-widest uppercase text-success/80">
                ✓ Você enviou {lastSharedLabel}
              </div>
            )}
            <div className="grid grid-cols-2 gap-2 mt-auto">
              <Button onClick={copy} variant="outline" size="sm" className="h-9 font-display tracking-wider text-xs">
                <Copy className="h-3.5 w-3.5 mr-1.5" />REGRAS
              </Button>
              {expired ? (
                <Button onClick={(e) => { e.stopPropagation(); onOpen(); }} variant="secondary" size="sm" className="h-9 font-display tracking-wider text-xs">
                  VER HISTÓRICO
                </Button>
              ) : (
                <Button onClick={shareWa} size="sm" className="h-9 font-display tracking-wider text-xs bg-success hover:bg-success/90 text-white">
                  <Share2 className="h-3.5 w-3.5 mr-1.5" />ENVIAR
                </Button>
              )}
            </div>
            {onAskDoubt && !expired && (
              <Button
                onClick={(e) => { e.stopPropagation(); onAskDoubt(); }}
                variant="ghost"
                size="sm"
                className="h-9 text-xs font-display tracking-wider text-muted-foreground hover:text-accent hover:bg-accent/10 self-start"
              >
                <HelpCircle className="h-3.5 w-3.5 mr-1.5" /> TIRAR DÚVIDA COM GESTOR
              </Button>
            )}
          </div>
        </div>
      </Card>
    );
  }

  // ---------- PROMO VARIANT (image-first, vertical) ----------
  return (
    <Card
      onClick={onOpen}
      data-state={edgeState}
      className={`card-lit-edge relative overflow-hidden glass shadow-card hover:shadow-elevated transition-all duration-300 cursor-pointer group p-0 gap-0 rounded-2xl border-border/60 hover:scale-[1.02] hover:ring-2 hover:ring-accent/60 ${flashActive ? "pulse-border" : ""}`}
    >
      {ProgressBar}
      <div className="relative overflow-hidden">
        <img
          src={lamina.image_url}
          alt={lamina.title}
          loading="lazy"
          decoding="async"
          fetchPriority="low"
          className={`w-full h-auto block transition-transform duration-500 group-hover:scale-105 ${expired ? "grayscale opacity-60" : ""}`}
        />
        {expired && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/30">
            <Badge className="bg-foreground/85 text-background font-display tracking-widest text-sm px-3 py-1">ENCERRADA</Badge>
          </div>
        )}
        <div className="absolute top-2 left-2 flex flex-wrap gap-1">
          {isNew && !expired && <Badge className="bg-success text-white font-display tracking-widest text-xs shadow-elevated animate-pulse ring-2 ring-success/40">NOVO</Badge>}
          {future && <Badge className="bg-primary text-primary-foreground font-display tracking-wider text-xs">AGENDADA</Badge>}
          {ending && !future && !expired && <Badge className="bg-destructive text-destructive-foreground font-display tracking-wider text-xs animate-pulse">ÚLTIMOS DIAS</Badge>}
          {remnantOf && !expired && <Badge variant="outline" className="bg-background/80 backdrop-blur font-display tracking-wider text-xs border-accent/60 text-accent">{remnantOf}</Badge>}
          {lamina.badges.map((b) => (
            <Badge key={b} className={`${BADGE_STYLES[b] ?? "bg-accent text-accent-foreground"} font-display tracking-wider text-xs`}>{b}</Badge>
          ))}
        </div>
        <Badge className="absolute top-2 right-2 glass text-foreground font-display tracking-wider text-[10px] uppercase border-0">
          <Tag className="h-3 w-3 mr-1" />{CATEGORY_LABEL[lamina.category]}
        </Badge>
        {FavButton && (
          <div className="absolute top-10 right-2">{FavButton}</div>
        )}
        {flashActive && (
          <div className="absolute bottom-2 left-2 right-2 flex items-center justify-center gap-2 bg-destructive/90 text-destructive-foreground rounded-lg px-2 py-1 text-xs font-display tracking-widest">
            <Timer className="h-3 w-3" /> {countdown}
          </div>
        )}
      </div>
      <div className="p-3 space-y-2">
        <h3 className="font-display text-lg leading-tight line-clamp-2">{lamina.title}</h3>
        {(lamina.price_from || lamina.price_to || lamina.ean) && (
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {lamina.price_from != null && (
              <span className="text-muted-foreground line-through">DE R$ {Number(lamina.price_from).toFixed(2)}</span>
            )}
            {lamina.price_to != null && (
              <span className="font-display text-base text-success">POR R$ {Number(lamina.price_to).toFixed(2)}</span>
            )}
            {lamina.ean && (
              <span className="ml-auto text-[10px] font-mono text-muted-foreground">EAN {lamina.ean}</span>
            )}
          </div>
        )}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{fmt(lamina.starts_at)} → {fmt(lamina.expires_at)}</span>
          {isAdmin && (
            <span className="flex items-center gap-2">
              <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{lamina.view_count}</span>
              <span className="flex items-center gap-1"><Download className="h-3 w-3" />{lamina.download_count}</span>
              {onEdit && (
                <Button size="sm" variant="ghost" className="h-7 px-2" onClick={(e) => { e.stopPropagation(); onEdit(); }}>
                  <Pencil className="h-3 w-3" />
                </Button>
              )}
            </span>
          )}
        </div>
        {lastSharedLabel && (
          <div className="text-[10px] font-display tracking-widest uppercase text-success/80">
            ✓ Você enviou {lastSharedLabel}
          </div>
        )}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <Button onClick={copy} variant="outline" size="sm" className="h-10 font-display tracking-wider text-xs">
            <Copy className="h-3.5 w-3.5 mr-1.5" />COPIAR
          </Button>
          {expired ? (
            <Button onClick={(e) => { e.stopPropagation(); onOpen(); }} variant="secondary" size="sm" className="h-10 font-display tracking-wider text-xs">
              VER HISTÓRICO
            </Button>
          ) : (
            <Button onClick={shareWa} size="sm" className="h-10 font-display tracking-wider text-xs bg-success hover:bg-success/90 text-white">
              <Share2 className="h-3.5 w-3.5 mr-1.5" />WHATSAPP
            </Button>
          )}
        </div>
        {onAskDoubt && !expired && (
          <Button
            onClick={(e) => { e.stopPropagation(); onAskDoubt(); }}
            variant="ghost"
            size="sm"
            className="w-full h-9 text-xs font-display tracking-wider text-muted-foreground hover:text-accent hover:bg-accent/10"
          >
            <HelpCircle className="h-3.5 w-3.5 mr-1.5" /> TIRAR DÚVIDA COM GESTOR
          </Button>
        )}
      </div>
    </Card>
  );
}
