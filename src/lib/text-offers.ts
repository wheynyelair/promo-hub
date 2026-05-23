import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Profile } from "@/lib/auth";

export interface TextOffer {
  id: string;
  branch: string;
  branches: string[];
  codprod: string | null;
  ean: string | null;
  description: string;
  brand: string | null;
  stock: number | null;
  price: number | null;
  title: string | null;
  flash_until: string | null;
  starts_at: string;
  expires_at: string;
  created_at: string;
  created_by: string | null;
}

export const isOfferExpired = (o: TextOffer) => new Date(o.expires_at).getTime() < Date.now();
export const isOfferFuture = (o: TextOffer) => new Date(o.starts_at).getTime() > Date.now();

export function useTextOffers(profile: Profile | null) {
  return useQuery({
    queryKey: ["text_offers", profile?.branch, profile?.is_admin],
    enabled: !!profile,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("text_offers" as any)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return ((data ?? []) as unknown) as TextOffer[];
    },
  });
}

export function useDeleteTextOffer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("text_offers" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["text_offers"] }),
  });
}

export function useDeleteTextOffersBatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase.from("text_offers" as any).delete().in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["text_offers"] }),
  });
}

export function useUpdateTextOffer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<TextOffer> }) => {
      const { error } = await supabase.from("text_offers" as any).update(patch as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["text_offers"] }),
  });
}

export function useUpdateTextOffersBatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ ids, patch }: { ids: string[]; patch: Partial<TextOffer> }) => {
      const { error } = await supabase.from("text_offers" as any).update(patch as any).in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["text_offers"] }),
  });
}

export function useDuplicateTextOffersBatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ offers, startsAt, expiresAt }: { offers: TextOffer[]; startsAt: string; expiresAt: string }) => {
      const payload = offers.map((o) => ({
        codprod: o.codprod,
        ean: o.ean,
        description: o.description,
        brand: o.brand,
        stock: o.stock,
        price: o.price,
        title: o.title,
        branch: o.branch,
        branches: o.branches,
        starts_at: startsAt,
        expires_at: expiresAt,
        flash_until: null,
        created_by: o.created_by,
      }));
      const { error } = await supabase.from("text_offers" as any).insert(payload as any);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["text_offers"] }),
  });
}
