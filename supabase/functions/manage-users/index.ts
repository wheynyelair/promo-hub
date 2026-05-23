import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ALLOWED_BRANCHES = ["filial01", "filial02", "filial03", "admin"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify caller is admin
    const userClient = createClient(url, anon, { global: { headers: { Authorization: `Bearer ${token}` } } });
    const { data: userRes } = await userClient.auth.getUser();
    if (!userRes?.user) return json({ error: "Não autenticado" }, 401);
    const admin = createClient(url, service);
    const { data: prof } = await admin.from("profiles").select("is_admin").eq("id", userRes.user.id).maybeSingle();
    if (!prof?.is_admin) return json({ error: "Apenas admins" }, 403);

    const body = await req.json();
    const action = body.action as "list" | "create" | "delete" | "reset_password" | "update_email";

    if (action === "list") {
      const { data: users } = await admin.auth.admin.listUsers();
      const { data: profiles } = await admin.from("profiles").select("*");
      const merged = (users?.users ?? []).map((u) => {
        const p = profiles?.find((x: any) => x.id === u.id);
        return {
          id: u.id,
          email: u.email,
          display_name: p?.display_name ?? null,
          branch: p?.branch ?? null,
          is_admin: p?.is_admin ?? false,
          created_at: u.created_at,
        };
      });
      return json({ users: merged });
    }

    if (action === "create") {
      const { username, password, branch, display_name } = body;
      if (!username || !password || !branch) return json({ error: "Campos obrigatórios" }, 400);
      if (!ALLOWED_BRANCHES.includes(branch)) return json({ error: "Filial inválida" }, 400);
      if (password.length < 6) return json({ error: "Senha mínima de 6 caracteres" }, 400);
      const email = username.includes("@") ? username : `${username.toLowerCase()}@dam.local`;
      const { data: created, error } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
      if (error) return json({ error: error.message }, 400);
      await admin.from("profiles").upsert({
        id: created.user!.id,
        branch,
        display_name: display_name ?? username,
        is_admin: branch === "admin",
      });
      return json({ ok: true, id: created.user!.id, email });
    }

    if (action === "delete") {
      const { id } = body;
      if (!id) return json({ error: "id obrigatório" }, 400);
      if (id === userRes.user.id) return json({ error: "Você não pode se excluir" }, 400);
      const { error } = await admin.auth.admin.deleteUser(id);
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    if (action === "reset_password") {
      const { id, password } = body;
      if (!id || !password) return json({ error: "Campos obrigatórios" }, 400);
      if (password.length < 6) return json({ error: "Senha mínima de 6 caracteres" }, 400);
      const { error } = await admin.auth.admin.updateUserById(id, { password });
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }
    if (action === "update_email") {
      const { id, email } = body;
      if (!id || !email) return json({ error: "Campos obrigatórios" }, 400);
      const finalEmail = email.includes("@") ? email : `${String(email).toLowerCase()}@dam.local`;
      const { error } = await admin.auth.admin.updateUserById(id, { email: finalEmail, email_confirm: true });
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true, email: finalEmail });
    }

    return json({ error: "Ação desconhecida" }, 400);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
