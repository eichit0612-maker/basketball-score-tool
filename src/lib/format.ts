export function quarterLabel(q: number, quarterCount: number): string {
  return q > quarterCount ? `OT${q - quarterCount}` : `Q${q}`;
}
