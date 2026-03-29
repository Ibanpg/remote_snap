export function randomWebrtcRoom(): string {
  const u = crypto.randomUUID().replace(/-/g, "");
  return `deck-${u.slice(0, 18)}`;
}
