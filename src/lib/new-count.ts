import { useEffect, useState } from "react";
import { useLaminas } from "@/lib/laminas";
import { useTextOffers } from "@/lib/text-offers";
import type { Profile } from "@/lib/auth";
import { getLastSeen } from "@/lib/last-seen";

export function useNewCount(profile: Profile | null) {
  const { data: laminas = [] } = useLaminas(profile);
  const { data: offers = [] } = useTextOffers(profile);
  const [lastSeen, setLastSeen] = useState<number>(() => getLastSeen());

  useEffect(() => {
    const handler = (e: Event) => setLastSeen((e as CustomEvent<number>).detail);
    window.addEventListener("dam:seen", handler);
    return () => window.removeEventListener("dam:seen", handler);
  }, []);

  const lCount = laminas.filter((l) => new Date(l.created_at).getTime() > lastSeen).length;
  const oCount = offers.filter((o) => new Date(o.created_at).getTime() > lastSeen).length;
  return lCount + oCount;
}
