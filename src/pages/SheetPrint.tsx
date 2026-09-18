import { Fragment } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { Game, Side } from '../types';
import { sideTeam } from '../lib/storage';
import { foulsByQuarter, scoreByQuarter, teamTotal } from '../lib/stats';
import { playerFouls, runningMarks, type RunMark } from '../lib/sheet';
import { useGame } from '../lib/useGame';

const PLAYER_ROWS = 18;
const RUN_ROWS = 40;
const RUN_BLOCKS = 4;

function TeamBlock({ game, side }: { game: Game; side: Side }) {
  const team = sideTeam(game, side);
  const fouls = foulsByQuarter(game, side);
  const players = [...team.players].sort(
    (a, b) => (Number(a.number) || 999) - (Number(b.number) || 999),
  );

  return (
    <div className="ss-team">
      <div className="ss-team-name">
        <span className="ss-label">チーム{side === 'home' ? 'A' : 'B'}／Team {side === 'home' ? 'A' : 'B'}</span>
        <span className="ss-name-value">{team.name}</span>
      </div>

      <div className="ss-team-top">
        <div className="ss-timeouts">
          <div className="ss-label">タイムアウト<br />Time-outs</div>
          <div className="ss-to-grid">
            <div className="ss-to-row two"><i /><i /></div>
            <div className="ss-to-row"><i /><i /><i /></div>
            <div className="ss-to-row"><i /><i /><i /></div>
          </div>
        </div>

        <div className="ss-teamfouls">
          <div className="ss-tf-title">チームファウル　Team fouls</div>
          {[[1, 2], [3, 4]].map((pair) => (
            <div className="ss-tf-line" key={pair[0]}>
              {pair.map((q) => (
                <span className="ss-tf-q" key={q}>
                  <span className="ss-tf-label">クォーター {q}</span>
                  {[1, 2, 3, 4].map((n) => (
                    <i key={n} className={(fouls[q - 1] ?? 0) >= n ? 'used' : ''}>
                      {(fouls[q - 1] ?? 0) >= n ? '✕' : n}
                    </i>
                  ))}
                </span>
              ))}
            </div>
          ))}
          <div className="ss-tf-ot">オーバータイム Over times</div>
        </div>
      </div>

      <table className="ss-players">
        <thead>
          <tr>
            <th className="c-row">No.</th>
            <th className="c-lic">License<br />No.</th>
            <th className="c-name">選手氏名　Name of Players</th>
            <th className="c-num">No.</th>
            <th className="c-in">Player<br />in</th>
            <th colSpan={5} className="c-fouls">ファウル　Fouls</th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: PLAYER_ROWS }, (_, i) => {
            const p = players[i];
            const f = p ? playerFouls(game, side, p.id) : 0;
            return (
              <tr key={i}>
                <td className="c-row">{i + 1}</td>
                <td className="c-lic" />
                <td className="c-name">{p?.name ?? ''}</td>
                <td className="c-num">{p?.number ?? ''}</td>
                <td className="c-in">{p?.played ? '✓' : ''}</td>
                {[1, 2, 3, 4, 5].map((n) => (
                  <td key={n} className="c-foul">{p && f >= n ? 'P' : ''}</td>
                ))}
              </tr>
            );
          })}
          <tr>
            <td colSpan={3} className="c-coach">コーチ　Coach</td>
            <td className="c-num" />
            <td className="c-in" />
            {[1, 2, 3, 4, 5].map((n) => <td key={n} className="c-foul" />)}
          </tr>
          <tr>
            <td colSpan={3} className="c-coach">A.コーチ　A.Coach</td>
            <td className="c-num" />
            <td className="c-in" />
            {[1, 2, 3, 4, 5].map((n) => <td key={n} className="c-foul" />)}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function RunCell({ mark, value }: { mark: RunMark | undefined; value: number }) {
  if (!mark) return <>{value}</>;
  const cls = ['ss-hit', mark.freeThrow ? 'ft' : '', mark.quarterEnd ? 'qend' : ''].filter(Boolean).join(' ');
  return <span className={cls}>{value}</span>;
}

