import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { extractOperators, extractRecruitGroups, extractSquads } from './lib/extract-core.mjs';
import {
  assertNoUnexpectedRemovals,
  buildDiff,
  formatDiffSummary,
  hasSameDomainData,
  inspectAvatarCoverage,
  parseDataVersion,
} from './lib/update-core.mjs';

const THEME_ID = 'rogue_6';
const DEFAULT_SOURCE_REPOSITORY = 'https://github.com/yuanyan3060/ArknightsGameResource';
const INPUT_PATHS = [
  'gamedata/excel/character_table.json',
  'gamedata/excel/roguelike_topic_table.json',
  'gamedata/excel/data_version.txt',
];
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputFile = path.join(projectRoot, 'src', 'data', 'rogue-data.json');
const avatarDir = path.join(projectRoot, 'src', 'assets', 'avatars');

function parseArgs(args) {
  const allowRemovals = args.includes('--allow-removals');
  const unknownOptions = args.filter((arg) => arg.startsWith('--') && arg !== '--allow-removals');
  const paths = args.filter((arg) => !arg.startsWith('--'));
  if (unknownOptions.length > 0) throw new Error(`未知参数: ${unknownOptions.join(', ')}`);
  if (paths.length > 1) throw new Error('只能指定一个 ArknightsGameResource 仓库路径');
  return { allowRemovals, resDir: paths[0] ?? process.env.ARKNIGHTS_RES_DIR };
}

function readBuffer(file) {
  try {
    return fs.readFileSync(file);
  } catch (error) {
    throw new Error(`读取失败: ${file}\n${error.message}`);
  }
}

function parseJson(buffer, file) {
  try {
    return JSON.parse(buffer.toString('utf8'));
  } catch (error) {
    throw new Error(`解析失败: ${file}\n${error.message}`);
  }
}

