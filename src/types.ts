export type Side = 'home' | 'away';

/** 記録できるアクション種別 */
export type EventType =
  | 'FG2M' | 'FG2A'   // 2P成功 / 2P失敗
  | 'FG3M' | 'FG3A'   // 3P成功 / 3P失敗
  | 'FTM' | 'FTA'     // FT成功 / FT失敗
  | 'OREB' | 'DREB'
  | 'AST' | 'STL' | 'BLK' | 'TOV' | 'PF';

export interface Player {
  id: string;
  number: string;
  name: string;
  onCourt: boolean;
}

export interface Team {
  name: string;
  players: Player[];
}

export interface GameEvent {
  id: string;
  ts: number;            // 記録した実時刻
  quarter: number;       // 1〜
  clock: number;         // そのクォーターの残り秒数
  side: Side;
  playerId: string | null; // null = チーム記録（チームリバウンド等）
  type: EventType;
}

export type GameStatus = 'setup' | 'live' | 'finished';

export interface Game {
  id: string;
  date: string;          // yyyy-mm-dd
  title: string;         // 大会名・メモ
  home: Team;
  away: Team;
  events: GameEvent[];
  quarter: number;
  quarterCount: number;
  quarterMinutes: number;
  clock: number;         // 残り秒
  status: GameStatus;
  createdAt: number;
  updatedAt: number;
}

export interface StatLine {
  pts: number;
  fg2m: number; fg2a: number;
  fg3m: number; fg3a: number;
  ftm: number; fta: number;
  oreb: number; dreb: number; reb: number;
  ast: number; stl: number; blk: number; tov: number; pf: number;
}
