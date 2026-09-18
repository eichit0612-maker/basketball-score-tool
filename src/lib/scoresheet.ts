import type { Game, Side, StatLine } from '../types';
import { EMPTY_STAT, eventPoints, foulsByQuarter, pct, scoreByQuarter, statsBySide, TEAM_KEY, teamTotal } from './stats';
import { sideTeam } from './storage';
import { quarterLabel } from './format';

type ExcelJSNamespace = typeof import('exceljs');
type Workbook = InstanceType<ExcelJSNamespace['Workbook']>;
type Worksheet = ReturnType<Workbook['addWorksheet']>;
type Row = ReturnType<Worksheet['addRow']>;

const THIN = { style: 'thin' as const, color: { argb: 'FF808080' } };
const MEDIUM = { style: 'medium' as const, color: { argb: 'FF333333' } };
const HEAD_FILL = { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FFEDEDED' } };

const COLUMN_WIDTHS = [6, 20, 6, 7, 9, 9, 9, 8, 5];
const PLAYER_HEADER = ['No.', '選手名', '先発', '得点', '2P', '3P', 'FT', 'FG%', 'F'];

function box(row: Row, from = 1, to = 9): void {
  for (let c = from; c <= to; c++) {
    row.getCell(c).border = { top: THIN, left: THIN, bottom: THIN, right: THIN };
  }
}

function statRow(stat: StatLine): (string | number)[] {
  return [
    stat.pts,
    `${stat.fg2m}/${stat.fg2a}`,
    `${stat.fg3m}/${stat.fg3a}`,
    `${stat.ftm}/${stat.fta}`,
    pct(stat.fg2m + stat.fg3m, stat.fg2a + stat.fg3a),
    stat.pf,
  ];
}

/** チーム1つ分の選手表を書き出し、次に書き始める行番号を返す */
function writeTeamTable(ws: Worksheet, game: Game, side: Side, startRow: number): number {
  const team = sideTeam(game, side);
  const map = statsBySide(game.events, side);
  const total = teamTotal(game.events, side);
  let r = startRow;

  ws.mergeCells(r, 1, r, 9);
  const title = ws.getCell(r, 1);
  title.value = `${side === 'home' ? 'チームA' : 'チームB'}　${team.name}　（${total.pts}点）`;
  title.font = { bold: true, size: 12 };
  title.alignment = { vertical: 'middle' };
  ws.getRow(r).height = 20;
  r++;

  const head = ws.getRow(r);
  head.values = PLAYER_HEADER;
  head.font = { bold: true, size: 10 };
  head.alignment = { horizontal: 'center' };
  head.eachCell((cell) => {
    cell.fill = HEAD_FILL;
    cell.border = { top: MEDIUM, left: THIN, bottom: MEDIUM, right: THIN };
  });
  r++;

  // 出場した選手を得点順、未出場は背番号順で最後にまとめる
  const players = [...team.players].sort((a, b) => {
    if (a.played !== b.played) return Number(b.played) - Number(a.played);
    if (!a.played) return (Number(a.number) || 999) - (Number(b.number) || 999);
    return (map.get(b.id)?.pts ?? 0) - (map.get(a.id)?.pts ?? 0);
  });

  for (const p of players) {
    const s = map.get(p.id);
    const row = ws.getRow(r);
    if (s || p.played) {
      // 出場していれば記録が無くても0で埋める（未出場と区別するため）
      row.values = [p.number, p.name, p.starter ? '○' : '', ...statRow(s ?? EMPTY_STAT)];
    } else {
      row.values = [p.number, p.name, '', '欠', '', '', '', '', ''];
    }
    row.alignment = { horizontal: 'center' };
    row.getCell(2).alignment = { horizontal: 'left' };
    if (!p.played) row.font = { color: { argb: 'FF999999' } };
    box(row);
    r++;
  }

  const teamOnly = map.get(TEAM_KEY);
  if (teamOnly) {
    const row = ws.getRow(r);
    row.values = ['', 'チーム記録', '', ...statRow(teamOnly)];
    row.alignment = { horizontal: 'center' };
    row.getCell(2).alignment = { horizontal: 'left' };
    row.font = { color: { argb: 'FF666666' } };
    box(row);
    r++;
  }

  const totalRow = ws.getRow(r);
  totalRow.values = ['', '合計', '', ...statRow(total)];
  totalRow.font = { bold: true };
  totalRow.alignment = { horizontal: 'center' };
  totalRow.getCell(2).alignment = { horizontal: 'left' };
  totalRow.eachCell((cell) => {
    cell.border = { top: MEDIUM, left: THIN, bottom: MEDIUM, right: THIN };
  });
  r += 2;

  return r;
}

function writeSummary(ws: Worksheet, game: Game, startRow: number): number {
  const homeQ = scoreByQuarter(game, 'home');
  const awayQ = scoreByQuarter(game, 'away');
  const homeF = foulsByQuarter(game, 'home');
  const awayF = foulsByQuarter(game, 'away');
  const qCount = homeQ.length;
  let r = startRow;

  const head = ws.getRow(r);
  head.values = ['', '', ...homeQ.map((_, i) => quarterLabel(i + 1, game.quarterCount)), '計'];
  head.font = { bold: true, size: 10 };
  head.alignment = { horizontal: 'center' };
  for (let c = 3; c <= qCount + 3; c++) {
    head.getCell(c).fill = HEAD_FILL;
    head.getCell(c).border = { top: MEDIUM, left: THIN, bottom: MEDIUM, right: THIN };
  }
  r++;

  const rows: [string, number[], number][] = [
    [`${game.home.name}　得点`, homeQ, homeQ.reduce((a, b) => a + b, 0)],
    [`${game.away.name}　得点`, awayQ, awayQ.reduce((a, b) => a + b, 0)],
    [`${game.home.name}　チームファウル`, homeF, homeF.reduce((a, b) => a + b, 0)],
    [`${game.away.name}　チームファウル`, awayF, awayF.reduce((a, b) => a + b, 0)],
  ];

  for (const [label, values, sum] of rows) {
    ws.mergeCells(r, 1, r, 2);
    const row = ws.getRow(r);
    ws.getCell(r, 1).value = label;
    ws.getCell(r, 1).font = { size: 10 };
    for (let i = 0; i < values.length; i++) row.getCell(3 + i).value = values[i];
    row.getCell(qCount + 3).value = sum;
    row.getCell(qCount + 3).font = { bold: true };
    row.alignment = { horizontal: 'center' };
    ws.getCell(r, 1).alignment = { horizontal: 'left' };
    for (let c = 1; c <= qCount + 3; c++) {
      row.getCell(c).border = { top: THIN, left: THIN, bottom: THIN, right: THIN };
    }
    r++;
  }

  return r + 1;
}

/** 得点が入った順に、両チームの累計得点と得点者を並べる */
function writeRunningScore(wb: Workbook, game: Game): void {
  const ws = wb.addWorksheet('ランニングスコア');
  ws.columns = [
    { width: 6 }, { width: 8 }, { width: 18 }, { width: 22 }, { width: 8 }, { width: 10 }, { width: 10 },
  ];
  ws.pageSetup = { paperSize: 9, orientation: 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 0 };

  const head = ws.getRow(1);
  head.values = ['Q', 'チーム', '選手', '', '得点', `${game.home.name}`, `${game.away.name}`];
  ws.mergeCells(1, 3, 1, 4);
  head.font = { bold: true };
  head.alignment = { horizontal: 'center' };
  for (let c = 1; c <= 7; c++) {
    head.getCell(c).fill = HEAD_FILL;
    head.getCell(c).border = { top: MEDIUM, left: THIN, bottom: MEDIUM, right: THIN };
  }

  let home = 0;
  let away = 0;
  let r = 2;
  for (const ev of game.events) {
    const pts = eventPoints(ev.type);
    if (pts === 0) continue;
    if (ev.side === 'home') home += pts;
    else away += pts;

    const team = sideTeam(game, ev.side);
    const p = team.players.find((x) => x.id === ev.playerId);
    const row = ws.getRow(r);
    row.values = [
      quarterLabel(ev.quarter, game.quarterCount),
      team.name,
      p ? `#${p.number}` : 'チーム',
      p ? p.name : '',
      pts,
      home,
      away,
    ];
    row.alignment = { horizontal: 'center' };
    row.getCell(4).alignment = { horizontal: 'left' };
    // 得点した側の累計を太字にして、どちらが入れたか追いやすくする
    row.getCell(ev.side === 'home' ? 6 : 7).font = { bold: true };
    for (let c = 1; c <= 7; c++) {
      row.getCell(c).border = { top: THIN, left: THIN, bottom: THIN, right: THIN };
    }
    r++;
  }

  if (r === 2) {
    ws.getCell(2, 1).value = '得点の記録がありません';
  }
}

export async function buildScoreSheet(game: Game, ExcelJS: ExcelJSNamespace): Promise<Workbook> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'バスケ スコア記録';
  wb.created = new Date();

  const ws = wb.addWorksheet('スコアシート');
  ws.columns = COLUMN_WIDTHS.map((width) => ({ width }));
  ws.pageSetup = {
    paperSize: 9, // A4
    orientation: 'portrait',
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 },
  };

  const homePts = teamTotal(game.events, 'home').pts;
  const awayPts = teamTotal(game.events, 'away').pts;

  ws.mergeCells('A1:I1');
  const title = ws.getCell('A1');
  title.value = game.title ? `スコアシート　${game.title}` : 'スコアシート';
  title.font = { bold: true, size: 14 };
  title.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(1).height = 24;

  ws.mergeCells('A2:B2');
  ws.getCell('A2').value = `日付　${game.date}`;
  ws.mergeCells('C2:E2');
  ws.getCell('C2').value = '会場';
  ws.mergeCells('F2:I2');
  ws.getCell('F2').value = '記録者';
  for (const ref of ['A2', 'C2', 'F2']) {
    ws.getCell(ref).font = { size: 10 };
    ws.getCell(ref).alignment = { horizontal: 'left' };
  }
  for (let c = 1; c <= 9; c++) {
    ws.getRow(2).getCell(c).border = { bottom: THIN };
  }

  ws.mergeCells('A3:I3');
  const score = ws.getCell('A3');
  const mark = homePts === awayPts ? '－' : homePts > awayPts ? '○' : '●';
  score.value = `${game.home.name}　${homePts}　${mark}　${awayPts}　${game.away.name}`;
  score.font = { bold: true, size: 16 };
  score.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(3).height = 26;

  let r = writeSummary(ws, game, 5);
  r = writeTeamTable(ws, game, 'home', r);
  r = writeTeamTable(ws, game, 'away', r);

  const note = ws.getCell(r, 1);
  ws.mergeCells(r, 1, r, 9);
  note.value = '※ 記録はシュートの成否とファウルのみ。「欠」は未出場、「先発」欄の○はスタメン。';
  note.font = { size: 9, color: { argb: 'FF888888' } };

  writeRunningScore(wb, game);
  return wb;
}

export async function downloadScoreSheet(game: Game): Promise<void> {
  const mod = await import('exceljs');
  const ExcelJS = ((mod as unknown as { default?: ExcelJSNamespace }).default ?? mod) as ExcelJSNamespace;
  const wb = await buildScoreSheet(game, ExcelJS);
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${game.date}_${game.home.name}_vs_${game.away.name}_スコアシート.xlsx`
    .replace(/[\\/:*?"<>|]/g, '_');
  a.click();
  URL.revokeObjectURL(url);
}
