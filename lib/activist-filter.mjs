export function filterActivistsByLeadership(activists, leadershipId) {
  const selectedId = String(leadershipId || "").trim();
  const items = Array.isArray(activists) ? activists : [];
  if (!selectedId) return items;
  return items.filter((activist) => String(activist?.leaderId || "") === selectedId);
}
