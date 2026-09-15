import type { Game, Side, StatLine } from '../types';
import { addStat, EMPTY_STAT, eventPoints, statsBySide, teamTotal } from './stats';
import { sideTeam } from './storage';

const SIDES: Side[] = ['home', 'away'];

export interface PlayerSeason {
  key: string;
  teamName: string;
  number: string;
  name: string;
  gp: number;
  total: StatLine;
}

export interface TeamSeason {
  name: string;
  gp: number;
  win: number;
  loss: number;
  draw: number;
  pf: number;
  pa: number;
}

/** 記録が1件でもある試合だけを集計対象にする */
export function playedGames(games: Game[]): Game[] {
  return games.filter((g) => g.events.length > 0);
}

export function teamNames(games: Game[]): string[] {
  const names = new Set<string>();
  for (const g of playedGames(games)) {
    names.add(g.home.name);
    names.add(g.away.name);
  }
  return [...names].sort();
}

/** 選手ごとのシーズン集計。同じチーム名＋背番号＋名前を同一人物として扱う */
export function playerSeason(games: Game[], teamFilter?: string): PlayerSeason[] {
  const map = new Map<string, PlayerSeason>();
  for (const g of playedGames(games)) {
    for (const side of SIDES) {
      const team = sideTeam(g, side);
      if (teamFilter && team.name !== teamFilter) continue;
      const stats = statsBySide(g.events, side);
      for (const p of team.players) {
        const s = stats.get(p.id);
        if (!s) continue; // その試合で記録がない選手は出場試合数に数えない
        const key = `${team.name}|${p.number}|${p.name}`;
        let row = map.get(key);
        if (!row) {
          row = { key, teamName: team.name, number: p.number, name: p.name, gp: 0, total: { ...EMPTY_STAT } };
          map.set(key, row);
        }
        row.gp++;
        addStat(row.total, s);
      }
    }
  }
  return [...map.values()].sort((a, b) => b.total.pts - a.total.pts);
}

export function teamSeason(games: Game[]): TeamSeason[] {
  const map = new Map<string, TeamSeason>();
  for (const g of playedGames(games)) {
    const home = teamTotal(g.events, 'home').pts;
    const away = teamTotal(g.events, 'away').pts;
    for (const side of SIDES) {
      const team = sideTeam(g, side);
      const own = side === 'home' ? home : away;
      const opp = side === 'home' ? away : home;
      let row = map.get(team.name);
      if (!row) {
        row = { name: team.name, gp: 0, win: 0, loss: 0, draw: 0, pf: 0, pa: 0 };
        map.set(team.name, row);
      }
      row.gp++;
      row.pf += own;
      row.pa += opp;
      if (own > opp) row.win++;
      else if (own < opp) row.loss++;
      else row.draw++;
    }
  }
  return [...map.values()].sort((a, b) => b.win - a.win || b.gp - a.gp);
}

/** 指定チームの試合ごとの得点推移（直近が最後） */
export function scoreTrend(games: Game[], teamName: string): { date: string; own: number; opp: number; opponent: string }[] {
  const rows: { date: string; own: number; opp: number; opponent: string }[] = [];
  for (const g of playedGames(games)) {
    for (const side of SIDES) {
      const team = sideTeam(g, side);
      if (team.name !== teamName) continue;
      const other = sideTeam(g, side === 'home' ? 'away' : 'home');
      let own = 0;
      let opp = 0;
      for (const ev of g.events) {
        const pts = eventPoints(ev.type);
        if (ev.side === side) own += pts;
        else opp += pts;
      }
      rows.push({ date: g.date, own, opp, opponent: other.name });
    }
  }
  return rows.sort((a, b) => a.date.localeCompare(b.date));
}
