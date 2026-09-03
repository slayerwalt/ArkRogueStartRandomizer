import type { GameData } from './types';

const DATA_ERROR = '数据文件缺失或格式不正确，请先运行数据提取脚本（见 README）';
const REQUIRED_INPUTS = [
  'gamedata/excel/character_table.json',
  'gamedata/excel/roguelike_topic_table.json',
  'gamedata/excel/data_version.txt',
];

function hasValidSource(data: GameData): boolean {
  const source = data.source;
  return Boolean(
    source &&
      typeof source.repository === 'string' &&
      source.repository.length > 0 &&
      (source.commit === null || /^[0-9a-f]{40}([0-9a-f]{24})?$/i.test(source.commit)) &&
      (source.dirty === null || typeof source.dirty === 'boolean') &&
      typeof source.dataVersion === 'string' &&
      source.dataVersion.length > 0 &&
      source.inputSha256 &&
      REQUIRED_INPUTS.every((input) => /^[0-9a-f]{64}$/i.test(source.inputSha256[input] ?? ''))
  );
}

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
  if (!hasValidSource(d)) {
    throw new Error('数据文件缺少有效的来源元数据，请重新运行数据提取脚本');
  }
  const t = d.themes[0];
  if (!Array.isArray(t.squads) || t.squads.length === 0 || !Array.isArray(t.recruitGroups) || t.recruitGroups.length === 0) {
    throw new Error('数据文件缺少分队或招募组合，请重新运行数据提取脚本');
  }
  const firstOp = d.operators[0];
  if (typeof firstOp.subProfession !== 'string' || typeof firstOp.hopeCost !== 'number') {
    throw new Error('数据文件版本过旧，请重新运行数据提取脚本');
  }
  return d;
}
