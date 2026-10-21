import { ref, shallowRef, watch } from 'vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { drawInRunCandidates, IN_RUN_TICKETS, operatorIdentity } from '../src/lib/in-run';
import { useInRunRecruitment } from '../src/composables/useInRunRecruitment';
import { DEFAULT_RECRUIT_COUNTS } from '../src/lib/recruit-counts';
import type { ConfirmedStart } from '../src/composables/useStartConfirmation';
import type { Operator, RollSettings, Theme } from '../src/lib/types';

const professions = ['PIONEER', 'WARRIOR', 'TANK', 'SNIPER', 'CASTER', 'MEDIC', 'SUPPORT', 'SPECIAL'];
function operator(id: string, profession: string, rarity = 6, name = id): Operator {
  return { id, name, profession, rarity, subProfession: '', hopeCost: 999, charDiscount: 0 };
}
const operators = professions.flatMap((profession) => [6, 5].flatMap((rarity) =>
  Array.from({ length: 9 }, (_, i) => operator(`${profession}-${rarity}-${i}`, profession, rarity))));
const settings: RollSettings = { pool: { 4: [], 5: operators.filter((o) => o.rarity === 5).map((o) => o.id),
  6: operators.filter((o) => o.rarity === 6).map((o) => o.id) } };
const ticket = (id: string) => IN_RUN_TICKETS.find((item) => item.id === id)!;

