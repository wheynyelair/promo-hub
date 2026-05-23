import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useBranding, BRANCH_NAME } from "@/lib/branding";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Layers, Sparkles } from "lucide-react";

export const Route = createFileRoute("/")({
  component: LoginPage,
  head: () => ({
    meta: [
      { title: "Entrar — DAM Lâminas" },
      { name: "description", content: "Acesso por filial ao gestor de lâminas." },
    ],
  }),
});

function LoginPage() {
  const { signIn, session, profile, loading } = useAuth();
  const { data: branding } = useBranding();
  const nav = useNavigate();
  const [branch, setBranch] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && session && profile) {
      nav({ to: profile.is_admin ? "/admin" : "/galeria" });
    }
  }, [loading, session, profile, nav]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await signIn(branch, password);
    setBusy(false);
    if (error) toast.error(error);
  };

  const branchLabel = BRANCH_NAME[branch.toLowerCase()] ?? "";
  const welcome = branding?.welcome_text || "Portal de Vendas";

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-4 gradient-hero">
      {branding?.cover_url && (
        <img src={branding.cover_url} alt="" className="absolute inset-0 w-full h-full object-cover opacity-30" />
      )}
      <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/60 to-background/90" />

      <Card className="relative w-full max-w-md p-8 shadow-elevated glass-strong rounded-3xl animate-fade-in">
        <div className="flex flex-col items-center gap-3 mb-6">
          <div className="h-24 w-24 flex items-center justify-center rounded-2xl bg-sidebar/90 overflow-hidden shadow-elevated">
            {branding?.logo_url ? (
              <img src={branding.logo_url} alt="Logo" className="max-h-full max-w-full object-contain p-2" />
            ) : (
              <Layers className="h-12 w-12 text-accent" />
            )}
          </div>
          <div className="text-center">
            <div className="font-display text-3xl tracking-widest">{welcome}</div>
            {branchLabel && <p className="text-sm text-accent font-display tracking-wider mt-1">{branchLabel}</p>}
          </div>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label htmlFor="b">Filial</Label>
            <Input id="b" placeholder="filial01, filial02, filial03 ou admin" value={branch} onChange={(e) => setBranch(e.target.value)} required autoFocus />
          </div>
          <div>
            <Label htmlFor="p">Senha</Label>
            <Input id="p" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <Button type="submit" disabled={busy} className="w-full h-12 font-display text-lg tracking-wider">
            {busy ? "Entrando..." : "ENTRAR"}
          </Button>
        </form>
        <div className="mt-6 text-xs text-muted-foreground border-t pt-4 flex items-center gap-2">
          <Sparkles className="h-3 w-3 text-accent" /> Lâminas inteligentes para cada filial.
        </div>
      </Card>
    </div>
  );
}
