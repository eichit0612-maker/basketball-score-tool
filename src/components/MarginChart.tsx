import type { Game } from '../types';
import { eventPoints } from '../lib/stats';
import { quarterLabel } from '../lib/format';

const W = 640;
const H = 180;
const PAD = 14;

interface Props {
  game: Game;
}

/**
 * 得点差（HOME - AWAY）の推移。
 * 時計を持たないので、横軸は「得点が入った順番」。
 */
export default function MarginChart({ game }: Props) {
  const scoring = game.events.filter((e) => eventPoints(e.type) > 0);
  if (scoring.length < 2) return null;

  const n = scoring.length;
  const points: { x: number; y: number }[] = [{ x: 0, y: 0 }];
  let home = 0;
  let away = 0;
  scoring.forEach((ev, i) => {
    const p = eventPoints(ev.type);
    if (ev.side === 'home') home += p;
    else away += p;
    points.push({ x: (i + 1) / n, y: home - away });
  });

  const margins = points.map((p) => p.y);
  const bound = Math.max(6, ...margins.map(Math.abs));
  const zeroY = H / 2;
  const sx = (x: number) => PAD + x * (W - PAD * 2);
  const sy = (y: number) => zeroY - (y / bound) * (H / 2 - PAD);

  // 得点は瞬間的に変わるので階段状に描く
  let d = `M ${sx(points[0].x)} ${sy(points[0].y)}`;
  for (let i = 1; i < points.length; i++) {
    d += ` L ${sx(points[i].x)} ${sy(points[i - 1].y)} L ${sx(points[i].x)} ${sy(points[i].y)}`;
  }
  const area = `${d} L ${sx(points[points.length - 1].x)} ${zeroY} L ${sx(points[0].x)} ${zeroY} Z`;

  // クォーターの区切りは「そのクォーター最初の得点」の位置に置く
  const quarters = [...new Set(scoring.map((e) => e.quarter))].sort((a, b) => a - b);
  const ranges = quarters.map((q) => {
    const first = scoring.findIndex((e) => e.quarter === q);
    let last = first;
    for (let i = scoring.length - 1; i >= 0; i--) {
      if (scoring[i].quarter === q) { last = i; break; }
    }
    return { q, from: first / n, to: (last + 1) / n };
  });

  const maxHome = Math.max(0, ...margins);
  const maxAway = Math.max(0, ...margins.map((m) => -m));

  return (
    <div className="margin-chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="得点差の推移">
        <defs>
          <clipPath id="mc-top"><rect x="0" y="0" width={W} height={zeroY} /></clipPath>
          <clipPath id="mc-bottom"><rect x="0" y={zeroY} width={W} height={H - zeroY} /></clipPath>
        </defs>

        {ranges.slice(1).map((r) => (
          <line key={r.q} className="mc-grid" x1={sx(r.from)} y1={PAD / 2} x2={sx(r.from)} y2={H - PAD / 2} />
        ))}
        <line className="mc-zero" x1={PAD} y1={zeroY} x2={W - PAD} y2={zeroY} />

        <path className="mc-area home" d={area} clipPath="url(#mc-top)" />
        <path className="mc-area away" d={area} clipPath="url(#mc-bottom)" />
        <path className="mc-line" d={d} />

        {ranges.map((r) => (
          <text key={r.q} className="mc-label" x={sx((r.from + r.to) / 2)} y={H - 2} textAnchor="middle">
            {quarterLabel(r.q, game.quarterCount)}
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