describe('局内招募券抽样', () => {
  it('所有招募券默认抽五名六星、不抽五星，完全不读取希望预算', () => {
    for (const option of IN_RUN_TICKETS) {
      const result = drawInRunCandidates(operators, settings, option, [], DEFAULT_RECRUIT_COUNTS, () => 0);
      expect(result.candidates).toHaveLength(5);
      expect(result.expectedCount).toBe(5);
      expect(result.shortages).toEqual([]);
      expect(result.candidates.filter((o) => o.rarity === 6)).toHaveLength(5);
      expect(result.candidates.filter((o) => o.rarity === 5)).toHaveLength(0);
      expect(result.candidates.every((o) => option.professions.includes(o.profession))).toBe(true);
      expect(result.candidates.every((o) => o.hopeCost === 999)).toBe(true);
    }
  });
  it('双职业与定向券按合并职业池抽总人数，不按职业倍增或设置职业保底', () => {
    for (const [id, allowed] of [['guard-vanguard', ['PIONEER', 'WARRIOR']],
      ['ground', ['PIONEER', 'WARRIOR', 'TANK', 'SPECIAL']],
      ['ranged', ['SNIPER', 'CASTER', 'MEDIC', 'SUPPORT']]] as const) {
      const result = drawInRunCandidates(operators, settings, ticket(id), [], { six: 6, five: 8 }, () => 0);
      expect(result.candidates.filter((o) => o.rarity === 6)).toHaveLength(6);
      expect(result.candidates.filter((o) => o.rarity === 5)).toHaveLength(8);
      expect(result.candidates.every((o) => (allowed as readonly string[]).includes(o.profession))).toBe(true);
      expect(new Set(result.candidates.map((o) => o.profession)).size).toBe(1);
    }
  });
  it('任意券支持自定义六星和五星数量，同轮不重复，抽样不修改输入', () => {
    const before = JSON.stringify({ operators, settings });
    const result = drawInRunCandidates(operators, settings, ticket('any'), [], { six: 16, five: 7 }, () => 0.8);
    expect(result.candidates).toHaveLength(23);
    expect(result.candidates.filter((o) => o.rarity === 6)).toHaveLength(16);
    expect(result.candidates.filter((o) => o.rarity === 5)).toHaveLength(7);
    expect(new Set(result.candidates.map((o) => o.id)).size).toBe(23);
    expect(JSON.stringify({ operators, settings })).toBe(before);
  });
  it.each([{ six: 0, five: 4 }, { six: 3, five: 0 }])('允许单独关闭一个星级：%o', (counts) => {
    for (const option of IN_RUN_TICKETS) {
      const result = drawInRunCandidates(operators, settings, option, [], counts, () => 0.3);
      expect(result.candidates.filter((o) => o.rarity === 6)).toHaveLength(counts.six);
      expect(result.candidates.filter((o) => o.rarity === 5)).toHaveLength(counts.five);
      expect(result.expectedCount).toBe(counts.six + counts.five);
      expect(result.shortages).toEqual([]);
    }
  });
  it('过滤手动范围和排除名单，候选不足时不跨星级或职业补齐', () => {
    const pool = { pool: { 5: ['PIONEER-5-0', 'PIONEER-5-1'], 6: ['PIONEER-6-0', 'MEDIC-6-0'] } };
    const excluded = [operators.find((o) => o.id === 'PIONEER-5-0')!];
    const result = drawInRunCandidates(operators, pool, ticket('single-PIONEER'), excluded, { six: 4, five: 2 }, () => 0);
    expect(result.candidates.map((o) => o.id)).toEqual(['PIONEER-6-0', 'PIONEER-5-1']);
    expect(result.expectedCount).toBe(6);
    expect(result.shortages.map(({ rarity, requested, actual }) => ({ rarity, requested, actual })))
      .toEqual([{ rarity: 6, requested: 4, actual: 1 }, { rarity: 5, requested: 2, actual: 1 }]);
    expect(drawInRunCandidates(operators, { pool: {} }, ticket('any'), []).candidates).toEqual([]);
  });
  it('阿米娅多形态共享排除身份，同一轮去重；异格干员分别处理', () => {
    const amiya = operator('amiya-medic', 'MEDIC', 5, '阿米娅');
    const guard = operator('amiya-guard', 'WARRIOR', 5, '阿米娅（近卫）');
    const caster = operator('amiya-caster', 'CASTER', 5, '阿米娅(术师)');
    const other = operator('other-medic', 'MEDIC', 5);
    const pool = [amiya, guard, caster, other];
    const config = { pool: { 5: pool.map((o) => o.id) } };
    expect(drawInRunCandidates(pool, config, ticket('single-MEDIC'), [guard], { six: 0, five: 8 }, () => 0).candidates).toEqual([other]);
    expect(drawInRunCandidates(pool, config, ticket('any'), [], { six: 0, five: 8 }, () => 0).candidates).toHaveLength(2);
    expect(operatorIdentity(operator('chen', 'WARRIOR', 6, '陈')))
      .not.toBe(operatorIdentity(operator('chen2', 'SNIPER', 6, '假日威龙陈')));
  });
  it.each([{ six: 0, five: 0 }, { six: -1, five: 3 }, { six: 1.5, five: 3 }, { six: 100, five: 2 }])('拒绝无效抽取数量 %o', (counts) => {
    expect(() => drawInRunCandidates(operators, settings, ticket('any'), [], counts)).toThrow(RangeError);
  });
});

function startWith(...initial: Operator[]): ConfirmedStart {
  return { mode: 'quick', operators: initial, source: {
    initialHope: 6,
    squad: { id: 's', name: '分队', desc: '', unlockCond: null, initialHopeBonus: 0, recruitDiscount: null },
    group: { id: 'g', name: '组合', desc: '', slots: [] },
    slots: initial.map((operator) => ({ operator, empty: false, hopeCost: 0, slot: { classes: [operator.profession], rarityCap: null } })),
  } };
}
function setup(initial: ConfirmedStart | null = startWith(operators[0], operators[9])) {
  const start = shallowRef(initial);
  const theme = shallowRef<Theme | null>({ id: 'test', name: '测试肉鸽', squads: [], recruitGroups: [] });
  const config = ref<RollSettings>({ pool: { 5: [...settings.pool[5]], 6: [...settings.pool[6]] } });
  const controller = useInRunRecruitment(theme, operators, config, () => 0);
  watch(start, (value) => { if (value) controller.applyStart(value); }, { immediate: true, flush: 'sync' });
  return { start, theme, config, ...controller };
}

