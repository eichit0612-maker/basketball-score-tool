import type { Game, Side } from '../types';
import { ACTION_META, pct, statsBySide, TEAM_KEY, teamTotal } from './stats';
import { sideTeam } from './storage';

function esc(v: string | number): string {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

const HEADER = ['#', '選手', '区分', 'PTS', '2P成', '2P試', '3P成', '3P試', 'FT成', 'FT試', 'FG%', '3P%', 'FT%', 'F'];

function teamRows(game: Game, side: Side): string[] {
  const team = sideTeam(game, side);
  const map = statsBySide(game.events, side);
  const rows: string[] = [];
  rows.push(esc(`${team.name}（${side === 'home' ? 'HOME' : 'AWAY'}）`));
  rows.push(HEADER.map(esc).join(','));
  for (const p of team.players) {
    const s = map.get(p.id);
    rows.push([
      p.number, p.name,
      p.starter ? '先発' : p.played ? '出場' : '未出場',
      s?.pts ?? 0, s?.fg2m ?? 0, s?.fg2a ?? 0, s?.fg3m ?? 0, s?.fg3a ?? 0,
      s?.ftm ?? 0, s?.fta ?? 0,
      pct((s?.fg2m ?? 0) + (s?.fg3m ?? 0), (s?.fg2a ?? 0) + (s?.fg3a ?? 0)),
      pct(s?.fg3m ?? 0, s?.fg3a ?? 0),
      pct(s?.ftm ?? 0, s?.fta ?? 0),
      s?.pf ?? 0,
    ].map(esc).join(','));
  }
  const tm = map.get(TEAM_KEY);
  if (tm) {
    rows.push([
      '', 'チーム記録', '',
      tm.pts, tm.fg2m, tm.fg2a, tm.fg3m, tm.fg3a, tm.ftm, tm.fta,
      pct(tm.fg2m + tm.fg3m, tm.fg2a + tm.fg3a), pct(tm.fg3m, tm.fg3a), pct(tm.ftm, tm.fta),
      tm.pf,
    ].map(esc).join(','));
  }
  const t = teamTotal(game.events, side);
  rows.push([
    '', '合計', '',
    t.pts, t.fg2m, t.fg2a, t.fg3m, t.fg3a, t.ftm, t.fta,
    pct(t.fg2m + t.fg3m, t.fg2a + t.fg3a), pct(t.fg3m, t.fg3a), pct(t.ftm, t.fta),
    t.pf,
  ].map(esc).join(','));
  return rows;
}

export function gameToCsv(game: Game): string {
  const lines: string[] = [];
  lines.push([game.date, game.title, `${game.home.name} vs ${game.away.name}`].map(esc).join(','));
  lines.push('');
  lines.push(...teamRows(game, 'home'));
  lines.push('');
  lines.push(...teamRows(game, 'away'));
  lines.push('');
  lines.push(esc('プレーログ'));
  lines.push(['Q', 'チーム', '選手', 'プレー'].map(esc).join(','));
  for (const ev of game.events) {
    const team = sideTeam(game, ev.side);
    const p = team.players.find((x) => x.id === ev.playerId);
    lines.push([
      `Q${ev.quarter}`, team.name,
      p ? `#${p.number} ${p.name}` : 'チーム',
      ACTION_META[ev.type].label,
    ].map(esc).join(','));
  }
  return lines.join('\r\n');
}

export function downloadCsv(game: Game): void {
  const csv = gameToCsv(game);
  // Excel で開いたときに文字化けしないよう BOM を付ける
  const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${game.date}_${game.home.name}_vs_${game.away.name}.csv`.replace(/[\/:*?"<>|]/g, '_');
  a.click();
  URL.revokeObjectURL(url);
}
