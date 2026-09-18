import type { Game } from '../types';
import { loadGames, saveGames } from './storage';
import { loadRosters, setRosters, type SavedRoster } from './rosters';
import { score } from './stats';

const CONFIG_KEY = 'bb-score-tool:sync:v1';

export interface SyncConfig {
  /** Google Apps Script のウェブアプリURL */
  url: string;
  /** スクリプト側と同じ合言葉 */
  secret: string;
  /** 最後に同期できた時刻 */
  lastSyncedAt?: number;
}

interface GamePayload {
  id: string;
  updatedAt: number;
  summary: {
    date: string;
    title: string;
    teamA: string;
    teamB: string;
    scoreA: number;
    scoreB: number;
  };
  data: Game;
}

interface RosterPayload {
  name: string;
  updatedAt: number;
  players: string;
  data: SavedRoster;
}

interface SyncResponse {
  ok: boolean;
  error?: string;
  games?: GamePayload[];
  rosters?: RosterPayload[];
}

export interface SyncResult {
  sent: number;
  added: number;
  updated: number;
  total: number;
}

export function loadSyncConfig(): SyncConfig | null {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (!raw) return null;
    const cfg = JSON.parse(raw) as SyncConfig;
    return cfg.url ? cfg : null;
  } catch {
    return null;
  }
}

export function saveSyncConfig(cfg: SyncConfig): void {
  try {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg));
  } catch (e) {
    console.error('同期設定を保存できませんでした', e);
  }
}

export function clearSyncConfig(): void {
  try {
    localStorage.removeItem(CONFIG_KEY);
  } catch {
    /* 消せなくても致命的ではない */
  }
}

function toGamePayload(g: Game): GamePayload {
  return {
    id: g.id,
    updatedAt: g.updatedAt ?? 0,
    summary: {
      date: g.date,
      title: g.title,
      teamA: g.home.name,
      teamB: g.away.name,
      scoreA: score(g, 'home'),
      scoreB: score(g, 'away'),
    },
    data: g,
  };
}

function toRosterPayload(r: SavedRoster): RosterPayload {
  return {
    name: r.name,
    updatedAt: r.updatedAt ?? 0,
    players: r.players.map((p) => `${p.number} ${p.name}`).join(' / '),
    data: r,
  };
}

/**
 * スプレッドシートと双方向に同期する。
 * 同じIDの試合は updatedAt が新しい方を採用する（後勝ち）。
 */
export async function syncNow(cfg: SyncConfig): Promise<SyncResult> {
  const localGames = loadGames();
  const localRosters = loadRosters();

  // Content-Type を付けないことで CORS のプリフライトを避ける（GASはOPTIONSを扱えない）
  const res = await fetch(cfg.url, {
    method: 'POST',
    body: JSON.stringify({
      secret: cfg.secret,
      games: localGames.map(toGamePayload),
      rosters: localRosters.map(toRosterPayload),
    }),
  });

  if (!res.ok) throw new Error(`サーバーが ${res.status} を返しました`);

  let json: SyncResponse;
  try {
    json = (await res.json()) as SyncResponse;
  } catch {
    throw new Error('応答を読み取れませんでした。URLがウェブアプリのものか確認してください。');
  }
  if (!json.ok) throw new Error(json.error ?? '同期に失敗しました');

  const byId = new Map(localGames.map((g) => [g.id, g]));
  let added = 0;
  let updated = 0;
  for (const item of json.games ?? []) {
    const cur = byId.get(item.id);
    if (!cur) {
      byId.set(item.id, item.data);
      added++;
    } else if ((item.updatedAt ?? 0) > (cur.updatedAt ?? 0)) {
      byId.set(item.id, item.data);
      updated++;
    }
  }
  saveGames([...byId.values()]);

  if (json.rosters) {
    const byName = new Map(localRosters.map((r) => [r.name, r]));
    for (const item of json.rosters) {
      const cur = byName.get(item.name);
      if (!cur || (item.updatedAt ?? 0) > (cur.updatedAt ?? 0)) byName.set(item.name, item.data);
    }
    setRosters([...byName.values()]);
  }

  saveSyncConfig({ ...cfg, lastSyncedAt: Date.now() });

  return {
    sent: localGames.length,
    added,
    updated,
    total: byId.size,
  };
}
