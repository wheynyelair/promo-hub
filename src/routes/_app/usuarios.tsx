import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, KeyRound, Loader2, UserCog, Save, MessageCircleQuestion, AtSign } from "lucide-react";
import { toast } from "sonner";
import { useBranchSettings } from "@/lib/laminas";
import { useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/_app/usuarios")({ component: Usuarios });

interface ManagedUser {
  id: string;
  email: string;
  display_name: string | null;
  branch: string | null;
  is_admin: boolean;
}

const BRANCHES = [
  { v: "filial01", l: "Filial 01" },
  { v: "filial02", l: "Filial 02" },
  { v: "filial03", l: "Filial 03" },
  { v: "admin", l: "Administrador" },
];

async function callFn(action: string, payload: Record<string, unknown> = {}) {
  const { data, error } = await supabase.functions.invoke("manage-users", { body: { action, ...payload } });
  if (error) throw error;
  if ((data as any)?.error) throw new Error((data as any).error);
  return data as any;
}

function Usuarios() {
  const { profile, user } = useAuth();
  const nav = useNavigate();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile && !profile.is_admin) nav({ to: "/galeria" });
  }, [profile, nav]);

  const refresh = async () => {
    setLoading(true);
    try {
      const r = await callFn("list");
      setUsers(r.users ?? []);
    } catch (e: any) {
      toast.error(e.message ?? "Falha ao listar");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (profile?.is_admin) refresh(); }, [profile]);

  if (!profile?.is_admin) return null;

  const remove = async (u: ManagedUser) => {
    if (!confirm(`Excluir usuário ${u.email}?`)) return;
    try { await callFn("delete", { id: u.id }); toast.success("Usuário removido"); refresh(); }
    catch (e: any) { toast.error(e.message); }
  };

  const reset = async (u: ManagedUser) => {
    const pwd = prompt(`Nova senha para ${u.email} (mín. 6 caracteres):`);
    if (!pwd) return;
    try { await callFn("reset_password", { id: u.id, password: pwd }); toast.success("Senha atualizada"); }
    catch (e: any) { toast.error(e.message); }
  };

  const editEmail = async (u: ManagedUser) => {
    const novo = prompt(`Novo login/email para ${u.email}:`, u.email);
    if (!novo || novo === u.email) return;
    try { await callFn("update_email", { id: u.id, email: novo }); toast.success("Login atualizado"); refresh(); }
    catch (e: any) { toast.error(e.message); }
  };

  return (
    <main className="max-w-5xl mx-auto px-4 py-6 space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-4xl md:text-5xl flex items-center gap-2"><UserCog className="h-8 w-8 text-accent"/>USUÁRIOS</h1>
          <p className="text-sm text-muted-foreground">{users.length} usuário(s) cadastrados</p>
        </div>
        <CreateDialog onDone={refresh} />
      </div>

      <BranchSettingsSection />

      {loading ? (
        <div className="text-muted-foreground">Carregando...</div>
      ) : (
        <div className="grid gap-3">
          {users.map((u) => (
            <Card key={u.id} className="p-4 flex items-center gap-4 flex-wrap">
              <div className="flex-1 min-w-0">
                <div className="font-display text-lg truncate">{u.display_name || u.email}</div>
                <div className="text-xs text-muted-foreground truncate">{u.email}</div>
                <div className="flex gap-2 mt-1">
                  {u.branch && <Badge variant="outline" className="uppercase">{u.branch}</Badge>}
                  {u.is_admin && <Badge>Admin</Badge>}
                </div>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" onClick={() => editEmail(u)} title="Alterar login/email"><AtSign className="h-4 w-4"/></Button>
                <Button variant="ghost" size="icon" onClick={() => reset(u)} title="Resetar senha"><KeyRound className="h-4 w-4"/></Button>
                {u.id !== user?.id && (
                  <Button variant="ghost" size="icon" onClick={() => remove(u)} title="Excluir"><Trash2 className="h-4 w-4 text-destructive"/></Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </main>
  );
}

function CreateDialog({ onDone }: { onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [branch, setBranch] = useState("filial01");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await callFn("create", { username, password, branch, display_name: displayName });
      toast.success("Usuário criado");
      setOpen(false);
      setUsername(""); setPassword(""); setDisplayName(""); setBranch("filial01");
      onDone();
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="lg" className="font-display tracking-wider"><Plus className="h-5 w-5 mr-1"/>NOVO USUÁRIO</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle className="font-display text-2xl">NOVO USUÁRIO</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label htmlFor="u">Login (sem espaços)</Label>
            <Input id="u" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="ex: vendedor.silva" required />
            <p className="text-xs text-muted-foreground mt-1">Será usado como login. Email gerado automaticamente.</p>
          </div>
          <div>
            <Label htmlFor="dn">Nome para exibição</Label>
            <Input id="dn" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Ex: João da Silva" />
          </div>
          <div>
            <Label htmlFor="p">Senha (mín. 6 caracteres)</Label>
            <Input id="p" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} autoComplete="new-password" />
          </div>
          <div>
            <Label>Filial</Label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              {BRANCHES.map((b) => (
                <button key={b.v} type="button" onClick={() => setBranch(b.v)}
                  className={`px-3 py-2 rounded-md border text-sm font-display tracking-wider uppercase transition ${branch === b.v ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-secondary"}`}>
                  {b.l}
                </button>
              ))}
            </div>
          </div>
          <Button type="submit" disabled={busy} className="w-full h-12 font-display tracking-wider">
            {busy ? <Loader2 className="h-5 w-5 animate-spin"/> : "CRIAR USUÁRIO"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function BranchSettingsSection() {
  const { data: settings = [], refetch } = useBranchSettings();
  const qc = useQueryClient();
  const [edits, setEdits] = useState<Record<string, { manager_name: string; manager_phone: string; gestor_nome: string; gestor_telefone: string; suporte_contato: string }>>({});
  const [savingBranch, setSavingBranch] = useState<string | null>(null);

  const get = (b: string) => {
    const s = settings.find((x) => x.branch === b);
    return edits[b] ?? {
      manager_name: s?.manager_name ?? "",
      manager_phone: s?.manager_phone ?? "",
      gestor_nome: s?.gestor_nome ?? "",
      gestor_telefone: s?.gestor_telefone ?? "",
      suporte_contato: s?.suporte_contato ?? "",
    };
  };

  const save = async (b: string) => {
    setSavingBranch(b);
    const v = get(b);
    const { error } = await supabase.from("branch_settings").upsert({
      branch: b as any,
      manager_name: v.manager_name || null,
      manager_phone: v.manager_phone || null,
      gestor_nome: v.gestor_nome || null,
      gestor_telefone: v.gestor_telefone || null,
      suporte_contato: v.suporte_contato || null,
      updated_at: new Date().toISOString(),
    });
    setSavingBranch(null);
    if (error) { toast.error(error.message); return; }
    toast.success(`Dados de ${b.toUpperCase()} salvos!`);
    refetch();
    qc.invalidateQueries({ queryKey: ["branch_settings"] });
  };

  return (
    <section>
      <h2 className="font-display text-2xl tracking-wider flex items-center gap-2 mb-3">
        <MessageCircleQuestion className="h-6 w-6 text-accent"/>CONTATOS POR FILIAL
      </h2>
      <p className="text-sm text-muted-foreground mb-4">Dados do gestor e da equipe de suporte de cada filial.</p>
      <div className="grid md:grid-cols-3 gap-3">
        {["filial01", "filial02", "filial03"].map((b) => {
          const v = get(b);
          const upd = (patch: Partial<typeof v>) => setEdits({ ...edits, [b]: { ...v, ...patch } });
          return (
            <Card key={b} className="glass p-4 space-y-3 rounded-2xl">
              <div className="font-display text-lg uppercase tracking-wider">{b}</div>
              <div>
                <Label>Nome do gestor *</Label>
                <Input value={v.gestor_nome} onChange={(e) => upd({ gestor_nome: e.target.value })} />
              </div>
              <div>
                <Label>Telefone / WhatsApp do gestor *</Label>
                <Input value={v.gestor_telefone} onChange={(e) => upd({ gestor_telefone: e.target.value })} placeholder="5511988887777" />
              </div>
              <div>
                <Label>Equipe de suporte / auxiliares *</Label>
                <Textarea rows={2} value={v.suporte_contato} onChange={(e) => upd({ suporte_contato: e.target.value })} placeholder="Nomes e contatos" />
              </div>
              <div className="border-t pt-2 opacity-75">
                <Label className="text-[10px]">Dúvida rápida (compat) — nome / telefone</Label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <Input value={v.manager_name} onChange={(e) => upd({ manager_name: e.target.value })} placeholder="Nome" />
                  <Input value={v.manager_phone} onChange={(e) => upd({ manager_phone: e.target.value })} placeholder="Telefone" />
                </div>
              </div>
              <Button size="sm" onClick={() => save(b)} disabled={savingBranch === b} className="w-full">
                {savingBranch === b ? <Loader2 className="h-4 w-4 animate-spin"/> : <><Save className="h-4 w-4 mr-2"/>Salvar</>}
              </Button>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
