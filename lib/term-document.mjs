export function formatTermAddress(person = {}) {
  const address = String(person.address || "").trim();
  const neighborhood = String(person.neighborhood || "").trim();
  if (!neighborhood) return address;
  return [address, neighborhood].filter(Boolean).join(", ");
}
