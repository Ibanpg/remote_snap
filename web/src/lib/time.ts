export function formatRelativeTime(iso: string): string {
  const t = new Date(iso).getTime();
  const d = Date.now() - t;
  const s = Math.floor(d / 1000);
  if (s < 45) return "now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h}h`;
  return new Date(iso).toLocaleDateString();
}
