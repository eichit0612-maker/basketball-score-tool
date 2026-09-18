import type { Game, Side } from '../types';
import { eventPoints } from './stats';
import { sideTeam } from './storage';

/**
 * 記入に使うペンの色。
 * JBA TOマニュアル: 第1Q・第3Qは赤、第2Q・第4Q・OTは濃色（黒/青）。
 */
export type PenColor = 'red' | 'dark';

export function quarterPen(quarter: number, quarterCount: number): PenColor {
  if (quarter > quarterCount) return 'dark'; // OTは第4Qの続きとみなす
  return quarter % 2 === 1 ? 'red' : 'dark';
}

/** ランニングスコアの1マス分（到達した累計得点に記入する内容） */
export interface RunMark {
  /** 得点した選手の背番号。チーム記録なら空 */
  number: string;
  /** 1=フリースロー（●）、2=2点（斜線）、3=3点（斜線＋番号を○） */
  points: number;
  quarter: number;
  pen: PenColor;
  /** そのクォーターの最後の得点（太い○と太い横線） */
  quarterEnd: boolean;
  /** 試合の最後の得点（太い○と2本の横線） */
  gameEnd: boolean;
}

export interface RunningScore {
  marks: Map<number, RunMark>;
  /** 最終得点。これより後のマスには斜線を引く */
  total: number;
}

export function runningScore(game: Game, side: Side): RunningScore {
  const team = sideTeam(game, side);
  const marks = new Map<number, RunMark>();
  const lastOfQuarter = new Map<number, number>();
  let total = 0;

  for (const ev of game.events) {
    const pts = eventPoints(ev.type);
    if (pts === 0 || ev.side !== side) continue;
    total += pts;
    const p = team.players.find((x) => x.id === ev.playerId);
    marks.set(total, {
      number: p?.number ?? '',
      points: pts,
      quarter: ev.quarter,
      pen: quarterPen(ev.quarter, game.quarterCount),
      quarterEnd: false,
      gameEnd: false,
    });
    lastOfQuarter.set(ev.quarter, total);
  }

  for (const t of lastOfQuarter.values()) {
    const m = marks.get(t);
    if (m) m.quarterEnd = true;
  }
  const last = marks.get(total);
  if (last) last.gameEnd = true;

  return { marks, total };
}

export interface FoulMark {
  quarter: number;
  pen: PenColor;
  /** 前半（第2Q終了まで）のファウル。前半終了時に枠を太線で囲む */
  firstHalf: boolean;
}

/** 選手のファウルを記録順に返す */
export function playerFouls(game: Game, side: Side, playerId: string): FoulMark[] {
  return game.events
    .filter((e) => e.side === side && e.playerId === playerId && e.type === 'PF')
    .map((e) => ({
      quarter: e.quarter,
      pen: quarterPen(e.quarter, game.quarterCount),
      firstHalf: e.quarter <= Math.ceil(game.quarterCount / 2),
    }));
}
