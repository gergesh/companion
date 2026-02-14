export function parsePortList(input: string): number[] {
  const parts = input
    .split(/[,\s]+/)
    .map((p) => p.trim())
    .filter(Boolean);
  const unique: number[] = [];
  const seen = new Set<number>();
  for (const part of parts) {
    const port = Number(part);
    if (!Number.isInteger(port) || port < 1 || port > 65535) continue;
    if (seen.has(port)) continue;
    seen.add(port);
    unique.push(port);
  }
  return unique;
}

export function normalizeImageRef(input: string, fallback = "companion-core:latest"): string {
  const trimmed = input.trim();
  return trimmed || fallback;
}
