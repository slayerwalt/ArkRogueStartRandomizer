import { ref, watch } from 'vue';
import { describe, expect, it } from 'vitest';
import rawData from '../src/data/rogue-data.json';
import { validateGameData } from '../src/lib/data';
import { createDefaultSettings } from '../src/lib/settings';
import type { Theme } from '../src/lib/types';
import { useCandidateStart } from '../src/composables/useCandidateStart';
import { useRandomizer } from '../src/composables/useRandomizer';
import { useStartConfirmation } from '../src/composables/useStartConfirmation';
import { useInRunRecruitment } from '../src/composables/useInRunRecruitment';

const data = validateGameData(rawData);
function setup() {
  const theme = ref<Theme | null>(data.themes[0]);
  const settings = ref(createDefaultSettings(data.operators));
  const inRun = useInRunRecruitment(theme, data.operators, settings, () => 0.31);
  const candidates = useCandidateStart(theme, data.operators, settings, () => 0.31, inRun.sixStars);
  const quick = useRandomizer(theme, data.operators, settings, () => 0.31, inRun.sixStars);
  const confirmation = useStartConfirmation(theme, candidates, quick.result, inRun.sixStars);
  watch(confirmation.confirmedStart, (start) => { if (start) inRun.applyStart(start); }, { flush: 'sync' });
  return { theme, settings, candidates, quick, confirmation, inRun };
}
function fillCandidates(app: ReturnType<typeof setup>) {
  for (const profession of ['CASTER', 'MEDIC', 'WARRIOR']) app.candidates.fillProfession(profession);
  app.candidates.rollSquad();
  app.candidates.rollCandidates();
  app.candidates.selectCandidate(app.candidates.draw.value!.candidates[0].id);
}
function continueRun(app: ReturnType<typeof setup>) {
  const extra = app.inRun.registrationOptions('manual')[0];
  app.inRun.register(extra.id, 'manual');
  app.inRun.drawTicket('any');
  app.inRun.selectCandidate(app.inRun.candidates.value[0].id);
  return { members: app.inRun.members.value, draw: app.inRun.draw.value, chosen: app.inRun.chosen.value };
}

