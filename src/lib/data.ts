import type { GameData } from './types';

const DATA_ERROR = '数据文件缺失或格式不正确，请先运行数据提取脚本（见 README）';

export function validateGameData(data: unknown): GameData {
  const d = data as GameData | null;
  if (
    !d ||
    !Array.isArray(d.themes) ||
    d.themes.length === 0 ||
    !Array.isArray(d.operators) ||
    d.operators.length === 0
  ) {
    throw new Error(DATA_ERROR);
  }
  const t = d.themes[0];
  if (!Array.isArray(t.squads) || t.squads.length === 0 || !Array.isArray(t.recruitGroups) || t.recruitGroups.length === 0) {
    throw new Error('数据文件缺少分队或招募组合，请重新运行数据提取脚本');
  }
  return d;
}
