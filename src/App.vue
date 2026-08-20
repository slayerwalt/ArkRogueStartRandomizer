<script setup lang="ts">
import { ref, watch } from 'vue';
import rawData from './data/rogue-data.json';
import RecruitSlots from './components/RecruitSlots.vue';
import SettingsPanel from './components/SettingsPanel.vue';
import SquadCard from './components/SquadCard.vue';
import { validateGameData } from './lib/data';
import { rerollSlot, rerollSquad, rollSlotsFor, rollStart } from './lib/roll';
import { DEFAULT_SETTINGS, loadSettings, saveSettings } from './lib/settings';
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

const settings = ref<RollSettings>({ ...DEFAULT_SETTINGS, excludes: [] });
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

function roll() {
  if (!theme) return;
  result.value = rollStart(theme, operators, settings.value);
}

function onRerollSquad() {
  if (!theme || !result.value) return;
  const squad = rerollSquad(theme);
  // 重摇分队后减免与预算改变，所有券位重新随机（组合保持不变）
  result.value = rollSlotsFor(operators, settings.value, squad, result.value.group);
}

function onRerollSlot(index: number) {
  if (!result.value) return;
  const { slots, squad, initialHope } = result.value;
  const budget = initialHope - slots.reduce((sum, s, i) => (i === index ? sum : sum + s.hopeCost), 0);
  const newSlots = slots.slice();
  newSlots[index] = rerollSlot(newSlots[index].slot, operators, settings.value, squad, budget);
  result.value = { ...result.value, slots: newSlots };
}
</script>

<template>
  <h1>黑流树海开局随机器</h1>

  <div v-if="loadError" class="error">{{ loadError }}</div>

  <template v-else-if="theme">
    <SettingsPanel v-model="settings" :operators="operators" />
    <p v-if="pruneNotice" class="notice">{{ pruneNotice }}</p>
    <button class="roll-button" @click="roll">🎲 开始随机</button>
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
      />
    </template>
  </template>
</template>