function RunningScore({ game }: { game: Game }) {
  const home = runningMarks(game, 'home');
  const away = runningMarks(game, 'away');

  return (
    <table className="ss-run">
      <thead>
        <tr>
          <th colSpan={RUN_BLOCKS * 4}>ランニングスコア　RUNNING SCORE</th>
        </tr>
        <tr className="ss-run-ab">
          {Array.from({ length: RUN_BLOCKS }, (_, b) => (
            <Fragment key={b}>
              <th colSpan={2}>A</th>
              <th colSpan={2}>B</th>
            </Fragment>
          ))}
        </tr>
      </thead>
      <tbody>
        {Array.from({ length: RUN_ROWS }, (_, r) => (
          <tr key={r}>
            {Array.from({ length: RUN_BLOCKS }, (_, b) => {
              const n = b * RUN_ROWS + r + 1;
              const hm = home.get(n);
              const am = away.get(n);
              return (
                <Fragment key={b}>
                  <td className="c-who">{hm?.number ?? ''}</td>
                  <td className="c-pt"><RunCell mark={hm} value={n} /></td>
                  <td className="c-pt shade"><RunCell mark={am} value={n} /></td>
                  <td className="c-who">{am?.number ?? ''}</td>
                </Fragment>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function SheetPrint() {
  const { id } = useParams();
  const { game, loaded } = useGame(id);

  if (!loaded) return <div className="page"><p className="empty">読み込み中…</p></div>;
  if (!game) return <div className="page"><p className="empty">試合が見つかりません。<Link to="/">一覧へ</Link></p></div>;

  const homeQ = scoreByQuarter(game, 'home');
  const awayQ = scoreByQuarter(game, 'away');
  const homePts = teamTotal(game.events, 'home').pts;
  const awayPts = teamTotal(game.events, 'away').pts;
  const winner = homePts === awayPts ? '' : homePts > awayPts ? game.home.name : game.away.name;
  const [y, m, d] = game.date.split('-');

  return (
    <div className="sheet-page">
      <div className="sheet-toolbar">
        <Link className="btn tiny" to={`/game/${game.id}/box`}>← スタッツ</Link>
        <button className="btn tiny" onClick={() => window.print()}>印刷 / PDF保存</button>
        <span className="hint">A4縦・1枚。ブラウザの印刷画面で「PDFに保存」を選べばPDFになります。</span>
      </div>

      <div className="sheet">
        <div className="ss-title">OFFICIAL SCORESHEET</div>

        <div className="ss-teams">
          <div><span className="ss-label">チームA：</span><span className="ss-name-value">{game.home.name}</span></div>
          <div><span className="ss-label">チームB：</span><span className="ss-name-value">{game.away.name}</span></div>
        </div>

        <div className="ss-meta">
          <div className="ss-meta-row">
            <span className="f w-wide"><i>大会名 Competition</i><b>{game.title}</b></span>
            <span className="f"><i>日付 Date</i><b>{y ? `${y} 年 ${Number(m)} 月 ${Number(d)} 日` : game.date}</b></span>
            <span className="f"><i>時間 Time</i><b /></span>
            <span className="f"><i>クルーチーフ Crew Chief</i><b /></span>
          </div>
          <div className="ss-meta-row">
            <span className="f w-wide"><i>試合No. Game No.</i><b /></span>
            <span className="f"><i>場所 Place</i><b /></span>
            <span className="f"><i>1st アンパイア Umpire 1</i><b /></span>
            <span className="f"><i>2nd アンパイア Umpire 2</i><b /></span>
          </div>
        </div>

        <div className="ss-body">
          <div className="ss-left">
            <TeamBlock game={game} side="home" />
            <TeamBlock game={game} side="away" />
            <table className="ss-signs">
              <tbody>
                {['スコアラー Scorer', 'A.スコアラー A.Scorer', 'タイマー Timer', 'ショットクロックオペレーター S.C.Operator', 'クルーチーフ Crew Chief', '1st アンパイア Umpire 1', '2nd アンパイア Umpire 2'].map((label) => (
                  <tr key={label}><td className="c-sign-label">{label}</td><td /></tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="ss-right">
            <RunningScore game={game} />

            <table className="ss-score">
              <tbody>
                {homeQ.map((v, i) => (
                  <tr key={i}>
                    <td className="c-sc-label">{i < game.quarterCount ? `第${i + 1}クォーター Quarter ${i + 1}` : `オーバータイム Over time ${i - game.quarterCount + 1}`}</td>
                    <td className="c-sc-ab">A</td>
                    <td className="c-sc-v">{v}</td>
                    <td className="c-sc-ab">B</td>
                    <td className="c-sc-v">{awayQ[i]}</td>
                  </tr>
                ))}
                <tr className="ss-final">
                  <td className="c-sc-label">最終スコア Final Score</td>
                  <td className="c-sc-ab">A</td>
                  <td className="c-sc-v">{homePts}</td>
                  <td className="c-sc-ab">B</td>
                  <td className="c-sc-v">{awayPts}</td>
                </tr>
                <tr>
                  <td className="c-sc-label">勝者チーム Name of Winning Team</td>
                  <td colSpan={4} className="c-sc-winner">{winner}</td>
                </tr>
                <tr>
                  <td className="c-sc-label">試合終了時間 Game Ended at (hh:mm)</td>
                  <td colSpan={4} />
                </tr>
              </tbody>
            </table>

            <p className="ss-note">
              ※ このアプリで記録した内容のみ記入しています。ファウルの種類（P/T/U/GD）、タイムアウト、
              審判名、ライセンスNo.、試合終了時間は空欄です。○囲みはフリースロー、太枠はそのクォーター最後の得点。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
