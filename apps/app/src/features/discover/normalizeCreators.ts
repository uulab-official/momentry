export function normalizeCreators(creators: unknown): string | undefined {
  if (!Array.isArray(creators)) return undefined;

  const seen = new Set<string>();
  const uniqueCreators: string[] = [];

  for (const creator of creators) {
    if (typeof creator !== 'string') continue;
    const name = creator.trim();
    const key = name.toLocaleLowerCase('ko-KR');
    if (!name || seen.has(key)) continue;
    seen.add(key);
    uniqueCreators.push(name);
    if (uniqueCreators.length === 2) break;
  }

  return uniqueCreators.length > 0 ? uniqueCreators.join(', ') : undefined;
}
