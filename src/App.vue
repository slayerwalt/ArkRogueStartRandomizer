<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import arknightsLogo from './assets/arknights-logo.svg';
import IntroModal from './components/IntroModal.vue';
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
/** 随机设置面板是否展开（由页眉左上角设置图标控制） */
const settingsOpen = ref(false);
/** 用法介绍弹窗：首次进入时弹出，关闭后记住不再弹出 */
const INTRO_SEEN_KEY = 'rogue-start-intro-seen';
const introOpen = ref(false);
try {
  introOpen.value = window.localStorage.getItem(INTRO_SEEN_KEY) !== '1';
} catch {
  introOpen.value = false;
}

function closeIntro() {
  introOpen.value = false;
  try {
    window.localStorage.setItem(INTRO_SEEN_KEY, '1');
  } catch {
    // 存储不可用时静默忽略，下次仍会弹出
  }
}

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
  <div class="page-bg" aria-hidden="true">
    <img :key="selectedTheme.id" :src="selectedTheme.banner" alt="" />
  </div>

  <header class="site-header">
    <div class="site-header-inner">
      <button
        class="settings-icon"
        aria-haspopup="dialog"
        aria-label="随机设置"
        title="随机设置"
        @click="settingsOpen = true"
      >
        <span class="settings-icon-glyph" aria-hidden="true">⚙</span>
        <span>设置</span>
      </button>
      <div class="site-brand">
        <img class="site-logo" :src="arknightsLogo" alt="明日方舟" />
        <span class="site-divider">|</span>
        <span class="site-title">集成战略随机开局</span>
      </div>
      <select v-model="selectedThemeId" class="theme-select" aria-label="选择肉鸽主题">
        <option v-for="t in ROGUE_THEMES" :key="t.id" :value="t.id">{{ t.name }}</option>
      </select>
    </div>
  </header>

  <div class="theme-showcase">
    <img :key="selectedTheme.id" :src="selectedTheme.showcase" :alt="selectedTheme.name" />
  </div>

  <div v-if="loadError" class="error">{{ loadError }}</div>

  <div v-else-if="!selectedTheme.available || !theme" class="wip-card">
    <div class="wip-mark" aria-hidden="true">◆</div>
    <div class="wip-title">正在开发中</div>
    <div class="wip-desc">「{{ selectedTheme.name }}」的开局随机尚未开放，敬请期待</div>
  </div>

  <template v-else>
    <p v-if="pruneNotice" class="notice">{{ pruneNotice }}</p>
    <button v-if="!result" class="roll-button" @click="roll">开始随机</button>
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
          @reroll-slot="onRerollSlot"
          @reroll-group="onRerollGroup"
        />
        <div class="action-bar">
          <button class="reroll-all-button" @click="roll">重roll！</button>
        </div>
      </div>
    </template>
  </template>

  <!-- 首次进入的用法介绍弹窗 -->
  <IntroModal v-if="introOpen" @close="closeIntro" />

  <!-- 随机设置弹窗 -->
  <div v-if="settingsOpen" class="settings-overlay" @click.self="settingsOpen = false">
    <div class="settings-modal" role="dialog" aria-modal="true" aria-label="随机设置">
      <div class="settings-modal-head">
        <span class="settings-modal-title">随机设置</span>
        <button class="settings-close" aria-label="关闭" @click="settingsOpen = false">×</button>
      </div>
      <div class="settings-modal-body">
        <SettingsPanel v-model="settings" :operators="operators" />
      </div>
    </div>
  </div>
</template>
