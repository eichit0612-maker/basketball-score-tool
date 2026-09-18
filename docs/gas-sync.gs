/**
 * バスケ スコア記録ツール ― Googleスプレッドシート同期スクリプト
 *
 * 使い方
 *  1. Googleスプレッドシートを新規作成する
 *  2. 拡張機能 → Apps Script を開き、このファイルの内容をすべて貼り付ける
 *  3. 下の SECRET を自分だけがわかる文字列に書き換える（アプリ側にも同じ文字列を入れる）
 *  4. デプロイ → 新しいデプロイ → 種類「ウェブアプリ」
 *       次のユーザーとして実行: 自分
 *       アクセスできるユーザー: 全員
 *     でデプロイし、表示されたウェブアプリURLをコピーする
 *  5. アプリの一覧画面「同期」に URL と合言葉を貼り付ける
 *
 * 注意
 *  - URLと合言葉の両方を知っている人だけが読み書きできます。URLは人に渡さないでください。
 *  - データは自分のスプレッドシートに保存されます。シートを直接編集しても構いませんが、
 *    json 列を壊すとその試合は読み込めなくなります。
 */

const SECRET = 'change-me';

const GAMES_SHEET = 'games';
const ROSTERS_SHEET = 'rosters';
const GAMES_HEADER = ['id', '日付', '大会名', 'チームA', 'チームB', 'A得点', 'B得点', 'updatedAt', '更新日時', 'json'];
const ROSTERS_HEADER = ['チーム名', 'updatedAt', '更新日時', '選手', 'json'];

function doGet() {
  return output({ ok: true, message: 'basketball score sync' });
}

function doPost(e) {
  try {
    const req = JSON.parse(e.postData.contents);
    if (req.secret !== SECRET) return output({ ok: false, error: '合言葉が違います' });

    const lock = LockService.getScriptLock();
    lock.waitLock(20000);
    try {
      return output({
        ok: true,
        games: mergeGames(req.games || []),
        rosters: mergeRosters(req.rosters || []),
      });
    } finally {
      lock.releaseLock();
    }
  } catch (err) {
    return output({ ok: false, error: String(err) });
  }
}

function output(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function getSheet(name, header) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  if (sh.getLastRow() === 0) {
    sh.appendRow(header);
    sh.setFrozenRows(1);
  }
  return sh;
}

function stamp(ms) {
  return ms ? Utilities.formatDate(new Date(ms), 'Asia/Tokyo', 'yyyy/MM/dd HH:mm') : '';
}

/** 送られてきた試合と保存済みの試合を updatedAt で突き合わせ、全件を返す */
function mergeGames(incoming) {
  const sh = getSheet(GAMES_SHEET, GAMES_HEADER);
  const values = sh.getDataRange().getValues();
  const rowOf = {};
  const store = {};

  for (let i = 1; i < values.length; i++) {
    const id = values[i][0];
    if (!id) continue;
    rowOf[id] = i + 1;
    try {
      store[id] = { id: id, updatedAt: Number(values[i][7]) || 0, summary: null, data: JSON.parse(values[i][9]) };
    } catch (err) {
      // json列が壊れている行は無視する
    }
  }

  incoming.forEach(function (item) {
    if (!item || !item.id) return;
    const cur = store[item.id];
    if (cur && (item.updatedAt || 0) <= (cur.updatedAt || 0)) return;

    store[item.id] = { id: item.id, updatedAt: item.updatedAt || 0, summary: item.summary, data: item.data };
    const s = item.summary || {};
    const row = [
      item.id, s.date || '', s.title || '', s.teamA || '', s.teamB || '',
      s.scoreA || 0, s.scoreB || 0, item.updatedAt || 0, stamp(item.updatedAt), JSON.stringify(item.data),
    ];
    if (rowOf[item.id]) {
      sh.getRange(rowOf[item.id], 1, 1, GAMES_HEADER.length).setValues([row]);
    } else {
      sh.appendRow(row);
      rowOf[item.id] = sh.getLastRow();
    }
  });

  return Object.keys(store).map(function (id) {
    return { id: id, updatedAt: store[id].updatedAt, data: store[id].data };
  });
}

/** 名簿はチーム名で突き合わせる */
function mergeRosters(incoming) {
  const sh = getSheet(ROSTERS_SHEET, ROSTERS_HEADER);
  const values = sh.getDataRange().getValues();
  const rowOf = {};
  const store = {};

  for (let i = 1; i < values.length; i++) {
    const name = values[i][0];
    if (!name) continue;
    rowOf[name] = i + 1;
    try {
      store[name] = { name: name, updatedAt: Number(values[i][1]) || 0, data: JSON.parse(values[i][4]) };
    } catch (err) {
      // json列が壊れている行は無視する
    }
  }

  incoming.forEach(function (item) {
    if (!item || !item.name) return;
    const cur = store[item.name];
    if (cur && (item.updatedAt || 0) <= (cur.updatedAt || 0)) return;

    store[item.name] = { name: item.name, updatedAt: item.updatedAt || 0, data: item.data };
    const row = [item.name, item.updatedAt || 0, stamp(item.updatedAt), item.players || '', JSON.stringify(item.data)];
    if (rowOf[item.name]) {
      sh.getRange(rowOf[item.name], 1, 1, ROSTERS_HEADER.length).setValues([row]);
    } else {
      sh.appendRow(row);
      rowOf[item.name] = sh.getLastRow();
    }
  });

  return Object.keys(store).map(function (name) {
    return { name: name, updatedAt: store[name].updatedAt, data: store[name].data };
  });
}
