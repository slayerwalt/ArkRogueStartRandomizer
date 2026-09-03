import { describe, expect, it } from 'vitest';
import {
  assertNoUnexpectedRemovals,
  buildDiff,
  collectCountDecreases,
  formatDiffSummary,
  hasSameDomainData,
  inspectAvatarCoverage,
  parseDataVersion,
} from '../scripts/lib/update-core.mjs';

function makeData() {
  return {
    generatedAt: '2026-08-20',
    source: { repository: 'old', dataVersion: '1', inputSha256: {} },
    themes: [
      {
        id: 'rogue_6',
        name: '测试主题',
        squads: [{ id: 's1', name: '分队一', desc: '旧描述', unlockCond: null, initialHopeBonus: 0, recruitDiscount: null }],
        recruitGroups: [{ id: 'g1', name: '组合一', desc: '描述', slots: [] }],
      },
    ],
    operators: [
      { id: 'char_a', name: '干员甲', profession: 'WARRIOR', subProfession: 'lord', rarity: 6, hopeCost: 6, charDiscount: 0 },
      { id: 'char_b', name: '干员乙', profession: 'MEDIC', subProfession: 'physician', rarity: 3, hopeCost: 0, charDiscount: 0 },
    ],
  };
}

describe('parseDataVersion', () => {
  it('读取 VersionControl 版本号', () => {
    expect(parseDataVersion('Stream:x\nVersionControl:76.4.0\n')).toBe('76.4.0');
  });

  it('缺少版本号时抛错', () => {
    expect(() => parseDataVersion('Stream:x')).toThrow(/VersionControl/);
  });
});

describe('业务数据比较与保护', () => {
  it('首次提取可输出完整新增摘要', () => {
    const summary = formatDiffSummary(buildDiff(null, makeData()));
    expect(summary).toMatch(/干员新增 2/);
    expect(summary).toMatch(/主题新增/);
  });

  it('忽略生成日期和来源元数据', () => {
    const previous = makeData();
    const next = { ...makeData(), generatedAt: '2026-09-04', source: { repository: 'new' } };
    expect(hasSameDomainData(previous, next)).toBe(true);
  });

  it('识别关键字段变化并输出摘要', () => {
    const previous = makeData();
    const next = makeData();
    next.operators[0] = { ...next.operators[0], hopeCost: 5 };
    next.themes[0].squads[0] = { ...next.themes[0].squads[0], desc: '新描述' };
    const summary = formatDiffSummary(buildDiff(previous, next));
    expect(hasSameDomainData(previous, next)).toBe(false);
    expect(summary).toMatch(/char_a.*hopeCost/);
    expect(summary).toMatch(/s1.*desc/);
  });

  it('主题名称变化不会被误报为无变化', () => {
    const previous = makeData();
    const next = makeData();
    next.themes[0] = { ...next.themes[0], name: '新主题名' };
    expect(formatDiffSummary(buildDiff(previous, next))).toMatch(/主题变更.*name/);
  });

  it('数量下降默认中止，显式确认后允许', () => {
    const previous = makeData();
    const next = makeData();
    next.operators.pop();
    expect(collectCountDecreases(previous, next)).toEqual(['干员数量 2 → 1']);
    expect(() => assertNoUnexpectedRemovals(previous, next)).toThrow(/--allow-removals/);
    expect(assertNoUnexpectedRemovals(previous, next, true)).toEqual(['干员数量 2 → 1']);
  });
});

describe('头像覆盖检查', () => {
  it('分别列出缺少头像与无对应干员的头像', () => {
    const coverage = inspectAvatarCoverage(makeData().operators, ['char_a.webp', 'char_old.webp', 'note.txt']);
    expect(coverage).toEqual({ missing: ['char_b'], orphaned: ['char_old'] });
  });
});
