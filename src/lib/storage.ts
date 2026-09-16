import type { Game, Player, Side, Team } from '../types';

const KEY = 'bb-score-tool:games:v1';

export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

export function loadGames(): Game[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Game[];
    if (!Array.isArray(parsed)) return [];
    return parsed.sort((a, b) => b.updatedAt - a.updatedAt);
  } catch {
    return [];
  }
}

export function saveGames(games: Game[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(games));
  } catch (e) {
    console.error('保存に失敗しました', e);
  }
}

export function loadGame(id: string): Game | undefined {
  return loadGames().find((g) => g.id === id);
}

export function upsertGame(game: Game): void {
  const games = loadGames();
  const next = { ...game, updatedAt: Date.now() };
  const idx = games.findIndex((g) => g.id === next.id);
  if (idx >= 0) games[idx] = next;
  else games.unshift(next);
  saveGames(games);
}

export function deleteGame(id: string): void {
  saveGames(loadGames().filter((g) => g.id !== id));
}

export function newPlayer(number = '', name = ''): Player {
  return { id: uid(), number, name, onCourt: false };
}

function newTeam(name: string): Team {
  return { name, players: [] };
}

export function newGame(): Game {
  const now = Date.now();
  const d = new Date();
  const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return {
    id: uid(),
    date,
    title: '',
    home: newTeam('自チーム'),
    away: newTeam('相手チーム'),
    events: [],
    quarter: 1,
    quarterCount: 4,
    status: 'setup',
    createdAt: now,
    updatedAt: now,
  };
}

export function sideTeam(game: Game, side: Side): Team {
  return side === 'home' ? game.home : game.away;
}

export function withTeam(game: Game, side: Side, team: Team): Game {
  return side === 'home' ? { ...game, home: team } : { ...game, away: team };
}