describe('局内名单与开局连接', () => {
  it('保存数量只影响下次抽取，保留当前结果、选择和名单；更换招募券也共用新数量', () => {
    const app = setup();
    app.drawTicket('single-PIONEER');
    const previous = app.draw.value;
    const selected = app.candidates.value[0];
    app.selectCandidate(selected.id);
    const members = app.members.value;
    expect(app.countSettings.updateCounts({ six: 3, five: 1 })).toBe(true);
    expect(app.draw.value).toBe(previous);
    expect(app.chosen.value).toEqual(selected);
    expect(app.members.value).toBe(members);
    for (const id of ['single-PIONEER', 'guard-vanguard', 'ground', 'any']) {
      expect(app.drawTicket(id)).toBe(true);
      expect(app.candidates.value.filter((o) => o.rarity === 6)).toHaveLength(3);
      expect(app.candidates.value.filter((o) => o.rarity === 5)).toHaveLength(1);
      expect(app.candidates.value.some((o) => members.some((member) => member.operator.id === o.id))).toBe(false);
      expect(app.chosen.value).toBeNull();
    }
  });
  it('无需确认开局即可登记和抽取，之后确认开局仍保留既有名单与排除状态', () => {
    const app = setup(null);
    expect(app.active.value).toBe(true);
    expect(app.register(operators[0].id, 'emergency')).toBe(true);
    expect(app.register(operators[1].id, 'manual')).toBe(true);
    expect(app.drawTicket('single-PIONEER')).toBe(true);
    expect(app.candidates.value.some((o) => [operators[0].id, operators[1].id].includes(o.id))).toBe(false);
    const chosen = app.candidates.value[0];
    app.selectCandidate(chosen.id);
    expect(app.confirmRecruit()).toBe(true);
    expect(app.sixStars.value).toEqual([operators[1], chosen, operators[0]]);
    app.start.value = startWith(operators[3], operators[9]);
    expect(app.emergency.value).toEqual([operators[0]]);
    expect(app.recruited.value).toEqual([operators[1], chosen, operators[3], operators[9]]);
    expect(app.drawTicket('single-PIONEER')).toBe(true);
    const excluded = [operators[0], operators[1], chosen, operators[3], operators[9]].map((o) => o.id);
    expect(app.candidates.value.some((o) => excluded.includes(o.id))).toBe(false);
  });
  it('直接抽取不改变随机范围，手动已选六星仍先被排除', () => {
    const app = setup(null);
    app.countSettings.updateCounts({ six: 2, five: 3 });
    app.config.value.pool = { 6: [operators[0].id, operators[1].id], 5: [operators[9].id] };
    app.addSelected(operators[0].id);
    expect(app.drawTicket('single-PIONEER')).toBe(true);
    expect(app.candidates.value.map((o) => o.id)).toEqual([operators[1].id, operators[9].id]);
    expect(app.start.value).toBeNull();
    const theme = app.theme.value;
    app.theme.value = null;
    expect(app.drawTicket('single-PIONEER')).toBe(false);
    expect(app.register(operators[2].id, 'emergency')).toBe(false);
    app.theme.value = theme;
    expect(app.candidates.value.map((o) => o.id)).toEqual([operators[1].id, operators[9].id]);
  });
  it('抽到或选中候选不算招募，确认后退出随机范围；放弃和重复确认不追加', () => {
    const app = setup();
    app.drawTicket('single-PIONEER');
    const selected = app.candidates.value[0];
    app.selectCandidate(selected.id);
    expect(app.members.value).toHaveLength(2);
    expect(app.confirmRecruit()).toBe(true);
    expect(app.confirmRecruit()).toBe(false);
    expect(app.members.value.at(-1)).toEqual({ operator: selected, source: 'random' });
    app.drawTicket('single-PIONEER');
    expect(app.candidates.value.some((o) => o.id === selected.id)).toBe(false);
    app.discardDraw();
    expect(app.members.value).toHaveLength(3);
    expect(app.draw.value).toBeNull();
  });
  it('应急助力排除当前已选候选，移除恢复资格，重复登记不会添加', () => {
    const app = setup();
    app.drawTicket('single-PIONEER');
    const selected = app.candidates.value[0];
    app.selectCandidate(selected.id);
    expect(app.register(selected.id, 'emergency')).toBe(true);
    expect(app.register(selected.id, 'emergency')).toBe(false);
    expect(app.chosen.value).toBeNull();
    expect(app.confirmRecruit()).toBe(false);
    expect(app.candidates.value.some((o) => o.id === selected.id)).toBe(false);
    expect(app.members.value).toHaveLength(2);
    app.removeEmergency(selected.id);
    app.drawTicket('single-PIONEER');
    expect(app.candidates.value.some((o) => o.id === selected.id)).toBe(true);
  });
  it('临时招募可登记范围外干员，结束当前抽取，并从应急助力转入已招募', () => {
    const app = setup();
    const target = operators[1];
    app.config.value.pool[6] = app.config.value.pool[6].filter((id) => id !== target.id);
    app.register(target.id, 'emergency');
    app.drawTicket('single-PIONEER');
    expect(app.registrationOptions('temporary')).toContain(target);
    expect(app.register(target.id, 'temporary')).toBe(true);
    expect(app.emergency.value).toEqual([]);
    expect(app.draw.value).toBeNull();
    expect(app.members.value.at(-1)?.source).toBe('temporary');
    expect(app.register(target.id, 'manual')).toBe(false);
    expect(app.register('missing', 'manual')).toBe(false);
    app.config.value.pool[6].push(target.id);
    app.drawTicket('single-PIONEER');
    expect(app.candidates.value.some((o) => o.id === target.id)).toBe(false);
    app.removeMember(target.id);
    app.drawTicket('single-PIONEER');
    expect(app.candidates.value.some((o) => o.id === target.id)).toBe(true);
  });
  it('范围变化只影响后续抽取，不改变本轮候选；同一开局、切换主题不会丢失本局', () => {
    const app = setup();
    app.drawTicket('single-PIONEER');
    const selected = app.candidates.value[0];
    app.config.value.pool = {};
    app.selectCandidate(selected.id);
    expect(app.confirmRecruit()).toBe(true);
    const theme = app.theme.value;
    app.theme.value = null;
    expect(app.active.value).toBe(false);
    app.theme.value = theme;
    expect(app.members.value).toHaveLength(3);
    app.drawTicket('any');
    expect(app.candidates.value).toEqual([]);
    const before = app.draw.value;
    expect(app.drawTicket('invalid')).toBe(false);
    expect(app.draw.value).toBe(before);
  });
  it('新确认的开局追加名单，保留已选和应急助力并清空候选', () => {
    const app = setup();
    app.register(operators[1].id, 'manual');
    app.register(operators[2].id, 'emergency');
    app.drawTicket('any');
    app.start.value = startWith(operators[3]);
    expect(app.recruited.value).toEqual([operators[0], operators[9], operators[1], operators[3]]);
    expect(app.emergency.value).toEqual([operators[2]]);
    expect(app.sixStars.value).toEqual([operators[0], operators[1], operators[3], operators[2]]);
    expect(app.draw.value).toBeNull();
  });
});