describe('开局草稿重置', () => {
  it('随心所欲重置后重新填写并生成，保留已确认快照和正在进行的本局', () => {
    const app = setup();
    fillCandidates(app);
    expect(app.confirmation.confirmCandidate()).toBe(true);
    const start = app.confirmation.confirmedStart.value;
    const oldDraw = app.candidates.draw.value;
    const run = continueRun(app);
    const settings = JSON.stringify(app.settings.value);

    app.candidates.resetDraft();
    expect(app.candidates.professions.value).toEqual([]);
    expect(app.candidates.professionSlot.value).toBe(0);
    expect(app.candidates.squad.value).toBeNull();
    expect(app.candidates.squadRandomized.value).toBe(false);
    expect(app.candidates.draw.value).toBeNull();
    expect(app.candidates.chosen.value).toBeNull();
    expect(app.candidates.confirmed.value).toBe(false);
    expect(app.confirmation.candidateRegistered.value).toBe(false);
    expect(app.confirmation.confirmCandidate()).toBe(false);
    expect(JSON.stringify(app.settings.value)).toBe(settings);

    for (let i = 0; i < 3; i++) app.candidates.fillProfession('MEDIC');
    app.candidates.rollCandidates();
    expect(app.candidates.draw.value).not.toBe(oldDraw);
    expect(app.candidates.draw.value!.candidates.every((operator) => operator.profession === 'MEDIC')).toBe(true);
    expect(app.candidates.chosen.value).toBeNull();
    expect(app.candidates.confirmed.value).toBe(false);
    expect(app.confirmation.confirmedStart.value).toBe(start);
    expect(app.inRun.members.value).toBe(run.members);
    expect(app.inRun.draw.value).toBe(run.draw);
    expect(app.inRun.chosen.value).toBe(run.chosen);

    app.candidates.selectCandidate(app.candidates.draw.value!.candidates[0].id);
    expect(app.confirmation.confirmCandidate()).toBe(true);
    expect(app.confirmation.confirmedStart.value).not.toBe(start);
    expect(app.inRun.recruited.value).toEqual([...run.members.map((member) => member.operator), app.candidates.chosen.value]);
    expect(app.inRun.draw.value).toBeNull();
  });

  it('全随机重置清空条件和阵容，下一次使用新选择，确认之前不改变本局', () => {
    const app = setup();
    app.quick.selectSquad(app.theme.value!.squads[0].id);
    app.quick.selectGroup(app.theme.value!.recruitGroups[0].id);
    app.quick.roll();
    expect(app.confirmation.confirmQuick()).toBe(true);
    const start = app.confirmation.confirmedStart.value;
    const oldResult = app.quick.result.value;
    const run = continueRun(app);
    const settings = JSON.stringify(app.settings.value);

    app.quick.resetDraft();
    expect(app.quick.squad.value).toBeNull();
    expect(app.quick.group.value).toBeNull();
    expect(app.quick.result.value).toBeNull();
    expect(app.quick.squadRandomized.value).toBe(false);
    expect(app.quick.groupRandomized.value).toBe(false);
    expect(app.quick.usedHope.value).toBe(0);
    expect(app.quick.remainingHope.value).toBe(0);
    expect(app.confirmation.quickRegistered.value).toBe(false);
    expect(app.confirmation.canConfirmQuick.value).toBe(false);
    expect(app.confirmation.confirmQuick()).toBe(false);
    expect(JSON.stringify(app.settings.value)).toBe(settings);

    const squad = app.theme.value!.squads.at(-1)!;
    const group = app.theme.value!.recruitGroups.at(-1)!;
    app.quick.selectSquad(squad.id);
    app.quick.selectGroup(group.id);
    expect(app.quick.result.value).toBeNull();
    app.quick.roll();
    expect(app.quick.result.value).not.toBe(oldResult);
    expect(app.quick.result.value!.squad).toBe(squad);
    expect(app.quick.result.value!.group).toBe(group);
    expect(app.confirmation.quickRegistered.value).toBe(false);
    expect(app.confirmation.confirmedStart.value).toBe(start);
    expect(app.inRun.members.value).toBe(run.members);
    expect(app.inRun.draw.value).toBe(run.draw);
    expect(app.inRun.chosen.value).toBe(run.chosen);

    expect(app.confirmation.confirmQuick()).toBe(true);
    expect(app.confirmation.confirmedStart.value).not.toBe(start);
    expect(app.inRun.recruited.value).toEqual(expect.arrayContaining([
      ...run.members.map((member) => member.operator), ...app.confirmation.confirmedStart.value!.operators,
    ]));
    expect(app.inRun.draw.value).toBeNull();
  });

  it('尚未生成结果时也能清空券位编辑、分队和组合，再次选择从空草稿开始', () => {
    const app = setup();
    app.candidates.fillProfession('CASTER');
    app.candidates.fillProfession('MEDIC');
    app.candidates.selectProfessionSlot(0);
    app.candidates.rollSquad();
    app.quick.rollSquad();
    app.quick.rollGroup();
    app.candidates.resetDraft();
    app.quick.resetDraft();
    expect(app.candidates.professions.value).toEqual([]);
    expect(app.candidates.professionSlot.value).toBe(0);
    expect(app.candidates.squad.value).toBeNull();
    expect(app.candidates.squadRandomized.value).toBe(false);
    expect(app.quick.squad.value).toBeNull();
    expect(app.quick.group.value).toBeNull();
    expect(app.quick.squadRandomized.value).toBe(false);
    expect(app.quick.groupRandomized.value).toBe(false);
    app.candidates.fillProfession('WARRIOR');
    expect(app.candidates.professions.value).toEqual(['WARRIOR']);
    expect(app.candidates.professionSlot.value).toBe(1);
    app.quick.roll();
    expect(app.quick.result.value).not.toBeNull();
  });

  it('主题不可用或没有匹配草稿时重置，不会破坏原主题的选择和结果', () => {
    const app = setup();
    fillCandidates(app);
    app.quick.roll();
    const previous = {
      draw: app.candidates.draw.value,
      chosen: app.candidates.chosen.value,
      squad: app.candidates.squad.value,
      result: app.quick.result.value,
    };
    for (const theme of [null, { ...data.themes[0], id: 'other-theme' }]) {
      app.theme.value = theme;
      app.candidates.resetDraft();
      app.quick.resetDraft();
      expect(app.candidates.draw.value).toBeNull();
      expect(app.quick.result.value).toBeNull();
      app.theme.value = data.themes[0];
      expect(app.candidates.draw.value).toBe(previous.draw);
      expect(app.candidates.chosen.value).toBe(previous.chosen);
      expect(app.candidates.squad.value).toBe(previous.squad);
      expect(app.quick.result.value).toBe(previous.result);
    }
    app.candidates.resetDraft();
    app.quick.resetDraft();
    app.theme.value = null;
    app.theme.value = data.themes[0];
    expect(app.candidates.draw.value).toBeNull();
    expect(app.quick.result.value).toBeNull();
  });

  it('共享范围不足阻止抽取时仍能重置，范围内容保持不变', () => {
    const app = setup();
    fillCandidates(app);
    app.quick.roll();
    app.settings.value.pool[6] = [];
    expect(app.candidates.canDraw.value).toBe(false);
    expect(app.quick.blockReason.value).not.toBe('');
    const settings = JSON.stringify(app.settings.value);
    app.candidates.resetDraft();
    app.quick.resetDraft();
    expect(app.candidates.draw.value).toBeNull();
    expect(app.quick.result.value).toBeNull();
    expect(JSON.stringify(app.settings.value)).toBe(settings);
  });

  it('两种草稿分别重置，单独重置一种不会修改另一种草稿', () => {
    const app = setup();
    fillCandidates(app);
    app.quick.roll();
    const result = app.quick.result.value;
    app.candidates.resetDraft();
    expect(app.quick.result.value).toBe(result);
    fillCandidates(app);
    const draw = app.candidates.draw.value;
    const chosen = app.candidates.chosen.value;
    app.quick.resetDraft();
    expect(app.candidates.draw.value).toBe(draw);
    expect(app.candidates.chosen.value).toBe(chosen);
  });
});
