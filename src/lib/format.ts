export function clockText(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

export function quarterLabel(q: number, quarterCount: number): string {
  return q > quarterCount ? `OT${q - quarterCount}` : `Q${q}`;
}
