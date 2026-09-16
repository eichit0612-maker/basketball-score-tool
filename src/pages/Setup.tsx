import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type { Game, Side } from '../types';
import { newPlayer, sideTeam, withTeam } from '../lib/storage';
import { loadRosters, rosterToPlayers, saveRoster } from '../lib/rosters';
import { useGame } from '../lib/useGame';

export default function Setup() {
  const { id } = useParams();
  const { game, loaded, update } = useGame(id);
  const nav = useNavigate();
  const [bulkSide, setBulkSide] = useState<Side | null>(null);
  const [bulkText, setBulkText] = useState('');
  const [rosters, setRosters] = useState(() => loadRosters());
  const [rosterMsg, setRosterMsg] = useState('');

  if (!loaded) return <div className="page"><p className="empty">読み込み中…</p></div>;
  if (!game) return <div className="page"><p className="empty">試合が見つかりません。<Link to="/">一覧へ</Link></p></div>;

  const started = game.status !== 'setup';

  function patch(fn: (g: Game) => Game) {
    update(fn);
  }

  function addPlayer(side: Side) {
    patch((g) => {
      const team = sideTeam(g, side);
      return withTeam(g, side, { ...team, players: [...team.players, newPlayer()] });
    });
  }

  function updatePlayer(side: Side, pid: string, key: 'number' | 'name', value: string) {
    patch((g) => {
      const team = sideTeam(g, side);
      return withTeam(g, side, {
        ...team,
        players: team.players.map((p) => (p.id === pid ? { ...p, [key]: value } : p)),
      });
    });
  }

  function toggleOnCourt(side: Side, pid: string) {
    patch((g) => {
      const team = sideTeam(g, side);
      return withTeam(g, side, {
        ...team,
        players: team.players.map((p) => (p.id === pid ? { ...p, onCourt: !p.onCourt } : p)),
      });
    });
  }

  function removePlayer(side: Side, pid: string) {
    patch((g) => {
      const team = sideTeam(g, side);
      return withTeam(g, side, { ...team, players: team.players.filter((p) => p.id !== pid) });
    });
  }

  function applyRoster(side: Side, rosterId: string) {
    const roster = rosters.find((r) => r.id === rosterId);
    if (!roster) return;
    const current = sideTeam(game!, side);
    if (current.players.length > 0 && !confirm(`「${roster.name}」の名簿（${roster.players.length}人）で置き換えます。よろしいですか？`)) return;
    patch((g) => withTeam(g, side, { name: roster.name, players: rosterToPlayers(roster) }));
    setRosterMsg(`「${roster.name}」を読み込みました。`);
  }

  function storeRoster(side: Side) {
    const team = sideTeam(game!, side);
    saveRoster(team);
    setRosters(loadRosters());
    setRosterMsg(`「${team.name}」の名簿を保存しました。次の試合から読み込めます。`);
  }

  function applyBulk(side: Side) {
    const lines = bulkText.split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) { setBulkSide(null); return; }
    patch((g) => {
      const team = sideTeam(g, side);
      const added = lines.map((line) => {
        const m = line.match(/^(\d+)[\s,、.]+(.*)$/);
        return m ? newPlayer(m[1], m[2].trim()) : newPlayer('', line);
      });
      return withTeam(g, side, { ...team, players: [...team.players, ...added] });
    });
    setBulkText('');
    setBulkSide(null);
  }

  function start() {
    patch((g) => ({ ...g, status: 'live' }));
    nav(`/game/${id}/live`);
  }

  function renderTeam(side: Side) {
    const team = sideTeam(game!, side);
    const onCourtCount = team.players.filter((p) => p.onCourt).length;
    return (
      <section className="card" key={side}>
        <div className="team-head">
          <span className={`side-badge ${side}`}>{side === 'home' ? 'HOME' : 'AWAY'}</span>
          <input
            className="input team-name"
            value={team.name}
            placeholder="チーム名"
            onChange={(e) => patch((g) => withTeam(g, side, { ...sideTeam(g, side), name: e.target.value }))}
          />
        </div>

        <div className="roster-io">
          <select
            className="input"
            value=""
            onChange={(e) => applyRoster(side, e.target.value)}
          >
            <option value="">保存済みの名簿から読み込む…</option>
            {rosters.map((r) => (
              <option key={r.id} value={r.id}>{r.name}（{r.players.length}人）</option>
            ))}
          </select>
          <button className="btn" onClick={() => storeRoster(side)} disabled={team.players.length === 0}>
            この名簿を保存
          </button>
        </div>

        <div className="roster-head">
          <span>選手 {team.players.length}人 / 出場中 {onCourtCount}人</span>
          <span className="hint">「出」= コート上（記録画面で上に並びます）</span>
        </div>

        <ul className="roster">
          {team.players.map((p) => (
            <li key={p.id} className="roster-row">
              <button
                className={`btn tiny toggle ${p.onCourt ? 'on' : ''}`}
                onClick={() => toggleOnCourt(side, p.id)}
                title="コート上かどうか"
              >
                出
              </button>
              <input
                className="input num-input"
                value={p.number}
                inputMode="numeric"
                placeholder="#"
                onChange={(e) => updatePlayer(side, p.id, 'number', e.target.value)}
              />
              <input
                className="input"
                value={p.name}
                placeholder="選手名"
                onChange={(e) => updatePlayer(side, p.id, 'name', e.target.value)}
              />
              <button className="btn tiny danger" onClick={() => removePlayer(side, p.id)}>×</button>
            </li>
          ))}
        </ul>

        <div className="row gap">
          <button className="btn" onClick={() => addPlayer(side)}>＋ 選手を追加</button>
          <button className="btn" onClick={() => { setBulkSide(side); setBulkText(''); }}>まとめて入力</button>
        </div>

        {bulkSide === side && (
          <div className="bulk">
            <p className="hint">1行に1人。「4 山田太郎」のように背番号→名前の順で入力してください。</p>
            <textarea
              className="input"
              rows={6}
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              placeholder={'4 山田太郎\n7 佐藤次郎\n10 鈴木三郎'}
            />
            <div className="row gap">
              <button className="btn primary" onClick={() => applyBulk(side)}>追加する</button>
              <button className="btn" onClick={() => setBulkSide(null)}>キャンセル</button>
            </div>
          </div>
        )}
      </section>
    );
  }

  return (
    <div className="page">
      <header className="app-header">
        <Link className="btn tiny" to="/">← 一覧</Link>
        <h1>試合の設定</h1>
      </header>

      <section className="card">
        <div className="field-row">
          <label className="field">
            <span>日付</span>
            <input
              className="input"
              type="date"
              value={game.date}
              onChange={(e) => patch((g) => ({ ...g, date: e.target.value }))}
            />
          </label>
          <label className="field">
            <span>大会名・メモ</span>
            <input
              className="input"
              value={game.title}
              placeholder="例: 県大会1回戦"
              onChange={(e) => patch((g) => ({ ...g, title: e.target.value }))}
            />
          </label>
        </div>
        <div className="field-row">
          <label className="field">
            <span>クォーター数</span>
            <input
              className="input"
              type="number"
              min={1}
              max={8}
              value={game.quarterCount}
              onChange={(e) => patch((g) => ({ ...g, quarterCount: Math.max(1, Number(e.target.value) || 1) }))}
            />
          </label>
        </div>
      </section>

      {renderTeam('home')}
      {renderTeam('away')}

      {rosterMsg && <p className="hint message">{rosterMsg}</p>}

      <p className="note">相手チームの選手を登録しない場合も、「チーム」としてまとめて記録できます。</p>

      <div className="sticky-bottom">
        <button className="btn primary big" onClick={start}>
          {started ? '記録画面に戻る' : '記録をはじめる'}
        </button>
      </div>
    </div>
  );
}
