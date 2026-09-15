import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Game, StatLine } from '../types';
import { loadGames } from '../lib/storage';
import { pct } from '../lib/stats';
import { playedGames, playerSeason, scoreTrend, teamNames, teamSeason } from '../lib/season';

type Mode = 'total' | 'avg';

const COLUMNS: { key: keyof StatLine | 'fg' | 'fg3' | 'ft'; label: string }[] = [
  { key: 'pts', label: 'PTS' },
  { key: 'reb', label: 'REB' },
  { key: 'ast', label: 'AST' },
  { key: 'stl', label: 'STL' },
  { key: 'blk', label: 'BLK' },
  { key: 'tov', label: 'TO' },
  { key: 'pf', label: 'F' },
  { key: 'fg', label: 'FG' },
  { key: 'fg3', label: '3P' },
  { key: 'ft', label: 'FT' },
];

function cell(stat: StatLine, key: (typeof COLUMNS)[number]['key'], gp: number, mode: Mode): string {
  const div = mode === 'avg' && gp > 0 ? gp : 1;
  const fmt = (n: number) => (mode === 'avg' ? (n / div).toFixed(1) : String(n));
  switch (key) {
    case 'fg': return `${fmt(stat.fg2m + stat.fg3m)}/${fmt(stat.fg2a + stat.fg3a)}`;
    case 'fg3': return `${fmt(stat.fg3m)}/${fmt(stat.fg3a)}`;
    case 'ft': return `${fmt(stat.ftm)}/${fmt(stat.fta)}`;
    default: return fmt(stat[key]);
  }
}

export default function Season() {
  const [games, setGames] = useState<Game[]>([]);
  const [team, setTeam] = useState('');
  const [mode, setMode] = useState<Mode>('avg');

  useEffect(() => setGames(loadGames()), []);

  const names = useMemo(() => teamNames(games), [games]);
  const teams = useMemo(() => teamSeason(games), [games]);
  const players = useMemo(() => playerSeason(games, team || undefined), [games, team]);
  const trend = useMemo(() => (team ? scoreTrend(games, team) : []), [games, team]);
  const played = playedGames(games);

  return (
    <div className="page">
      <header className="app-header">
        <Link className="btn tiny" to="/">← 一覧</Link>
        <h1>シーズン集計</h1>
      </header>

      {played.length === 0 && (
        <p className="empty">集計できる試合がまだありません。記録した試合が増えると、ここに通算成績が出ます。</p>
      )}

      {played.length > 0 && (
        <>
          <section className="card">
            <h3 className="box-title">チーム成績（{played.length}試合）</h3>
            <div className="table-scroll">
              <table className="box-table">
                <thead>
                  <tr>
                    <th className="sticky-col">チーム</th>
                    <th>試合</th><th>勝</th><th>敗</th><th>分</th>
                    <th>平均得点</th><th>平均失点</th><th>得失点</th>
                  </tr>
                </thead>
                <tbody>
                  {teams.map((t) => (
                    <tr key={t.name}>
                      <td className="sticky-col">{t.name}</td>
                      <td>{t.gp}</td>
                      <td>{t.win}</td>
                      <td>{t.loss}</td>
                      <td>{t.draw}</td>
                      <td>{(t.pf / t.gp).toFixed(1)}</td>
                      <td>{(t.pa / t.gp).toFixed(1)}</td>
                      <td className={t.pf - t.pa > 0 ? 'plus' : t.pf - t.pa < 0 ? 'minus' : ''}>
                        {t.pf - t.pa > 0 ? '+' : ''}{t.pf - t.pa}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="card">
            <div className="season-controls">
              <label className="field">
                <span>チーム</span>
                <select className="input" value={team} onChange={(e) => setTeam(e.target.value)}>
                  <option value="">すべて</option>
                  {names.map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </label>
              <div className="mode-switch">
                <button className={`btn tiny ${mode === 'avg' ? 'toggle on' : ''}`} onClick={() => setMode('avg')}>1試合平均</button>
                <button className={`btn tiny ${mode === 'total' ? 'toggle on' : ''}`} onClick={() => setMode('total')}>通算合計</button>
              </div>
            </div>

            <div className="table-scroll">
              <table className="box-table">
                <thead>
                  <tr>
                    <th className="sticky-col">選手</th>
                    <th>試合</th>
                    {COLUMNS.map((c) => <th key={c.key}>{c.label}</th>)}
                    <th>FG%</th>
                  </tr>
                </thead>
                <tbody>
                  {players.map((p) => (
                    <tr key={p.key}>
                      <td className="sticky-col">
                        <span className="row-num">#{p.number || '—'}</span> {p.name || '(名前未設定)'}
                        {!team && <span className="row-team">{p.teamName}</span>}
                      </td>
                      <td>{p.gp}</td>
                      {COLUMNS.map((c) => <td key={c.key}>{cell(p.total, c.key, p.gp, mode)}</td>)}
                      <td>{pct(p.total.fg2m + p.total.fg3m, p.total.fg2a + p.total.fg3a)}</td>
                    </tr>
                  ))}
                  {players.length === 0 && (
                    <tr><td className="sticky-col" colSpan={COLUMNS.length + 3}>記録がありません。</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <p className="pcts">「試合」は、その選手に1件でも記録がある試合の数です。</p>
          </section>

          {team && trend.length > 0 && (
            <section className="card">
              <h3 className="box-title">{team} の試合結果</h3>
              <ul className="trend">
                {trend.map((r, i) => (
                  <li key={i}>
                    <span className="log-time">{r.date}</span>
                    <span className="log-team">vs {r.opponent}</span>
                    <span className={`result ${r.own > r.opp ? 'win' : r.own < r.opp ? 'lose' : ''}`}>
                      {r.own > r.opp ? '○' : r.own < r.opp ? '●' : '△'} {r.own} - {r.opp}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}
