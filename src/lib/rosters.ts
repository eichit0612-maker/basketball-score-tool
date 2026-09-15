import type { Player, Team } from '../types';
import { uid } from './storage';

const KEY = 'bb-score-tool:rosters:v1';

/** 試合をまたいで使い回すチーム名簿 */
export interface SavedRoster {
  id: string;
  name: string;
  players: { number: string; name: string }[];
  updatedAt: number;
}

export function loadRosters(): SavedRoster[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SavedRoster[];
    if (!Array.isArray(parsed)) return [];
    return parsed.sort((a, b) => b.updatedAt - a.updatedAt);
  } catch {
    return [];
  }
}

function persist(rosters: SavedRoster[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(rosters));
  } catch (e) {
    console.error('名簿の保存に失敗しました', e);
  }
}

export function setRosters(rosters: SavedRoster[]): void {
  persist(rosters);
}

/** 同名のチームがあれば上書き保存する */
export function saveRoster(team: Team): SavedRoster {
  const rosters = loadRosters();
  const entry: SavedRoster = {
    id: rosters.find((r) => r.name === team.name)?.id ?? uid(),
    name: team.name,
    players: team.players.map((p) => ({ number: p.number, name: p.name })),
    updatedAt: Date.now(),
  };
  const idx = rosters.findIndex((r) => r.name === team.name);
  if (idx >= 0) rosters[idx] = entry;
  else rosters.unshift(entry);
  persist(rosters);
  return entry;
}

export function deleteRoster(id: string): void {
  persist(loadRosters().filter((r) => r.id !== id));
}

export function rosterToPlayers(roster: SavedRoster): Player[] {
  return roster.players.map((p) => ({ id: uid(), number: p.number, name: p.name, onCourt: false }));
}
