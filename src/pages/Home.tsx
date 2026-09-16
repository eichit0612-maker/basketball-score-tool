import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { Game } from '../types';
import { deleteGame, loadGames, newGame, upsertGame } from '../lib/storage';
import { score } from '../lib/stats';
import { exportBackup, importBackup } from '../lib/backup';
import { applyTheme, loadTheme, UI_THEMES, type UiTheme } from '../lib/theme';

export default function Home() {
  const [games, setGames] = useState<Game[]>([]);
  const [message, setMessage] = useState('');
  const [theme, setTheme] = useState<UiTheme>(() => loadTheme());
  const fileRef = useRef<HTMLInputElement>(null);
  const nav = useNavigate();

  useEffect(() => setGames(loadGames()), []);

  function create() {
    const g = newGame();
    upsertGame(g);
    nav(`/game/${g.id}/setup`);
  }

  function remove(g: Game) {
    if (!confirm(`「${g.home.name} vs ${g.away.name}」を削除します。よろしいですか？`)) return;
    deleteGame(g.id);
    setGames(loadGames());
  }

  async function onImport(file: File) {
    try {
      const r = importBackup(await file.text());
      setGames(loadGames());
      setMessage(`復元しました：試合 ${r.addedGames}件を追加 / ${r.updatedGames}件を更新、名簿 ${r.addedRosters}件を追加`);
    } catch (e) {
      setMessage(e instanceof Error ? `復元できませんでした：${e.message}` : '復元できませんでした。');
    }
    if (fileRef.current) fileRef.current.value = '';
  }

  return (
    <div className="page">
      <header className="app-header">
        <h1>バスケ スコア記録</h1>
        <Link className="btn tiny" to="/season">シーズン集計</Link>
      </header>

      <button className="btn primary big" onClick={create}>＋ 新しい試合をはじめる</button>

      <h2 className="section-title">試合一覧（{games.length}件）</h2>

      {games.length === 0 && (
        <p className="empty">まだ試合がありません。上のボタンから作成してください。</p>
      )}

      <ul className="game-list">
        {games.map((g) => {
          const h = score(g, 'home');
          const a = score(g, 'away');
          const dest = g.status === 'setup' ? 'setup' : g.status === 'live' ? 'live' : 'box';
          return (
            <li key={g.id} className="game-card">
              <Link to={`/game/${g.id}/${dest}`} className="game-card-main">
                <div className="game-meta">
                  <span>{g.date}</span>
                  {g.title && <span className="tag">{g.title}</span>}
                  <span className={`tag status-${g.status}`}>
                    {g.status === 'setup' ? '準備中' : g.status === 'live' ? '記録中' : '終了'}
                  </span>
                </div>
                <div className="game-score">
                  <span className={`team ${h > a ? 'win' : ''}`}>{g.home.name}</span>
                  <span className="num">{h}</span>
                  <span className="dash">-</span>
                  <span className="num">{a}</span>
                  <span className={`team ${a > h ? 'win' : ''}`}>{g.away.name}</span>
                </div>
              </Link>
              <div className="game-card-actions">
                <Link className="btn tiny" to={`/game/${g.id}/box`}>スタッツ</Link>
                <button className="btn tiny danger" onClick={() => remove(g)}>削除</button>
              </div>
            </li>
          );
        })}
      </ul>

      <section className="card">
        <h3 className="box-title">表示</h3>
        <div className="ui-picker">
          {UI_THEMES.map((t) => (
            <button
              key={t.id}
              className={`ui-option ${theme === t.id ? 'on' : ''}`}
              onClick={() => { applyTheme(t.id); setTheme(t.id); }}
            >
              <span className="ui-name">{t.label}</span>
              <span className="ui-note">{t.note}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="card backup">
        <h3 className="box-title">バックアップ</h3>
        <p className="hint">
          データはこのブラウザ内にだけ保存されます。機種変更やデータ削除に備えて、ときどき書き出してください。
        </p>
        <div className="row gap">
          <button className="btn" onClick={exportBackup} disabled={games.length === 0}>ファイルに書き出す</button>
          <button className="btn" onClick={() => fileRef.current?.click()}>ファイルから復元</button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void onImport(f);
            }}
          />
        </div>
        {message && <p className="hint message">{message}</p>}
      </section>
    </div>
  );
}