describe('局内名单移除撤销', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('撤销招募记录移除，恢复原顺序、来源、排除资格和当前选择', () => {
    const app = setup();
    const target = operators[1];
    app.register(target.id, 'temporary');
    app.drawTicket('single-PIONEER');
    const selected = app.candidates.value[0];
    app.selectCandidate(selected.id);
    const members = [...app.members.value];
    const draw = app.draw.value;

    app.removeMember(target.id);
    expect(app.canUndoRemoval.value).toBe(true);
    expect(app.registrationOptions('manual')).toContain(target);
    expect(app.chosen.value).toEqual(selected);
    expect(app.undoRemoval()).toBe(true);
    expect(app.members.value).toEqual(members);
    expect(app.registrationOptions('manual')).not.toContain(target);
    expect(app.draw.value).toBe(draw);
    expect(app.chosen.value).toEqual(selected);
    expect(app.canUndoRemoval.value).toBe(false);
    expect(app.undoRemoval()).toBe(false);
  });

  it('撤销应急助力移除，重新排除当前候选并保留另一个已选干员', () => {
    const app = setup();
    app.drawTicket('single-PIONEER');
    const [emergency, selected] = app.candidates.value;
    app.register(emergency.id, 'emergency');
    app.selectCandidate(selected.id);
    app.removeEmergency(emergency.id);
    expect(app.candidates.value).toContain(emergency);
    expect(app.undoRemoval()).toBe(true);
    expect(app.emergency.value).toEqual([emergency]);
    expect(app.candidates.value).not.toContain(emergency);
    expect(app.chosen.value).toEqual(selected);
  });

  it('连续移除只允许撤销最近一次，不恢复先前已移除的记录', () => {
    const app = setup();
    app.removeMember(operators[0].id);
    app.removeMember(operators[9].id);
    expect(app.undoRemoval()).toBe(true);
    expect(app.recruited.value).toEqual([operators[9]]);
    expect(app.undoRemoval()).toBe(false);
  });

  it('撤销机会持续六秒，新的移除重新计时', () => {
    const app = setup();
    app.removeMember(operators[0].id);
    vi.advanceTimersByTime(5000);
    app.removeMember(operators[9].id);
    vi.advanceTimersByTime(5999);
    expect(app.canUndoRemoval.value).toBe(true);
    vi.advanceTimersByTime(1);
    expect(app.canUndoRemoval.value).toBe(false);
    expect(app.undoRemoval()).toBe(false);
    expect(app.recruited.value).toEqual([]);
  });

  const changes: [string, (app: ReturnType<typeof setup>) => void][] = [
    ['重新抽取', (app) => { app.drawTicket('any'); }],
    ['选择候选', (app) => { app.selectCandidate(app.candidates.value[0].id); }],
    ['确认招募', (app) => { app.confirmRecruit(); }],
    ['补录干员', (app) => { app.register(operators[3].id, 'manual'); }],
    ['登记应急助力', (app) => { app.register(operators[3].id, 'emergency'); }],
    ['放弃本次', (app) => { app.discardDraw(); }],
    ['修改参与范围', (app) => { app.config.value.pool[6].pop(); }],
  ];
  it.each(changes)('%s之后撤销失效，不能覆盖后续状态', (_, change) => {
    const app = setup();
    app.drawTicket('single-PIONEER');
    app.selectCandidate(app.candidates.value[0].id);
    app.removeMember(operators[0].id);
    change(app);
    const members = [...app.members.value];
    const candidates = [...app.candidates.value];
    const chosen = app.chosen.value;
    expect(app.canUndoRemoval.value).toBe(false);
    expect(app.undoRemoval()).toBe(false);
    expect(app.members.value).toEqual(members);
    expect(app.candidates.value).toEqual(candidates);
    expect(app.chosen.value).toEqual(chosen);
  });

  it('切换主题后即使返回同一局也不能撤销，新开局同样使撤销失效', () => {
    const app = setup();
    const originalTheme = app.theme.value;
    app.removeMember(operators[0].id);
    app.theme.value = null;
    expect(app.canUndoRemoval.value).toBe(false);
    app.theme.value = originalTheme;
    expect(app.undoRemoval()).toBe(false);
    expect(app.recruited.value).toEqual([operators[9]]);
    app.removeMember(operators[9].id);
    app.start.value = startWith(operators[3]);
    expect(app.canUndoRemoval.value).toBe(false);
    expect(app.undoRemoval()).toBe(false);
    expect(app.recruited.value).toEqual([operators[3]]);
  });
});
