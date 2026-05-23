import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

/** Map: lamina_id -> ISO timestamp of the most recent share by the current user. */
export function useMyShareHistory() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my_share_history", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("engagement_events")
        .select("lamina_id, created_at")
        .eq("user_id", user!.id)
        .eq("event_type", "share")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      const map = new Map<string, string>();
      for (const row of data ?? []) {
        if (!map.has(row.lamina_id)) map.set(row.lamina_id, row.created_at);
      }
      return map;
    },
  });
}

export function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "agora";
  if (mins < 60) return `há ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `há ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `há ${days}d`;
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `há ${weeks}sem`;
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}
