import type { Game, Side } from '../types';
import { eventPoints } from './stats';
import { sideTeam } from './storage';

/** ランニングスコアの1マス分（到達した累計得点にこれを書き込む） */
export interface RunMark {
  /** 得点した選手の背番号。チーム記録なら空 */
  number: string;
  /** フリースローによる得点（公式用紙では数字を丸で囲む） */
  freeThrow: boolean;
  /** そのクォーターの最後の得点（公式用紙では太く囲んで下に線を引く） */
  quarterEnd: boolean;
  quarter: number;
}

/**
 * 累計得点 → 記入内容 の対応表を作る。
 * 公式用紙は「到達した累計得点の数字を消して、その隣に得点者の番号を書く」形式。
 */
export function runningMarks(game: Game, side: Side): Map<number, RunMark> {
  const team = sideTeam(game, side);
  const marks = new Map<number, RunMark>();
  const lastOfQuarter = new Map<number, number>(); // クォーター → その最後の累計得点
  let total = 0;

  for (const ev of game.events) {
    const pts = eventPoints(ev.type);
    if (pts === 0 || ev.side !== side) continue;
    total += pts;
    const p = team.players.find((x) => x.id === ev.playerId);
    marks.set(total, {
      number: p?.number ?? '',
      freeThrow: ev.type === 'FTM',
      quarterEnd: false,
      quarter: ev.quarter,
    });
    lastOfQuarter.set(ev.quarter, total);
  }

  for (const t of lastOfQuarter.values()) {
    const m = marks.get(t);
    if (m) m.quarterEnd = true;
  }
  return marks;
}

/** 選手ごとのファウル数（公式用紙のファウル欄に入れる数） */
export function playerFouls(game: Game, side: Side, playerId: string): number {
  return game.events.filter((e) => e.side === side && e.playerId === playerId && e.type === 'PF').length;
}
