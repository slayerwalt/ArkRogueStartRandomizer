<script setup lang="ts">
import { ref, watch } from 'vue';
import rawData from './data/rogue-data.json';
import LeaderboardPanel from './components/LeaderboardPanel.vue';
import RecruitSlots from './components/RecruitSlots.vue';
import SettingsPanel from './components/SettingsPanel.vue';
import SquadCard from './components/SquadCard.vue';
import { validateGameData } from './lib/data';
import { emptyPoolRarities } from './lib/pool';
import { rerollGroup, rerollSlot, rerollSquad, rollSlotsFor, rollStart } from './lib/roll';
import { createDefaultSettings, loadSettings, saveSettings } from './lib/settings';
import { appendRecord, loadStats, type Outcome, type RecordedOperator } from './lib/stats';
import type { GameData, RollResult, RollSettings } from './lib/types';

let data: GameData | null = null;
const loadError = ref('');
try {
  data = validateGameData(rawData);
} catch (e) {
  loadError.value = (e as Error).message;
}

const theme = data?.themes[0] ?? null;
const operators = data?.operators ?? [];

const settings = ref<RollSettings>(createDefaultSettings());
const pruneNotice = ref('');
if (data) {
  const loaded = loadSettings(window.localStorage, new Set(operators.map((o) => o.id)));
  settings.value = loaded.settings;
  if (loaded.pruned > 0) {
    pruneNotice.value = `已自动移除 ${loaded.pruned} 个数据中不存在的干员`;
    saveSettings(window.localStorage, settings.value);
  }
}
watch(settings, (s) => saveSettings(window.localStorage, s), { deep: true });

const result = ref<RollResult | null>(null);
/** 当前阵容是否已点过「就这个了！」；阵容变化后恢复可接受状态 */
const accepted = ref(false);
const records = ref(data ? loadStats(window.localStorage) : []);
/** 随机范围为空等导致无法随机时的提示 */
const rollNotice = ref('');

/** 有星级的随机范围为空时返回提示文案，否则返回空串 */
function poolBlockReason(): string {
  if (!settings.value.withOperators) return '';
  const missing = emptyPoolRarities(settings.value);
  return missing.length ? `请先在随机设置中为 ${missing.join('、')} 星选择随机范围` : '';
}

function currentOperators(): RecordedOperator[] {
  if (!result.value) return [];
  return result.value.slots
    .map((s) => s.operator)
    .filter((o): o is NonNullable<typeof o> => o !== null)
    .map((o) => ({ id: o.id, name: o.name, rarity: o.rarity }));
}

/** 记录一次开局决策（接受/放弃）；无干员时不记录 */
function record(outcome: Outcome, ops: RecordedOperator[]) {
  if (!result.value || ops.length === 0) return;
  records.value = appendRecord(window.localStorage, records.value, {
    time: new Date().toISOString(),
    outcome,
    squadName: result.value.squad.name,
    groupName: result.value.group.name,
    operators: ops,
  });
}

function roll() {
  if (!theme) return;
  const reason = poolBlockReason();
  if (reason) {
    rollNotice.value = reason;
    return;
  }
  rollNotice.value = '';
  result.value = rollStart(theme, operators, settings.value);
  accepted.value = false;
}

function onAccept() {
  if (!result.value || accepted.value) return;
  record('accepted', currentOperators());
  accepted.value = true;
}

function onRerollAll() {
  // 先校验范围，避免把当前阵容误记为放弃
  if (poolBlockReason()) {
    roll();
    return;
  }
  if (result.value && !accepted.value) record('abandoned', currentOperators());
  roll();
}

function onRerollSquad() {
  if (!theme || !result.value) return;
  // 重摇分队后减免与预算改变，所有券位重新随机（组合保持不变）；原阵容记为放弃
  record('abandoned', currentOperators());
  const squad = rerollSquad(theme);
  result.value = rollSlotsFor(operators, settings.value, squad, result.value.group);
  accepted.value = false;
}

function onRerollGroup() {
  if (!theme || !result.value) return;
  // 重摇招募组合，所有券位重新随机（分队保持不变）；原阵容记为放弃
  record('abandoned', currentOperators());
  const group = rerollGroup(theme);
  result.value = rollSlotsFor(operators, settings.value, result.value.squad, group);
  accepted.value = false;
}

function onRerollSlot(index: number) {
  if (!result.value) return;
  const { slots, squad, initialHope } = result.value;
  const old = slots[index].operator;
  if (old) record('abandoned', [{ id: old.id, name: old.name, rarity: old.rarity }]);
  const budget = initialHope - slots.reduce((sum, s, i) => (i === index ? sum : sum + s.hopeCost), 0);
  const newSlots = slots.slice();
  newSlots[index] = rerollSlot(newSlots[index].slot, operators, settings.value, squad, budget);
  result.value = { ...result.value, slots: newSlots };
  accepted.value = false;
}
</script>

<template>
  <h1>黑流树海开局随机器</h1>

  <div v-if="loadError" class="error">{{ loadError }}</div>

  <template v-else-if="theme">
    <SettingsPanel v-model="settings" :operators="operators" />
    <p v-if="pruneNotice" class="notice">{{ pruneNotice }}</p>
    <button class="roll-button" @click="roll">🎲 开始随机</button>
    <p v-if="rollNotice" class="notice">{{ rollNotice }}</p>
    <template v-if="result">
      <div class="hope-bar">
        初始希望 <strong>{{ result.initialHope }}</strong>，本局消耗
        <strong>{{ result.slots.reduce((s, sl) => s + sl.hopeCost, 0) }}</strong>
      </div>
      <SquadCard :squad="result.squad" @reroll="onRerollSquad" />
      <RecruitSlots
        :group="result.group"
        :slots="result.slots"
        :with-operators="settings.withOperators"
        @reroll-slot="onRerollSlot"
        @reroll-group="onRerollGroup"
      />
      <div v-if="settings.withOperators" class="action-bar">
        <button class="accept-button" :disabled="accepted" @click="onAccept">
          {{ accepted ? '✓ 就这个了！' : '就这个了！' }}
        </button>
        <button class="reroll-all-button" @click="onRerollAll">重roll！</button>
      </div>
    </template>
    <LeaderboardPanel :records="records" />
  </template>
</template>
