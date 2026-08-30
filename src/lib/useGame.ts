import { useCallback, useEffect, useRef, useState } from 'react';
import type { Game } from '../types';
import { loadGame, upsertGame } from './storage';

/** 試合を localStorage から読み込み、変更のたびに保存する */
export function useGame(id: string | undefined) {
  const [game, setGame] = useState<Game | null>(null);
  const [loaded, setLoaded] = useState(false);
  const skipSave = useRef(true);

  useEffect(() => {
    skipSave.current = true;
    setGame(id ? loadGame(id) ?? null : null);
    setLoaded(true);
  }, [id]);

  useEffect(() => {
    if (!game) return;
    if (skipSave.current) {
      skipSave.current = false;
      return;
    }
    upsertGame(game);
  }, [game]);

  const update = useCallback((fn: (g: Game) => Game) => {
    setGame((prev) => (prev ? fn(prev) : prev));
  }, []);

  return { game, loaded, update };
}
