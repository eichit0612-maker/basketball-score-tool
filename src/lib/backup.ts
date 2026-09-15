import type { Game } from '../types';
import { loadGames, saveGames } from './storage';
import { loadRosters, setRosters, type SavedRoster } from './rosters';

interface BackupFile {
  app: 'basketball-score-tool';
  version: 1;
  exportedAt: string;
  games: Game[];
  rosters: SavedRoster[];
}

export function exportBackup(): void {
  const data: BackupFile = {
    app: 'basketball-score-tool',
    version: 1,
    exportedAt: new Date().toISOString(),
    games: loadGames(),
    rosters: loadRosters(),
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `basketball-backup-${data.exportedAt.slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export interface ImportResult {
  addedGames: number;
  updatedGames: number;
  addedRosters: number;
}

/** 既存データは消さず、同じIDのものだけ新しい方で置き換える */
export function importBackup(text: string): ImportResult {
  const data = JSON.parse(text) as Partial<BackupFile>;
  if (data.app !== 'basketball-score-tool' || !Array.isArray(data.games)) {
    throw new Error('このアプリのバックアップファイルではありません。');
  }

  const games = loadGames();
  const byId = new Map(games.map((g) => [g.id, g]));
  let addedGames = 0;
  let updatedGames = 0;
  for (const g of data.games) {
    const cur = byId.get(g.id);
    if (!cur) {
      byId.set(g.id, g);
      addedGames++;
    } else if ((g.updatedAt ?? 0) > (cur.updatedAt ?? 0)) {
      byId.set(g.id, g);
      updatedGames++;
    }
  }
  saveGames([...byId.values()]);

  let addedRosters = 0;
  if (Array.isArray(data.rosters)) {
    const rosters = loadRosters();
    const names = new Set(rosters.map((r) => r.name));
    for (const r of data.rosters) {
      if (!names.has(r.name)) {
        rosters.push(r);
        names.add(r.name);
        addedRosters++;
      }
    }
    setRosters(rosters);
  }

  return { addedGames, updatedGames, addedRosters };
}
