import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Branding {
  logo_url: string | null;
  cover_url: string | null;
  welcome_text: string | null;
}

export const BRANCH_NAME: Record<string, string> = {
  filial01: "Filial 01",
  filial02: "Filial 02",
  filial03: "Filial 03",
  admin: "Administrador",
};

export function useBranding() {
  return useQuery({
    queryKey: ["branding"],
    queryFn: async () => {
      const { data } = await supabase.from("branding_settings").select("logo_url, cover_url, welcome_text").maybeSingle();
      return (data ?? { logo_url: null, cover_url: null, welcome_text: null }) as Branding;
    },
    staleTime: 60_000,
  });
}
