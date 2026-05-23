import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Send, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import type { Lamina } from "@/lib/laminas";

interface Props {
  lamina: Lamina | null;
  onClose: () => void;
  managerName?: string | null;
  managerPhone?: string | null;
  rcaName?: string | null;
}

const onlyDigits = (s: string) => s.replace(/\D/g, "");

export function DuvidaDialog({ lamina, onClose, managerName, managerPhone, rcaName }: Props) {
  const [pergunta, setPergunta] = useState("");
  const [nome, setNome] = useState("");

  useEffect(() => {
    if (lamina) {
      setNome(rcaName ?? "");
    } else {
      setPergunta("");
    }
  }, [lamina, rcaName]);

  if (!lamina) return null;

  const phoneDigits = onlyDigits(managerPhone ?? "");
  const hasPhone = phoneDigits.length >= 10;

  const buildMessage = () => {
    const gestor = managerName ?? "Gestor";
    const rca = nome.trim() || rcaName || "representante";
    const duvida = pergunta.trim() || "(sem detalhes — preciso de orientação sobre essa ação)";
    return `Olá ${gestor}, sou o representante ${rca}. Tenho uma dúvida sobre a lâmina *${lamina.title}*: ${duvida}`;
  };

  const send = () => {
    if (!hasPhone) {
      toast.error("Telefone do gestor não cadastrado para sua filial.");
      return;
    }
    if (!nome.trim()) {
      toast.error("Informe seu nome para enviar.");
      return;
    }
    const url = `https://wa.me/55${phoneDigits.replace(/^55/, "")}?text=${encodeURIComponent(buildMessage())}`;
    window.open(url, "_blank");
    onClose();
  };

  return (
    <Dialog open={!!lamina} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display tracking-wider flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-success" /> TIRAR DÚVIDA
          </DialogTitle>
          <DialogDescription>
            Sua mensagem vai direto para {managerName ?? "o gestor da filial"} via WhatsApp,
            já com o título da lâmina e seu nome.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="rounded-lg border border-border bg-muted/40 p-3 text-xs space-y-1">
            <div><span className="text-muted-foreground">Lâmina:</span> <span className="font-medium">{lamina.title}</span></div>
            {lamina.industry && <div><span className="text-muted-foreground">Indústria:</span> {lamina.industry}</div>}
            <div><span className="text-muted-foreground">Gestor:</span> {managerName ?? "—"} {hasPhone ? "" : <span className="text-destructive">(sem telefone)</span>}</div>
          </div>
          <div>
            <Label htmlFor="rca-nome" className="text-xs uppercase tracking-wider font-display">Seu nome (representante)</Label>
            <Input
              id="rca-nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex.: João Silva"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="duv" className="text-xs uppercase tracking-wider font-display">Sua dúvida (opcional)</Label>
            <Textarea
              id="duv"
              value={pergunta}
              onChange={(e) => setPergunta(e.target.value)}
              rows={4}
              placeholder="Ex.: Posso aplicar essa promoção também para o cliente X?"
              className="mt-1"
            />
          </div>
          <Button onClick={send} disabled={!hasPhone} className="w-full h-11 font-display tracking-wider bg-success hover:bg-success/90 text-white">
            <Send className="h-4 w-4 mr-2" /> ENVIAR PELO WHATSAPP
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
