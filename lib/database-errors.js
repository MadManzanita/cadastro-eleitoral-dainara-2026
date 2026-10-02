export function isDuplicateRegistration(cause) {
  return cause?.code === "23505";
}

export function isMissingOptionalHistory(cause) {
  return cause?.code === "PGRST205" &&
    cause?.message === "Could not find the table 'public.trust_network_history' in the schema cache";
}
