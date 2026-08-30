import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { Game } from '../types';
import { deleteGame, loadGames, newGame, upsertGame } from '../lib/storage';
import { score } from '../lib/stats';

export default function Home() {
  const [games, setGames] = useState<Game[]>([]);
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

  return (
    <div className="page">
      <header className="app-header">
        <h1>🏀 バスケ スコア記録</h1>
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

      <p className="note">データはこのブラウザ内（localStorage）に保存されます。</p>
    </div>
  );
}
