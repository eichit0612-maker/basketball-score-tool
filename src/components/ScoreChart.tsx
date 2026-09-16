import { useEffect, useState } from 'react';
import type { Game } from '../types';
import { eventPoints } from '../lib/stats';
import { quarterLabel } from '../lib/format';

const PAD = { top: 10, right: 12, bottom: 22, left: 32 };

interface Props {
  game: Game;
}

function tickStep(max: number): number {
  if (max <= 30) return 5;
  if (max <= 60) return 10;
  if (max <= 120) return 20;
  return 25;
}

/** スマホでは横の単位数を減らして、軸の文字が小さくなりすぎないようにする */
function useNarrow(): boolean {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 599px)');
    const onChange = () => setNarrow(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return narrow;
}

/**
 * 両チームの累計得点の推移。
 * 時計を持たないので、横軸は「得点が入った順番」。
 */
export default function ScoreChart({ game }: Props) {
  const narrow = useNarrow();
  const W = narrow ? 340 : 640;
  const H = narrow ? 180 : 220;

  const scoring = game.events.filter((e) => eventPoints(e.type) > 0);
  if (scoring.length === 0) return null;

  const n = scoring.length;
  const homePts: number[] = [0];
  const awayPts: number[] = [0];
  let home = 0;
  let away = 0;
  for (const ev of scoring) {
    const p = eventPoints(ev.type);
    if (ev.side === 'home') home += p;
    else away += p;
    homePts.push(home);
    awayPts.push(away);
  }

  const step = tickStep(Math.max(home, away));
  const yMax = Math.max(step, Math.ceil(Math.max(home, away) / step) * step);
  const sx = (i: number) => PAD.left + (i / n) * (W - PAD.left - PAD.right);
  const sy = (y: number) => H - PAD.bottom - (y / yMax) * (H - PAD.top - PAD.bottom);

  // 得点は瞬間的に入るので階段状に描く
  const path = (pts: number[]) => {
    let d = `M ${sx(0)} ${sy(pts[0])}`;
    for (let i = 1; i < pts.length; i++) {
      d += ` L ${sx(i)} ${sy(pts[i - 1])} L ${sx(i)} ${sy(pts[i])}`;
    }
    return d;
  };

  const ticks: number[] = [];
  for (let v = 0; v <= yMax; v += step) ticks.push(v);

  // クォーターの区切りは「そのクォーター最初の得点」の位置に置く
  const quarters = [...new Set(scoring.map((e) => e.quarter))].sort((a, b) => a - b);
  const ranges = quarters.map((q) => {
    const first = scoring.findIndex((e) => e.quarter === q);
    let last = first;
    for (let i = scoring.length - 1; i >= 0; i--) {
      if (scoring[i].quarter === q) { last = i; break; }
    }
    return { q, from: first, to: last + 1 };
  });

  return (
    <div className="score-chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="得点の推移">
        {ticks.map((v) => (
          <g key={v}>
            <line className="sc-grid" x1={PAD.left} y1={sy(v)} x2={W - PAD.right} y2={sy(v)} />
            <text className="sc-tick" x={PAD.left - 6} y={sy(v) + 4} textAnchor="end">{v}</text>
          </g>
        ))}

        {ranges.slice(1).map((r) => (
          <line key={r.q} className="sc-qline" x1={sx(r.from)} y1={PAD.top} x2={sx(r.from)} y2={H - PAD.bottom} />
        ))}

        <path className="sc-line away" d={path(awayPts)} />
        <path className="sc-line home" d={path(homePts)} />

        {ranges.map((r) => (
          <text key={r.q} className="sc-label" x={sx((r.from + r.to) / 2)} y={H - 6} textAnchor="middle">
            {quarterLabel(r.q, game.quarterCount)}
          </text>
        ))}
      </svg>
      <p className="sc-legend">
        <span className="dot home" />{game.home.name} {home}
        <span className="dot away" />{game.away.name} {away}
      </p>
    </div>
  );
}
