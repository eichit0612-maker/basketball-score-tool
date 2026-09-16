import { Link, useParams } from 'react-router-dom';
import type { Side, StatLine } from '../types';
import { sideTeam } from '../lib/storage';
import {
  ACTION_META, EMPTY_STAT, foulsByQuarter, pct, scoreByQuarter,
  statColumns, statsBySide, TEAM_KEY, teamTotal, type StatColumnKey,
} from '../lib/stats';
import { quarterLabel } from '../lib/format';
import { downloadCsv } from '../lib/csv';
import { useGame } from '../lib/useGame';
import MarginChart from '../components/MarginChart';


function cell(stat: StatLine, key: StatColumnKey): string {
  switch (key) {
    case 'fg': return `${stat.fg2m + stat.fg3m}/${stat.fg2a + stat.fg3a}`;
    case 'fg3': return `${stat.fg3m}/${stat.fg3a}`;
    case 'ft': return `${stat.ftm}/${stat.fta}`;
    default: return String(stat[key]);
  }
}

export default function BoxScore() {
  const { id } = useParams();
  const { game, loaded, update } = useGame(id);

  if (!loaded) return <div className="page"><p className="empty">読み込み中…</p></div>;
  if (!game) return <div className="page"><p className="empty">試合が見つかりません。<Link to="/">一覧へ</Link></p></div>;

  const homeQ = scoreByQuarter(game, 'home');
  const awayQ = scoreByQuarter(game, 'away');
  const homeF = foulsByQuarter(game, 'home');
  const awayF = foulsByQuarter(game, 'away');
  const homeTotal = teamTotal(game.events, 'home');
  const awayTotal = teamTotal(game.events, 'away');
  const columns = statColumns(game.events);

  function renderTable(side: Side) {
    const team = sideTeam(game!, side);
    const map = statsBySide(game!.events, side);
    const total = side === 'home' ? homeTotal : awayTotal;
    const teamOnly = map.get(TEAM_KEY);
    const rows = [...team.players].sort((a, b) => (map.get(b.id)?.pts ?? 0) - (map.get(a.id)?.pts ?? 0));

    return (
      <section className="card" key={side}>
        <h3 className="box-title">
          <span className={`side-badge ${side}`}>{side === 'home' ? 'HOME' : 'AWAY'}</span>
          {team.name}
          <span className="box-total">{total.pts}点</span>
        </h3>
        <div className="table-scroll">
          <table className="box-table">
            <thead>
              <tr>
                <th className="sticky-col">選手</th>
                {columns.map((c) => <th key={c.key}>{c.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => {
                const s = map.get(p.id) ?? EMPTY_STAT;
                return (
                  <tr key={p.id}>
                    <td className="sticky-col">
                      <span className="row-num">#{p.number || '—'}</span> {p.name || '(名前未設定)'}
                    </td>
                    {columns.map((c) => <td key={c.key}>{cell(s, c.key)}</td>)}
                  </tr>
                );
              })}
              {teamOnly && (
                <tr className="team-row">
                  <td className="sticky-col">チーム記録</td>
                  {columns.map((c) => <td key={c.key}>{cell(teamOnly, c.key)}</td>)}
                </tr>
              )}
              <tr className="total-row">
                <td className="sticky-col">合計</td>
                {columns.map((c) => <td key={c.key}>{cell(total, c.key)}</td>)}
              </tr>
            </tbody>
          </table>
        </div>
        <p className="pcts">
          FG {pct(total.fg2m + total.fg3m, total.fg2a + total.fg3a)} ／
          3P {pct(total.fg3m, total.fg3a)} ／
          FT {pct(total.ftm, total.fta)}
        </p>
      </section>
    );
  }

  return (
    <div className="page">
      <header className="app-header">
        <Link className="btn tiny" to="/">← 一覧</Link>
        <Link className="btn tiny" to={`/game/${game.id}/live`}>記録画面</Link>
        <button className="btn tiny" onClick={() => downloadCsv(game)}>CSV出力</button>
        <button className="btn tiny" onClick={() => window.print()}>印刷</button>
      </header>

      <section className="card final">
        <div className="final-meta">
          {game.date}{game.title && ` ・ ${game.title}`}
        </div>
        <div className="final-score">
          <span className={`team ${homeTotal.pts > awayTotal.pts ? 'win' : ''}`}>{game.home.name}</span>
          <span className="num">{homeTotal.pts}</span>
          <span className="dash">-</span>
          <span className="num">{awayTotal.pts}</span>
          <span className={`team ${awayTotal.pts > homeTotal.pts ? 'win' : ''}`}>{game.away.name}</span>
        </div>
        <div className="table-scroll">
          <table className="q-table">
            <thead>
              <tr>
                <th></th>
                {homeQ.map((_, i) => <th key={i}>{quarterLabel(i + 1, game.quarterCount)}</th>)}
                <th>計</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>{game.home.name}</td>
                {homeQ.map((v, i) => <td key={i}>{v}</td>)}
                <td className="strong">{homeTotal.pts}</td>
              </tr>
              <tr>
                <td>{game.away.name}</td>
                {awayQ.map((v, i) => <td key={i}>{v}</td>)}
                <td className="strong">{awayTotal.pts}</td>
              </tr>
              <tr className="foul-row">
                <td>{game.home.name}・チームファウル</td>
                {homeF.map((v, i) => <td key={i} className={v >= 5 ? 'over' : ''}>{v}</td>)}
                <td>{homeF.reduce((a, b) => a + b, 0)}</td>
              </tr>
              <tr className="foul-row">
                <td>{game.away.name}・チームファウル</td>
                {awayF.map((v, i) => <td key={i} className={v >= 5 ? 'over' : ''}>{v}</td>)}
                <td>{awayF.reduce((a, b) => a + b, 0)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        {game.status !== 'finished' && (
          <button
            className="btn tiny"
            onClick={() => update((g) => ({ ...g, status: 'finished' }))}
          >
            この試合を「終了」にする
          </button>
        )}
      </section>

      {game.events.length > 0 && (
        <section className="card">
          <h3 className="box-title">得点差の推移</h3>
          <MarginChart game={game} />
        </section>
      )}

      {renderTable('home')}
      {renderTable('away')}

      <section className="card">
        <h3 className="box-title">プレーログ（{game.events.length}件）</h3>
        <ul className="full-log">
          {[...game.events].reverse().map((ev) => {
            const t = sideTeam(game, ev.side);
            const p = t.players.find((x) => x.id === ev.playerId);
            return (
              <li key={ev.id}>
                <span className="log-time">{quarterLabel(ev.quarter, game.quarterCount)}</span>
                <span className="log-team">{t.name}</span>
                <span className="log-player">{p ? `#${p.number} ${p.name}` : 'チーム'}</span>
                <span className="log-act">{ACTION_META[ev.type].label}</span>
              </li>
            );
          })}
          {game.events.length === 0 && <li className="empty small">記録がありません。</li>}
        </ul>
      </section>
    </div>
  );
}