function sha256(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

function runGit(resDir, args) {
  const safeDirectory = path.resolve(resDir).replaceAll('\\', '/');
  return execFileSync('git', ['-c', `safe.directory=${safeDirectory}`, '-C', resDir, ...args], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

function normalizeRepositoryUrl(url) {
  if (!url) return DEFAULT_SOURCE_REPOSITORY;
  const sshMatch = /^git@github\.com:(.+)$/.exec(url);
  if (sshMatch) return `https://github.com/${sshMatch[1].replace(/\.git$/, '')}`;
  return url.replace(/\.git$/, '');
}

function readGitMetadata(resDir) {
  try {
    const repository = normalizeRepositoryUrl(runGit(resDir, ['config', '--get', 'remote.origin.url']));
    const commit = runGit(resDir, ['rev-parse', 'HEAD']);
    const status = runGit(resDir, ['status', '--porcelain', '--', ...INPUT_PATHS]);
    return { repository, commit, dirty: status.length > 0 };
  } catch (error) {
    console.warn(`警告: 无法读取上游 Git 元数据，将以 null 记录 commit/dirty：${error.message}`);
    return { repository: DEFAULT_SOURCE_REPOSITORY, commit: null, dirty: null };
  }
}

function validateExtractedData(data) {
  if (!Array.isArray(data.themes) || data.themes.length === 0 || !Array.isArray(data.operators) || data.operators.length === 0) {
    throw new Error('提取结果为空，请检查数据文件是否完整');
  }
  for (const theme of data.themes) {
    if (theme.squads.length === 0 || theme.recruitGroups.length === 0) {
      throw new Error(`主题 ${theme.id} 的分队或招募组合为空，请检查数据文件是否完整`);
    }
  }
}

function hasSourceMetadata(data) {
  const source = data?.source;
  return Boolean(
    source &&
      typeof source.repository === 'string' &&
      source.repository.length > 0 &&
      (source.commit === null || /^[0-9a-f]{40}([0-9a-f]{24})?$/i.test(source.commit)) &&
      (source.dirty === null || typeof source.dirty === 'boolean') &&
      typeof source.dataVersion === 'string' &&
      source.dataVersion.length > 0 &&
      source.inputSha256 &&
      INPUT_PATHS.every((inputPath) => /^[0-9a-f]{64}$/i.test(source.inputSha256[inputPath] ?? '')),
  );
}

function readCurrentData() {
  if (!fs.existsSync(outputFile)) return null;
  return parseJson(readBuffer(outputFile), outputFile);
}

function reportAvatarCoverage(operators) {
  const avatarNames = fs.existsSync(avatarDir) ? fs.readdirSync(avatarDir) : [];
  const coverage = inspectAvatarCoverage(operators, avatarNames);
  if (coverage.missing.length > 0) {
    console.warn(`警告: ${coverage.missing.length} 名干员缺少头像，将降级为文字显示：${coverage.missing.join('、')}`);
  }
  if (coverage.orphaned.length > 0) {
    console.warn(`警告: ${coverage.orphaned.length} 个头像没有对应干员：${coverage.orphaned.join('、')}`);
  }
  if (coverage.missing.length === 0 && coverage.orphaned.length === 0) {
    console.log(`头像检查: ${operators.length} 个干员头像全部对应`);
  }
}

function writeJsonSafely(data) {
  fs.mkdirSync(path.dirname(outputFile), { recursive: true });
  const serialized = `${JSON.stringify(data, null, 2)}\n`;
  JSON.parse(serialized);
  const temporaryFile = path.join(path.dirname(outputFile), `.rogue-data.${process.pid}.tmp`);
  try {
    fs.writeFileSync(temporaryFile, serialized);
    fs.renameSync(temporaryFile, outputFile);
  } finally {
    if (fs.existsSync(temporaryFile)) fs.unlinkSync(temporaryFile);
  }
}

const { allowRemovals, resDir } = parseArgs(process.argv.slice(2));
if (!resDir) {
  console.error('用法: npm run extract -- <ArknightsGameResource 仓库路径> [--allow-removals]');
  process.exit(1);
}

const inputBuffers = Object.fromEntries(
  INPUT_PATHS.map((relativePath) => [relativePath, readBuffer(path.join(resDir, ...relativePath.split('/')))]),
);
const topic = parseJson(inputBuffers[INPUT_PATHS[1]], INPUT_PATHS[1]);
const charTable = parseJson(inputBuffers[INPUT_PATHS[0]], INPUT_PATHS[0]);
const dataVersionContent = inputBuffers[INPUT_PATHS[2]].toString('utf8');
const detail = topic.details?.[THEME_ID];
if (!detail) throw new Error(`主题 ${THEME_ID} 在数据中不存在`);

const source = {
  ...readGitMetadata(resDir),
  dataVersion: parseDataVersion(dataVersionContent),
  inputSha256: Object.fromEntries(INPUT_PATHS.map((relativePath) => [relativePath, sha256(inputBuffers[relativePath])])),
};
if (source.dirty) {
  console.warn('警告: 三个上游输入文件包含未提交改动，来源哈希有效，但 commit 不能单独复现本次输入。');
}
const data = {
  generatedAt: new Date().toISOString().slice(0, 10),
  source,
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
validateExtractedData(data);
reportAvatarCoverage(data.operators);

const currentData = readCurrentData();
if (hasSameDomainData(currentData, data) && hasSourceMetadata(currentData)) {
  console.log('业务数据无变化，未改写 src/data/rogue-data.json');
  process.exit(0);
}

console.log(formatDiffSummary(buildDiff(currentData, data)));
if (hasSameDomainData(currentData, data)) {
  console.log('业务数据无变化；本次仅补齐来源元数据。');
}
assertNoUnexpectedRemovals(currentData, data, allowRemovals);
writeJsonSafely(data);

const theme = data.themes[0];
console.log(`来源: ${source.repository} @ ${source.commit ?? '未知 commit'}，数据版本: ${source.dataVersion}`);
console.log(`已写入: ${path.relative(projectRoot, outputFile)}`);
console.log(`分队: ${theme.squads.length} 个，招募组合: ${theme.recruitGroups.length} 个，干员: ${data.operators.length} 名`);
