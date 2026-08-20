import type { RollSettings } from './types';

export const SETTINGS_KEY = 'rogue-start-settings';

export const DEFAULT_SETTINGS: RollSettings = {
  withOperators: true,
  rarities: [3, 4, 5, 6],
  excludes: [],
};

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

function defaultSettings(): RollSettings {
  return { ...DEFAULT_SETTINGS, rarities: [...DEFAULT_SETTINGS.rarities], excludes: [] };
}

export function loadSettings(
  storage: StorageLike,
  validOperatorIds: ReadonlySet<string>,
): { settings: RollSettings; pruned: number } {
  const raw = storage.getItem(SETTINGS_KEY);
  if (!raw) return { settings: defaultSettings(), pruned: 0 };
  try {
    const parsed = JSON.parse(raw);
    const settings: RollSettings = {
      withOperators:
        typeof parsed.withOperators === 'boolean' ? parsed.withOperators : DEFAULT_SETTINGS.withOperators,
      rarities: Array.isArray(parsed.rarities)
        ? parsed.rarities.filter((r: unknown) => Number.isInteger(r) && (r as number) >= 1 && (r as number) <= 6)
        : [...DEFAULT_SETTINGS.rarities],
      excludes: Array.isArray(parsed.excludes)
        ? parsed.excludes.filter((id: unknown) => typeof id === 'string')
        : [],
    };
    if (settings.rarities.length === 0) settings.rarities = [...DEFAULT_SETTINGS.rarities];
    const before = settings.excludes.length;
    settings.excludes = settings.excludes.filter((id) => validOperatorIds.has(id));
    return { settings, pruned: before - settings.excludes.length };
  } catch {
    return { settings: defaultSettings(), pruned: 0 };
  }
}

export function saveSettings(storage: StorageLike, settings: RollSettings): void {
  storage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}
