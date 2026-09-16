import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { EventType, Side } from '../types';
import { sideTeam, uid, withTeam } from '../lib/storage';
import { ACTION_META, statsBySide, teamFoulsInQuarter } from '../lib/stats';
import { quarterLabel } from '../lib/format';
import { useGame } from '../lib/useGame';

// 一人で記録するため、記録するのはシュートの成否とファウルだけに絞っている
const SHOT_ACTIONS: EventType[] = ['FG2M', 'FG2A', 'FG3M', 'FG3A', 'FTM', 'FTA'];
const OTHER_ACTIONS: EventType[] = ['PF'];

export default function Live() {
  const { id } = useParams();
  const { game, loaded, update } = useGame(id);
  const [side, setSide] = useState<Side>('home');
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [subMode, setSubMode] = useState(false);
  const [toast, setToast] = useState('');

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 1600);
    return () => clearTimeout(t);
  }, [toast]);

  const statMap = useMemo(
    () => (game ? statsBySide(game.events, side) : new Map()),
    [game, side],
  );

  if (!loaded) return <div className="page"><p className="empty">読み込み中…</p></div>;
  if (!game) return <div className="page"><p className="empty">試合が見つかりません。<Link to="/">一覧へ</Link></p></div>;

  const team = sideTeam(game, side);
  const players = [...team.players].sort((a, b) => Number(b.onCourt) - Number(a.onCourt));
  const homeScore = game.events.filter((e) => e.side === 'home').reduce((s, e) => s + ACTION_META[e.type].points, 0);
  const awayScore = game.events.filter((e) => e.side === 'away').reduce((s, e) => s + ACTION_META[e.type].points, 0);
  const selected = playerId ? team.players.find((p) => p.id === playerId) ?? null : null;
  const selectedStat = playerId ? statMap.get(playerId) : undefined;
  const recent = game.events.slice(-8).reverse();
  const homeFouls = teamFoulsInQuarter(game.events, 'home', game.quarter);
  const awayFouls = teamFoulsInQuarter(game.events, 'away', game.quarter);
  const quarters = Array.from(
    { length: Math.max(game.quarterCount, game.quarter, ...game.events.map((e) => e.quarter)) },
    (_, i) => i + 1,
  );

  function addEvent(type: EventType, targetSide: Side, targetPlayerId: string | null) {
    update((g) => ({
      ...g,
      events: [...g.events, {
        id: uid(),
        ts: Date.now(),
        quarter: g.quarter,
        side: targetSide,
        playerId: targetPlayerId,
        type,
      }],
    }));
  }

  function record(type: EventType) {
    addEvent(type, side, playerId);
    const who = selected ? `#${selected.number} ${selected.name}` : 'チーム';
    setToast(`${who} : ${ACTION_META[type].label}`);
  }

  function undoLast() {
    update((g) => (g.events.length === 0 ? g : { ...g, events: g.events.slice(0, -1) }));
    setToast('直前のプレーを取り消しました');
  }

  function removeEvent(evId: string) {
    update((g) => ({ ...g, events: g.events.filter((e) => e.id !== evId) }));
    setToast('プレーを削除しました');
  }

  function selectPlayer(pid: string) {
    if (subMode) {
      update((g) => {
        const t = sideTeam(g, side);
        return withTeam(g, side, {
          ...t,
          players: t.players.map((p) => (p.id === pid ? { ...p, onCourt: !p.onCourt } : p)),
        });
      });
      return;
    }
    setPlayerId((cur) => (cur === pid ? null : pid));
  }

  function setQuarter(q: number) {
    update((g) => ({ ...g, quarter: q }));
  }

  function addOvertime() {
    update((g) => ({ ...g, quarter: quarters.length + 1 }));
  }

  function finish() {
    if (!confirm('試合を終了してスタッツ画面に移動します。よろしいですか？（あとから記録を再開できます）')) return;
    update((g) => ({ ...g, status: 'finished' }));
    location.hash = `#/game/${id}/box`;
  }

  return (
    <div className="page live">
      <header className="app-header">
        <Link className="btn tiny" to="/">← 一覧</Link>
        <Link className="btn tiny" to={`/game/${game.id}/setup`}>選手・設定</Link>
        <Link className="btn tiny" to={`/game/${game.id}/box`}>スタッツ</Link>
      </header>

      <section className="scoreboard compact">
        <button
          className={`sb-team ${side === 'home' ? 'active' : ''}`}
          onClick={() => { setSide('home'); setPlayerId(null); }}
        >
          <span className="sb-name">{game.home.name}</span>
          <span className="sb-score">{homeScore}</span>
          <span className={`sb-fouls ${homeFouls >= 4 ? 'bonus' : ''}`}>
            Q内ファウル {homeFouls}{homeFouls >= 4 ? '・ボーナス' : ''}
          </span>
        </button>

        <button
          className={`sb-team ${side === 'away' ? 'active' : ''}`}
          onClick={() => { setSide('away'); setPlayerId(null); }}
        >
          <span className="sb-name">{game.away.name}</span>
          <span className="sb-score">{awayScore}</span>
          <span className={`sb-fouls ${awayFouls >= 4 ? 'bonus' : ''}`}>
            Q内ファウル {awayFouls}{awayFouls >= 4 ? '・ボーナス' : ''}
          </span>
        </button>
      </section>

      <section className="quarter-bar">
        {quarters.map((q) => (
          <button
            key={q}
            className={`btn quarter ${game.quarter === q ? 'on' : ''}`}
            onClick={() => setQuarter(q)}
          >
            {quarterLabel(q, game.quarterCount)}
          </button>
        ))}
        <button className="btn tiny" onClick={addOvertime}>＋OT</button>
      </section>

      <p className="rec-hint">
        記録中: <strong>{team.name}</strong>（チーム名をタップで切替）→ 選手を選んでプレーをタップ
      </p>

      <section className="players">
        <div className="players-head">
          <span>選手</span>
          <button className={`btn tiny toggle ${subMode ? 'on' : ''}`} onClick={() => setSubMode((s) => !s)}>
            {subMode ? '交代モード中（タップで出場切替）' : '交代モード'}
          </button>
        </div>
        <div className="player-grid">
          <button
            className={`player-card team-card ${playerId === null && !subMode ? 'selected' : ''}`}
            onClick={() => { if (!subMode) setPlayerId(null); }}
          >
            <span className="p-name">チーム</span>
            <span className="p-sub">選手を特定しない記録</span>
          </button>
          {players.map((p) => {
            const s = statMap.get(p.id);
            return (
              <button
                key={p.id}
                className={`player-card ${playerId === p.id ? 'selected' : ''} ${p.onCourt ? 'on-court' : ''}`}
                onClick={() => selectPlayer(p.id)}
              >
                <span className="p-num">#{p.number || '—'}</span>
                <span className="p-name">{p.name || '(名前未設定)'}</span>
                <span className="p-sub">
                  {s?.pts ?? 0}点 / F{s?.pf ?? 0}
                  {(s?.pf ?? 0) >= 5 && <span className="foul-out">退場</span>}
                </span>
              </button>
            );
          })}
        </div>
        {players.length === 0 && (
          <p className="empty small">
            選手が未登録です。「選手・設定」から登録するか、「チーム」のまま記録できます。
          </p>
        )}
      </section>

      <section className="actions">
        <div className="action-target">
          <span className="at-name">{selected ? `#${selected.number} ${selected.name}` : 'チーム記録'}</span>
          {selectedStat && (
            <span className="at-line">
              {selectedStat.pts}点 ・ FG {selectedStat.fg2m + selectedStat.fg3m}/{selectedStat.fg2a + selectedStat.fg3a}
              {' '}・ 3P {selectedStat.fg3m}/{selectedStat.fg3a}
              {' '}・ FT {selectedStat.ftm}/{selectedStat.fta}
              {' '}・ ファウル {selectedStat.pf}
            </span>
          )}
        </div>
        <div className="action-grid shots">
          {SHOT_ACTIONS.map((a) => (
            <button key={a} className={`btn action ${a.endsWith('M') ? 'made' : 'miss'}`} onClick={() => record(a)}>
              {ACTION_META[a].label}
            </button>
          ))}
        </div>
        <div className="action-grid">
          {OTHER_ACTIONS.map((a) => (
            <button key={a} className="btn action other" onClick={() => record(a)}>
              {ACTION_META[a].label}
            </button>
          ))}
        </div>
      </section>

      <section className="log">
        <div className="log-head">
          <span>直近のプレー</span>
          <button className="btn tiny danger" onClick={undoLast} disabled={game.events.length === 0}>
            ↩ 取り消し
          </button>
        </div>
        <ul>
          {recent.map((ev) => {
            const t = sideTeam(game, ev.side);
            const p = t.players.find((x) => x.id === ev.playerId);
            return (
              <li key={ev.id}>
                <span className="log-time">{quarterLabel(ev.quarter, game.quarterCount)}</span>
                <span className="log-team">{t.name}</span>
                <span className="log-player">{p ? `#${p.number} ${p.name}` : 'チーム'}</span>
                <span className="log-act">{ACTION_META[ev.type].label}</span>
                <button className="btn tiny danger" onClick={() => removeEvent(ev.id)}>×</button>
              </li>
            );
          })}
          {recent.length === 0 && <li className="empty small">まだ記録がありません。</li>}
        </ul>
      </section>

      <div className="sticky-bottom">
        <button className="btn big" onClick={finish}>試合終了 → スタッツ</button>
      </div>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
