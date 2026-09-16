export type UiTheme = 'dark' | 'sheet' | 'contrast';

const KEY = 'bb-score-tool:ui:v1';

export const UI_THEMES: { id: UiTheme; label: string; note: string }[] = [
  { id: 'dark', label: '体育館', note: '暗い会場で見やすい抑えた配色' },
  { id: 'sheet', label: 'スコアシート', note: '紙の記録用紙に近い白地。印刷向き' },
  { id: 'contrast', label: '大きい文字', note: '文字と罫線を太く。明るい場所向き' },
];

export function loadTheme(): UiTheme {
  try {
    const v = localStorage.getItem(KEY);
    if (v === 'dark' || v === 'sheet' || v === 'contrast') return v;
  } catch {
    /* localStorage が使えない環境では既定値 */
  }
  return 'dark';
}

export function applyTheme(theme: UiTheme): void {
  document.documentElement.dataset.ui = theme;
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    /* 保存できなくても表示は切り替える */
  }
}
