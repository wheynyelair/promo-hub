const KEY = "dam_galeria_last_seen_v1";

export function getLastSeen(): number {
  if (typeof window === "undefined") return 0;
  const raw = localStorage.getItem(KEY);
  return raw ? Number(raw) : 0;
}

export function markSeen(now = Date.now()) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, String(now));
  window.dispatchEvent(new CustomEvent("dam:seen", { detail: now }));
}
