<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import rawData from './data/rogue-data.json';
import RecruitSlots from './components/RecruitSlots.vue';
import SettingsPanel from './components/SettingsPanel.vue';
import SquadCard from './components/SquadCard.vue';
import { validateGameData } from './lib/data';
import { emptyPoolRarities } from './lib/pool';
import { rerollGroup, rerollSlot, rerollSquad, rollSlotsFor, rollStart } from './lib/roll';
import { createDefaultSettings, loadSettings, saveSettings } from './lib/settings';
import { ROGUE_THEMES } from './lib/themes';
import type { GameData, RollResult, RollSettings } from './lib/types';

let data: GameData | null = null;
const loadError = ref('');
try {
  data = validateGameData(rawData);
} catch (e) {
  loadError.value = (e as Error).message;
}

/** 页面顶部选中的肉鸽主题；默认黑流树海（目前唯一已开放的主题） */
const selectedThemeId = ref('rogue_6');
const selectedTheme = computed(
  () => ROGUE_THEMES.find((t) => t.id === selectedThemeId.value) ?? ROGUE_THEMES[0],
);
/** 当前选中主题的游戏数据；未提取数据的主题为 null（显示开发中占位） */
const theme = computed(() => data?.themes.find((t) => t.id === selectedThemeId.value) ?? null);
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
/** 结果版本号：每次阵容变化自增，用作结果区的 key 以重放登场动画 */
const resultVersion = ref(0);
watch(result, () => resultVersion.value++);
/** 随机范围为空等导致无法随机时的提示 */
const rollNotice = ref('');

/** 有星级的随机范围为空时返回提示文案，否则返回空串 */
function poolBlockReason(): string {
  if (!settings.value.withOperators) return '';
  const missing = emptyPoolRarities(settings.value);
  return missing.length ? `请先在随机设置中为 ${missing.join('、')} 星选择随机范围` : '';
}

function roll() {
  if (!theme.value) return;
  const reason = poolBlockReason();
  if (reason) {
    rollNotice.value = reason;
    return;
  }
  rollNotice.value = '';
  result.value = rollStart(theme.value, operators, settings.value);
}

function onRerollSquad() {
  if (!theme.value || !result.value) return;
  // 重摇分队后减免与预算改变，所有券位重新随机（组合保持不变）
  const squad = rerollSquad(theme.value);
  result.value = rollSlotsFor(operators, settings.value, squad, result.value.group);
}

function onRerollGroup() {
  if (!theme.value || !result.value) return;
  // 重摇招募组合，所有券位重新随机（分队保持不变）
  const group = rerollGroup(theme.value);
  result.value = rollSlotsFor(operators, settings.value, result.value.squad, group);
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
  <header class="site-header">
    <div class="site-eyebrow">明日方舟 · 集成战略</div>
    <h1>开局随机器</h1>
    <div class="site-rule" aria-hidden="true"><span></span><i>◆</i><span></span></div>
  </header>

  <nav class="theme-select" aria-label="选择肉鸽主题">
    <button
      v-for="t in ROGUE_THEMES"
      :key="t.id"
      class="theme-tab"
      :class="{ active: t.id === selectedThemeId }"
      :aria-pressed="t.id === selectedThemeId"
      @click="selectedThemeId = t.id"
    >
      <span class="theme-tab-name">{{ t.name }}</span>
      <span v-if="!t.available" class="theme-tab-badge">开发中</span>
    </button>
  </nav>

  <div class="theme-banner">
    <img :key="selectedTheme.id" :src="selectedTheme.banner" :alt="selectedTheme.name" />
  </div>

  <div v-if="loadError" class="error">{{ loadError }}</div>

  <div v-else-if="!selectedTheme.available || !theme" class="wip-card">
    <div class="wip-mark" aria-hidden="true">◆</div>
    <div class="wip-title">正在开发中</div>
    <div class="wip-desc">「{{ selectedTheme.name }}」的开局随机尚未开放，敬请期待</div>
  </div>

  <template v-else>
    <SettingsPanel v-model="settings" :operators="operators" />
    <p v-if="pruneNotice" class="notice">{{ pruneNotice }}</p>
    <button class="roll-button" @click="roll">🎲 开始随机</button>
    <p v-if="rollNotice" class="notice">{{ rollNotice }}</p>
    <template v-if="result">
      <!-- key 绑定结果版本号，重roll 后重新挂载以重放登场动画 -->
      <div :key="resultVersion" class="result-area">
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
          <button class="reroll-all-button" @click="roll">重roll！</button>
        </div>
      </div>
    </template>
  </template>
</template>
