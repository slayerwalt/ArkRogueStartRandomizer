import fs from 'node:fs';
import path from 'node:path';
import { extractOperators, extractRecruitGroups, extractSquads } from './lib/extract-core.mjs';

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    throw new Error(`读取或解析失败: ${file}\n${e.message}`);
  }
}

const THEME_ID = 'rogue_6';

const resDir = process.argv[2] ?? process.env.ARKNIGHTS_RES_DIR;
if (!resDir) {
  console.error('用法: npm run extract -- <ArknightsGameResource 仓库路径>');
  process.exit(1);
}

const excelDir = path.join(resDir, 'gamedata', 'excel');
const topic = readJson(path.join(excelDir, 'roguelike_topic_table.json'));
const charTable = readJson(path.join(excelDir, 'character_table.json'));

const detail = topic.details?.[THEME_ID];
if (!detail) throw new Error(`主题 ${THEME_ID} 在数据中不存在`);

const data = {
  generatedAt: new Date().toISOString().slice(0, 10),
  themes: [
    {
      id: THEME_ID,
      name: topic.topics?.[THEME_ID]?.name ?? THEME_ID,
      squads: extractSquads(detail),
      recruitGroups: extractRecruitGroups(detail),
    },
  ],
  operators: extractOperators(charTable),
};

const theme = data.themes[0];
if (theme.squads.length === 0 || theme.recruitGroups.length === 0 || data.operators.length === 0) {
  throw new Error('提取结果为空，请检查数据文件是否完整');
}

fs.mkdirSync('src/data', { recursive: true });
fs.writeFileSync('src/data/rogue-data.json', JSON.stringify(data, null, 2));
console.log(`主题: ${theme.name}`);
console.log(`分队: ${theme.squads.length} 个，招募组合: ${theme.recruitGroups.length} 个，干员: ${data.operators.length} 名`);
