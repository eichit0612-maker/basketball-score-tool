import type { Game } from '../types';
import { eventPoints } from '../lib/stats';
import { quarterLabel } from '../lib/format';

const W = 640;
const H = 180;
const PAD = 14;

interface Props {
  game: Game;
}

/** 得点差（HOME - AWAY）の推移。リードの入れ替わりと最大リードが一目で分かる */
export default function MarginChart({ game }: Props) {
  const secPerQ = Math.max(1, game.quarterMinutes * 60);
  const maxQ = Math.max(game.quarterCount, game.quarter, ...game.events.map((e) => e.quarter));
  const totalSec = secPerQ * maxQ;

  const points: { x: number; y: number }[] = [{ x: 0, y: 0 }];
  let home = 0;
  let away = 0;
  let prevT = 0;
  for (const ev of game.events) {
    const p = eventPoints(ev.type);
    if (p === 0) continue;
    if (ev.side === 'home') home += p;
    else away += p;
    // 残り時間を手で直すこともあるので、時刻が巻き戻らないようにする
    const t = Math.min(totalSec, Math.max(prevT, (ev.quarter - 1) * secPerQ + (secPerQ - ev.clock)));
    prevT = t;
    points.push({ x: t, y: home - away });
  }

  if (points.length < 2) return null;

  const margins = points.map((p) => p.y);
  const bound = Math.max(6, ...margins.map(Math.abs));
  const zeroY = H / 2;
  const sx = (x: number) => PAD + (x / totalSec) * (W - PAD * 2);
  const sy = (y: number) => zeroY - (y / bound) * (H / 2 - PAD);

  // 得点は瞬間的に変わるので階段状に描く
  let d = `M ${sx(points[0].x)} ${sy(points[0].y)}`;
  for (let i = 1; i < points.length; i++) {
    d += ` L ${sx(points[i].x)} ${sy(points[i - 1].y)} L ${sx(points[i].x)} ${sy(points[i].y)}`;
  }
  const lastX = sx(points[points.length - 1].x);
  const area = `${d} L ${lastX} ${zeroY} L ${sx(points[0].x)} ${zeroY} Z`;

  const maxHome = Math.max(0, ...margins);
  const maxAway = Math.max(0, ...margins.map((m) => -m));

  return (
    <div className="margin-chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="得点差の推移">
        <defs>
          <clipPath id="mc-top"><rect x="0" y="0" width={W} height={zeroY} /></clipPath>
          <clipPath id="mc-bottom"><rect x="0" y={zeroY} width={W} height={H - zeroY} /></clipPath>
        </defs>

        {Array.from({ length: maxQ - 1 }, (_, i) => (
          <line
            key={i}
            className="mc-grid"
            x1={sx((i + 1) * secPerQ)} y1={PAD / 2}
            x2={sx((i + 1) * secPerQ)} y2={H - PAD / 2}
          />
        ))}
        <line className="mc-zero" x1={PAD} y1={zeroY} x2={W - PAD} y2={zeroY} />

        <path className="mc-area home" d={area} clipPath="url(#mc-top)" />
        <path className="mc-area away" d={area} clipPath="url(#mc-bottom)" />
        <path className="mc-line" d={d} />

        {Array.from({ length: maxQ }, (_, i) => (
          <text key={i} className="mc-label" x={sx((i + 0.5) * secPerQ)} y={H - 2} textAnchor="middle">
            {quarterLabel(i + 1, game.quarterCount)}
          </text>
        ))}
      </svg>
      <p className="mc-legend">
        <span className="dot home" />{game.home.name} 最大 +{maxHome}
        <span className="dot away" />{game.away.name} 最大 +{maxAway}
      </p>
    </div>
  );
}
