import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Profile } from "@/lib/auth";

export interface PriceBaseRow {
  id: string;
  codfilial: string;
  branch: string | null;
  codprod: string;
  ean: string | null;
  descricao: string;
  departamento: string | null;
  linha: string | null;
  marca: string | null;
  secao: string | null;
  ptabela: number | null;
  preco_final: number | null;
  updated_at: string;
}

export function usePriceBase(profile: Profile | null) {
  return useQuery({
    queryKey: ["price_base", profile?.branch, profile?.is_admin],
    enabled: !!profile,
    queryFn: async () => {
      const { data, error } = await supabase.from("price_base" as any).select("*");
      if (error) throw error;
      return ((data ?? []) as unknown) as PriceBaseRow[];
    },
  });
}

export function useUpsertPriceBase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (rows: Partial<PriceBaseRow>[]) => {
      // Deduplica por (codfilial, codprod) mantendo a última ocorrência
      // (evita erro "ON CONFLICT DO UPDATE command cannot affect row a second time")
      const dedup = new Map<string, Partial<PriceBaseRow>>();
      for (const r of rows) {
        const cf = (r.codfilial ?? "").toString().trim();
        const cp = (r.codprod ?? "").toString().trim();
        if (!cf || !cp) continue;
        dedup.set(`${cf}::${cp}`, r);
      }
      const unique = Array.from(dedup.values());
      const CHUNK = 500;
      for (let i = 0; i < unique.length; i += CHUNK) {
        const slice = unique.slice(i, i + CHUNK);
        const { error } = await supabase
          .from("price_base" as any)
          .upsert(slice as any, { onConflict: "codfilial,codprod" });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["price_base"] }),
  });
}

/** Indexa a base por EAN e por CODPROD para lookup rápido. */
export function indexBase(base: PriceBaseRow[]) {
  const byEan = new Map<string, PriceBaseRow>();
  const byCodprod = new Map<string, PriceBaseRow>();
  for (const r of base) {
    if (r.ean) byEan.set(r.ean, r);
    if (r.codprod) byCodprod.set(r.codprod, r);
  }
  return { byEan, byCodprod };
}
