const PUBLIC_ALIAS_WORDS = [
  "Beam Star",
  "Vault Spark",
  "Floor Flyer",
  "Bar Bright",
  "Glow Champ",
  "Landing Star",
  "Core Spark",
  "Balance Ace",
];

function hashToNumber(input: string) {
  // Simple stable hash for anonymous naming (not security-related)
  let h = 0;
  for (let i = 0; i < input.length; i++) h = (h * 31 + input.charCodeAt(i)) >>> 0;
  return h;
}

export function generatedPublicAlias(athleteId: string): string {
  const hash = hashToNumber(athleteId);
  const label = PUBLIC_ALIAS_WORDS[hash % PUBLIC_ALIAS_WORDS.length];
  return `${label} ${String(hash % 1000).padStart(3, "0")}`;
}

export function publicAliasForAthlete(athlete: { id: string; name?: string | null; publicDisplayName?: string | null }): string {
  const alias = athlete.publicDisplayName?.trim();
  const normalize = (value: string) => value.normalize('NFKC').toLowerCase().replace(new RegExp('[^\\p{L}\\p{N}]', 'gu'), '');
  // Older profiles may have copied the private name into the alias field.
  if (!alias || (athlete.name && normalize(alias) === normalize(athlete.name))) return generatedPublicAlias(athlete.id);
  return alias;
}
