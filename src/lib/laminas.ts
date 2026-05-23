import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Profile } from "@/lib/auth";

export type LaminaCategory = "campanhas" | "acoes" | "compre_ganhe" | "diversos";

export const CATEGORY_LABEL: Record<LaminaCategory, string> = {
  campanhas: "Campanhas RCA",
  acoes: "Ações Internas",
  compre_ganhe: "Compre e Ganhe",
  diversos: "Outros",
};

export const CATEGORIES: LaminaCategory[] = ["campanhas", "acoes", "compre_ganhe", "diversos"];

export interface Lamina {
  id: string;
  branch: string;
  branches?: string[];
  title: string;
  description: string | null;
  industry: string | null;
  image_url: string;
  storage_path: string;
  badges: string[];
  category: LaminaCategory;
  starts_at: string;
  expires_at: string;
  flash_until: string | null;
  download_count: number;
  share_count: number;
  view_count: number;
  created_at: string;
  ean: string | null;
  price_from: number | null;
  price_to: number | null;
}

export const isExpired = (l: Lamina) => new Date(l.expires_at).getTime() < Date.now();
export const isFuture = (l: Lamina) => new Date(l.starts_at).getTime() > Date.now();
export const isActive = (l: Lamina) => !isExpired(l) && !isFuture(l);

export function useLaminas(profile: Profile | null) {
  return useQuery({
    queryKey: ["laminas", profile?.branch, profile?.is_admin],
    enabled: !!profile,
    queryFn: async () => {
      const { data, error } = await supabase.from("laminas").select("*").order("starts_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Lamina[];
    },
  });
}

export interface BranchSettings {
  branch: string;
  manager_name: string | null;
  manager_phone: string | null;
  gestor_nome: string | null;
  gestor_telefone: string | null;
  suporte_contato: string | null;
}

export function useBranchSettings() {
  return useQuery({
    queryKey: ["branch_settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("branch_settings").select("*");
      if (error) throw error;
      return (data ?? []) as BranchSettings[];
    },
  });
}

export async function logEvent(laminaId: string, type: "view" | "download" | "share", userId?: string) {
  if (!userId) return;
  await supabase.from("engagement_events").insert({ lamina_id: laminaId, user_id: userId, event_type: type });
}
