import type { EventType, Game, GameEvent, Side, StatLine } from '../types';

export const EMPTY_STAT: StatLine = {
  pts: 0,
  fg2m: 0, fg2a: 0,
  fg3m: 0, fg3a: 0,
  ftm: 0, fta: 0,
  oreb: 0, dreb: 0, reb: 0,
  ast: 0, stl: 0, blk: 0, tov: 0, pf: 0,
};

/** 各アクションのラベルと得点 */
export const ACTION_META: Record<EventType, { label: string; short: string; points: number }> = {
  FG2M: { label: '2P 成功', short: '2P○', points: 2 },
  FG2A: { label: '2P 失敗', short: '2P×', points: 0 },
  FG3M: { label: '3P 成功', short: '3P○', points: 3 },
  FG3A: { label: '3P 失敗', short: '3P×', points: 0 },
  FTM: { label: 'FT 成功', short: 'FT○', points: 1 },
  FTA: { label: 'FT 失敗', short: 'FT×', points: 0 },
  OREB: { label: 'オフェンスリバウンド', short: 'OR', points: 0 },
  DREB: { label: 'ディフェンスリバウンド', short: 'DR', points: 0 },
  AST: { label: 'アシスト', short: 'AS', points: 0 },
  STL: { label: 'スティール', short: 'ST', points: 0 },
  BLK: { label: 'ブロック', short: 'BS', points: 0 },
  TOV: { label: 'ターンオーバー', short: 'TO', points: 0 },
  PF: { label: 'ファウル', short: 'F', points: 0 },
};

export function eventPoints(type: EventType): number {
  return ACTION_META[type].points;
}

function apply(stat: StatLine, type: EventType): void {
  stat.pts += eventPoints(type);
  switch (type) {
    case 'FG2M': stat.fg2m++; stat.fg2a++; break;
    case 'FG2A': stat.fg2a++; break;
    case 'FG3M': stat.fg3m++; stat.fg3a++; break;
    case 'FG3A': stat.fg3a++; break;
    case 'FTM': stat.ftm++; stat.fta++; break;
    case 'FTA': stat.fta++; break;
    case 'OREB': stat.oreb++; stat.reb++; break;
    case 'DREB': stat.dreb++; stat.reb++; break;
    case 'AST': stat.ast++; break;
    case 'STL': stat.stl++; break;
    case 'BLK': stat.blk++; break;
    case 'TOV': stat.tov++; break;
    case 'PF': stat.pf++; break;
  }
}

/** 選手ID -> スタットライン（チーム記録は '__team__' に集約） */
export const TEAM_KEY = '__team__';

/** 2つのスタットラインを足し合わせる（集計用） */
export function addStat(target: StatLine, src: StatLine): void {
  for (const k of Object.keys(target) as (keyof StatLine)[]) {
    target[k] += src[k];
  }
}

export function statsBySide(events: GameEvent[], side: Side): Map<string, StatLine> {
  const map = new Map<string, StatLine>();
  for (const ev of events) {
    if (ev.side !== side) continue;
    const key = ev.playerId ?? TEAM_KEY;
    let stat = map.get(key);
    if (!stat) { stat = { ...EMPTY_STAT }; map.set(key, stat); }
    apply(stat, ev.type);
  }
  return map;
}

export function teamTotal(events: GameEvent[], side: Side): StatLine {
  const total = { ...EMPTY_STAT };
  for (const ev of events) {
    if (ev.side !== side) continue;
    apply(total, ev.type);
  }
  return total;
}

export function score(game: Game, side: Side): number {
  let pts = 0;
  for (const ev of game.events) {
    if (ev.side === side) pts += eventPoints(ev.type);
  }
  return pts;
}

/** クォーター別得点 [Q1, Q2, ...]（延長も含めイベント上の最大クォーターまで） */
export function scoreByQuarter(game: Game, side: Side): number[] {
  const maxQ = Math.max(
    game.quarterCount,
    game.quarter,
    ...game.events.map((e) => e.quarter),
  );
  const arr = new Array<number>(maxQ).fill(0);
  for (const ev of game.events) {
    if (ev.side !== side) continue;
    const idx = ev.quarter - 1;
    if (idx >= 0 && idx < arr.length) arr[idx] += eventPoints(ev.type);
  }
  return arr;
}

/** クォーター別のチームファウル数 */
export function foulsByQuarter(game: Game, side: Side): number[] {
  const maxQ = Math.max(
    game.quarterCount,
    game.quarter,
    ...game.events.map((e) => e.quarter),
  );
  const arr = new Array<number>(maxQ).fill(0);
  for (const ev of game.events) {
    if (ev.side !== side || ev.type !== 'PF') continue;
    const idx = ev.quarter - 1;
    if (idx >= 0 && idx < arr.length) arr[idx]++;
  }
  return arr;
}

export function pct(made: number, att: number): string {
  if (att === 0) return '—';
  return `${Math.round((made / att) * 1000) / 10}%`;
}

/** そのクォーターのチームファウル数（FIBAでは5個目から相手にフリースロー2本） */
export function teamFoulsInQuarter(events: GameEvent[], side: Side, quarter: number): number {
  return events.filter((e) => e.side === side && e.type === 'PF' && e.quarter === quarter).length;
}

export type StatColumnKey = keyof StatLine | 'fg' | 'fg3' | 'ft';
export interface StatColumn { key: StatColumnKey; label: string }

/** 実際に記録されている種類にあわせて表の列を決める（使っていない項目は列ごと出さない） */
export function statColumns(events: GameEvent[]): StatColumn[] {
  const kinds = new Set(events.map((e) => e.type));
  const cols: StatColumn[] = [
    { key: 'pts', label: 'PTS' },
    { key: 'fg', label: 'FG' },
    { key: 'fg3', label: '3P' },
    { key: 'ft', label: 'FT' },
  ];
  if (kinds.has('OREB') || kinds.has('DREB')) {
    cols.push({ key: 'oreb', label: 'OR' }, { key: 'dreb', label: 'DR' }, { key: 'reb', label: 'REB' });
  }
  if (kinds.has('AST')) cols.push({ key: 'ast', label: 'AST' });
  if (kinds.has('STL')) cols.push({ key: 'stl', label: 'STL' });
  if (kinds.has('BLK')) cols.push({ key: 'blk', label: 'BLK' });
  if (kinds.has('TOV')) cols.push({ key: 'tov', label: 'TO' });
  cols.push({ key: 'pf', label: 'F' });
  return cols;
}
