import { Fragment } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { Game, Side } from '../types';
import { sideTeam } from '../lib/storage';
import { foulsByQuarter, scoreByQuarter, teamTotal } from '../lib/stats';
import { playerFouls, quarterPen, runningScore, type RunMark } from '../lib/sheet';
import { useGame } from '../lib/useGame';

const PLAYER_ROWS = 18;
const FOUL_CELLS = 5;
const RUN_ROWS = 40;
const RUN_BLOCKS = 4;

// ランニングスコア表の実寸（mm）。斜線の重ね描きで位置を計算するため固定する
const RUN_W_WHO = 4.2;
const RUN_W_PT = 5.8;
const RUN_BLOCK_W = RUN_W_WHO * 2 + RUN_W_PT * 2;
const RUN_HEAD_H = 7.6;
const RUN_ROW_H = 3.4;
const RUN_TABLE_W = RUN_BLOCK_W * RUN_BLOCKS;
const RUN_TABLE_H = RUN_HEAD_H + RUN_ROW_H * RUN_ROWS;

function TeamBlock({ game, side }: { game: Game; side: Side }) {
  const team = sideTeam(game, side);
  const teamFouls = foulsByQuarter(game, side);
  // 未使用欄に線を引くのはゲーム終了時の処理
  const finished = game.status === 'finished';
  // 公式シートはユニフォーム番号順に記入する
  const players = [...team.players].sort(
    (a, b) => (Number(a.number) || 999) - (Number(b.number) || 999),
  ).slice(0, PLAYER_ROWS);
  const emptyRows = PLAYER_ROWS - players.length;

  return (
    <div className="ss-team">
      <div className="ss-team-name">
        <span className="ss-label">チーム{side === 'home' ? 'A' : 'B'}<br />Team {side === 'home' ? 'A' : 'B'}</span>
        <span className="ss-name-value">{team.name}</span>
      </div>

      <div className="ss-team-top">
        <div className="ss-timeouts">
          <div className="ss-label">タイムアウト<br />Time-outs</div>
          <div className="ss-to-grid">
            <div className="ss-to-row"><i /><i /></div>
            <div className="ss-to-row"><i /><i /><i /></div>
            <div className="ss-to-row"><i /><i /><i /></div>
          </div>
        </div>

        <div className="ss-teamfouls">
          <div className="ss-tf-title">チームファウル　Team fouls</div>
          {[[1, 2], [3, 4]].map((pair) => (
            <div className="ss-tf-line" key={pair[0]}>
              {pair.map((q) => {
                const used = teamFouls[q - 1] ?? 0;
                const pen = quarterPen(q, game.quarterCount);
                const played = q <= game.quarter || used > 0;
                return (
                  <span className="ss-tf-q" key={q}>
                    <span className="ss-tf-label">クォーター {q}</span>
                    {[1, 2, 3, 4].map((n) => (
                      <i
                        key={n}
                        className={used >= n ? `mark ${pen}` : played ? 'unused' : ''}
                      >
                        {used >= n ? '✕' : n}
                      </i>
                    ))}
                  </span>
                );
              })}
            </div>
          ))}
          <div className="ss-tf-ot">オーバータイム Over times</div>
        </div>
      </div>

      <table className="ss-players">
        <thead>
          <tr>
            <th className="c-row">No.</th>
            <th className="c-lic">Licence<br />no.</th>
            <th className="c-name">選手氏名 Players</th>
            <th className="c-num">No.</th>
            <th className="c-in">Player<br />in</th>
            <th colSpan={FOUL_CELLS} className="c-fouls">ファウル　Fouls</th>
          </tr>
        </thead>
        <tbody>
          {players.map((p, i) => {
            const fouls = playerFouls(game, side, p.id);
            return (
              <tr key={p.id}>
                <td className="c-row">{i + 1}</td>
                <td className="c-lic" />
                <td className="c-name">{p.name}</td>
                <td className="c-num">{p.number}</td>
                <td className="c-in">
                  {p.starter ? <span className="ss-in starter">✕</span>
                    : p.played ? <span className="ss-in">✕</span> : ''}
                </td>
                {Array.from({ length: FOUL_CELLS }, (_, n) => {
                  const f = fouls[n];
                  if (!f) return <td key={n} className={`c-foul ${finished ? 'unused' : ''}`} />;
                  return (
                    <td key={n} className={`c-foul ${f.pen} ${f.firstHalf ? 'boxed' : ''}`}>P</td>
                  );
                })}
              </tr>
            );
          })}

          {emptyRows > 0 && Array.from({ length: emptyRows }, (_, i) => (
            <tr key={`e${i}`} className={i === 0 ? 'ss-empty first' : 'ss-empty'}>
              <td className="c-row">{players.length + i + 1}</td>
              <td className="c-lic" />
              <td className="c-name" />
              <td className="c-num" />
              <td className="c-in" />
              {i === 0 && (
                <td className="c-foul-empty" colSpan={FOUL_CELLS} rowSpan={emptyRows} />
              )}
            </tr>
          ))}

          {['コーチ Coach', 'A.コーチ A.Coach'].map((label) => (
            <tr key={label}>
              <td colSpan={2} className="c-coach">{label}</td>
              <td className="c-name" />
              <td className="c-num" />
              <td className="c-in" />
              {Array.from({ length: FOUL_CELLS }, (_, n) => (
                <td key={n} className={`c-foul ${finished ? 'unused' : ''}`} />
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RunNumber({ mark, value }: { mark: RunMark | undefined; value: number }) {
  if (!mark) return <>{value}</>;
  const cls = [
    'ss-hit',
    mark.pen,
    mark.points === 1 ? 'ft' : 'fg',
    mark.quarterEnd ? 'qend' : '',
  ].filter(Boolean).join(' ');
  return <span className={cls}>{value}</span>;
}

function RunWho({ mark }: { mark: RunMark | undefined }) {
  if (!mark || !mark.number) return null;
  // 3点は得点者の番号を○で囲む
  return <span className={`ss-who ${mark.pen} ${mark.points === 3 ? 'three' : ''}`}>{mark.number}</span>;
}

/** 最終得点より後ろの空欄に引く斜線（ブロックごとに1本） */
function tailLines(total: number): { block: number; y1: number; y2: number }[] {
  const lines: { block: number; y1: number; y2: number }[] = [];
  for (let b = 0; b < RUN_BLOCKS; b++) {
    const startRow = Math.max(0, total - b * RUN_ROWS);
    if (startRow >= RUN_ROWS) continue;
    lines.push({
      block: b,
      y1: RUN_HEAD_H + startRow * RUN_ROW_H,
      y2: RUN_HEAD_H + RUN_ROWS * RUN_ROW_H,
    });
  }
  return lines;
}

function RunningScoreTable({ game }: { game: Game }) {
  const home = runningScore(game, 'home');
  const away = runningScore(game, 'away');
  const finished = game.status === 'finished';

  return (
    <div className="ss-run-wrap" style={{ width: `${RUN_TABLE_W}mm`, height: `${RUN_TABLE_H}mm` }}>
      <table className="ss-run">
        <colgroup>
          {Array.from({ length: RUN_BLOCKS }, (_, b) => (
            <Fragment key={b}>
              <col style={{ width: `${RUN_W_WHO}mm` }} />
              <col style={{ width: `${RUN_W_PT}mm` }} />
              <col style={{ width: `${RUN_W_PT}mm` }} />
              <col style={{ width: `${RUN_W_WHO}mm` }} />
            </Fragment>
          ))}
        </colgroup>
        <thead>
          <tr className="ss-run-title">
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
                const hm = home.marks.get(n);
                const am = away.marks.get(n);
                const hEnd = hm?.quarterEnd ? (hm.gameEnd ? 'game-end' : 'q-end') : '';
                const aEnd = am?.quarterEnd ? (am.gameEnd ? 'game-end' : 'q-end') : '';
                return (
                  <Fragment key={b}>
                    <td className={`c-who ${hEnd}`}><RunWho mark={hm} /></td>
                    <td className={`c-pt ${hEnd}`}><RunNumber mark={hm} value={n} /></td>
                    <td className={`c-pt shade ${aEnd}`}><RunNumber mark={am} value={n} /></td>
                    <td className={`c-who ${aEnd}`}><RunWho mark={am} /></td>
                  </Fragment>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      {/* ゲーム終了後、残りの欄に引く斜線（チームごと・ブロックごとに1本） */}
      {finished && <svg
        className="ss-run-tails"
        viewBox={`0 0 ${RUN_TABLE_W} ${RUN_TABLE_H}`}
        preserveAspectRatio="none"
      >
        {[{ side: 'home' as const, total: home.total }, { side: 'away' as const, total: away.total }].map(({ side, total }) =>
          tailLines(total).map((l) => {
            // チームAは外側＋数字の2列、チームBは数字＋外側の2列にかかる
            const base = l.block * RUN_BLOCK_W + (side === 'home' ? 0 : RUN_W_WHO + RUN_W_PT);
            return (
              <line
                key={`${side}-${l.block}`}
                x1={base}
                y1={l.y1}
                x2={base + RUN_W_WHO + RUN_W_PT}
                y2={l.y2}
                stroke="#000"
                strokeWidth="0.35"
              />
            );
          }),
        )}
      </svg>}
    </div>
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
  const hasOt = homeQ.length > game.quarterCount;
  const otHome = homeQ.slice(game.quarterCount).reduce((a, b) => a + b, 0);
  const otAway = awayQ.slice(game.quarterCount).reduce((a, b) => a + b, 0);

  return (
    <div className="sheet-page">
      <div className="sheet-toolbar">
        <Link className="btn tiny" to={`/game/${game.id}/box`}>← スタッツ</Link>
        <button className="btn tiny" onClick={() => window.print()}>印刷 / PDF保存</button>
        <span className="hint">A4縦1枚。印刷画面で「背景のグラフィック」をオンにすると色と網掛けも出ます。</span>
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
            <span className="f"><i>日付 Date</i><b>{y ? `${y}年${Number(m)}月${Number(d)}日` : game.date}</b></span>
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
            <RunningScoreTable game={game} />

            <table className="ss-score">
              <tbody>
                {Array.from({ length: game.quarterCount }, (_, i) => {
                  const pen = quarterPen(i + 1, game.quarterCount);
                  return (
                    <tr key={i}>
                      <td className="c-sc-label">第{i + 1}クォーター Quarter {i + 1}</td>
                      <td className="c-sc-ab">A</td>
                      <td className={`c-sc-v ${pen}`}>{homeQ[i] ?? 0}</td>
                      <td className="c-sc-ab">B</td>
                      <td className={`c-sc-v ${pen}`}>{awayQ[i] ?? 0}</td>
                    </tr>
                  );
                })}
                <tr>
                  <td className="c-sc-label">オーバータイム Over time</td>
                  <td className="c-sc-ab">A</td>
                  <td className="c-sc-v dark">{hasOt ? otHome : '／'}</td>
                  <td className="c-sc-ab">B</td>
                  <td className="c-sc-v dark">{hasOt ? otAway : '／'}</td>
                </tr>
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
              JBA TOマニュアル（2024年4月）の記入方法に準拠：第1Q・第3Qは赤、第2Q・第4Q・OTは黒。
              フリースローは●、2点は斜線、3点は斜線＋番号を○。各Q最後の得点は太い○と横線、
              最終得点は2本線。先発の Player in は✕に赤○、途中出場は✕のみ。<br />
              このアプリで記録していない項目（ファウルの種類と本数、タイムアウト、審判・コーチ名、
              ライセンスno.、試合終了時間、途中出場したクォーター）は空欄のままです。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
