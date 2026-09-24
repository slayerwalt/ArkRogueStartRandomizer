<script setup lang="ts">
import { computed, ref } from 'vue';
import arknightsLogo from './assets/arknights-logo.svg';
import rawData from './data/rogue-data.json';
import AppIcon from './components/AppIcon.vue';
import BaseDialog from './components/BaseDialog.vue';
import CandidateStartPanel from './components/CandidateStartPanel.vue';
import IntroModal from './components/IntroModal.vue';
import RecruitSlots from './components/RecruitSlots.vue';
import SettingsPanel from './components/SettingsPanel.vue';
import SquadCard from './components/SquadCard.vue';
import { useRandomizer } from './composables/useRandomizer';
import { useCandidateStart } from './composables/useCandidateStart';
import { useRollSettings } from './composables/useRollSettings';
import { validateGameData } from './lib/data';
import { ROGUE_THEMES } from './lib/themes';
import { POOL_RARITIES, type GameData } from './lib/types';

let data: GameData | null = null;
let loadError = '';
try {
  data = validateGameData(rawData);
} catch {
  loadError = '游戏数据暂时无法读取，请刷新页面重试。';
}
const operators = data?.operators ?? [];
const selectedThemeId = ref('rogue_6');
const selectedTheme = computed(
  () => ROGUE_THEMES.find((t) => t.id === selectedThemeId.value)!,
);
const theme = computed(() =>
  selectedTheme.value.available
    ? (data?.themes.find((t) => t.id === selectedThemeId.value) ?? null)
    : null,
);
const activeDialog = ref<'settings' | 'themes' | 'help' | null>(null);
const { settings, storageNotice, pruneNotice, migrationNotice } = useRollSettings(operators);
const startMode = ref<'candidates' | 'quick'>('candidates');
const summaryRarities = computed(() => startMode.value === 'candidates' ? [6] : POOL_RARITIES);
const candidateStart = useCandidateStart(theme, operators, settings);
const {
  result,
  blockReason,
  roll,
  rollSquad,
  rollGroup,
  rollSlot,
} = useRandomizer(theme, operators, settings);
const announcement = ref('');
const isBlocked = computed(() => Boolean(blockReason.value));
function run(action: () => void, message: string) {
  if (isBlocked.value) return;
  action();
  announcement.value = `${message}。${result.value?.slots.map((s, i) => `券位 ${i + 1}：${s.operator ? `${s.operator.name}，${s.operator.rarity} 星` : '暂无可选干员'}`).join('；')}`;
}
function selectTheme(id: string) {
  selectedThemeId.value = id;
  activeDialog.value = null;
  announcement.value = '';
}
</script>

<template>
  <a href="#main" class="skip-link">跳转到主要内容</a>
  <header class="site-header">
    <div class="header-inner">
      <div class="brand">
        <span class="brand-symbol"><AppIcon name="shuffle" /></span>
        <span class="brand-name">明日方舟集成战略随机工具</span>
      </div>
      <nav aria-label="工具导航">
        <button
          class="nav-button"
          aria-haspopup="dialog"
          @click="activeDialog = 'themes'"
        >
          <AppIcon name="grid" />
          切换主题
        </button>
        <button
          class="nav-button"
          aria-haspopup="dialog"
          @click="activeDialog = 'help'"
        >
          <AppIcon name="help" />
          使用说明
        </button>
      </nav>
    </div>
  </header>

  <main id="main" class="workspace">
    <section class="theme-banner" aria-label="当前肉鸽主题">
      <div class="theme-copy">
        <div class="theme-status">
          <span
            :class="['status-dot', { unavailable: !theme }]"
            aria-hidden="true"
          ></span>
          {{ theme ? '当前可用' : '尚未开放' }}
          <span class="theme-index">
            THEME / 0{{
              ROGUE_THEMES.findIndex((t) => t.id === selectedThemeId) + 1
            }}
          </span>
        </div>
        <h1>{{ selectedTheme.name }}</h1>
      </div>
      <img
        class="theme-art"
        :src="selectedTheme.showcase"
        :alt="selectedTheme.name + '主题插图'"
        width="560"
        height="240"
      />
    </section>

    <div v-if="loadError" class="state-panel" role="alert">
      <h2>数据加载失败</h2>
      <p>{{ loadError }}</p>
    </div>
    <template v-else-if="theme">
      <section class="pool-summary" aria-label="当前随机范围">
        <div>
          <span class="pool-icon"><AppIcon name="sliders" /></span>
          <div>
            <strong>{{ startMode === 'candidates' ? '六星随机范围' : '干员随机范围' }}</strong>
            <p>
              <span v-for="r in summaryRarities" :key="r" class="pool-count">
                {{ r }} 星 {{ settings.pool[r]?.length ?? 0 }} 名
              </span>
              <span class="summary-extra">{{ startMode === 'candidates' ? '用于起手候选' : '三星固定参与' }}</span>
            </p>
          </div>
        </div>
        <button
          class="button secondary"
          aria-haspopup="dialog"
          @click="activeDialog = 'settings'"
        >
          调整范围
          <AppIcon name="chevron" />
        </button>
      </section>
      <p v-if="storageNotice || pruneNotice || migrationNotice" class="notice" role="status">
        {{ [storageNotice, pruneNotice, migrationNotice].filter(Boolean).join(' ') }}
      </p>
      <section class="results-section" aria-labelledby="result-title">
        <div class="results-toolbar">
          <h2 id="result-title">随机开局</h2>
          <button
            v-if="startMode === 'quick'"
            class="button primary roll-button"
            :disabled="isBlocked"
            :aria-describedby="isBlocked ? 'pool-warning' : undefined"
            @click="run(roll, '已生成新开局')"
          >
            <AppIcon name="shuffle" />
            {{ result ? '重新随机全部' : '开始随机' }}
            <AppIcon name="arrow" />
          </button>
        </div>
        <div class="start-mode-switch" role="group" aria-label="开局方式">
          <button :aria-pressed="startMode === 'candidates'" @click="startMode = 'candidates'; announcement = ''">候选开局</button>
          <button :aria-pressed="startMode === 'quick'" @click="startMode = 'quick'; announcement = ''">一键随机</button>
        </div>
        <CandidateStartPanel
          v-if="startMode === 'candidates'"
          :controller="candidateStart"
          @settings="activeDialog = 'settings'"
        />
        <template v-else>
        <div
          v-if="blockReason"
          id="pool-warning"
          class="inline-warning warning-action"
          role="status"
        >
          <span>{{ blockReason }}</span>
          <button class="text-button" @click="activeDialog = 'settings'">
            调整范围
            <AppIcon name="arrow" />
          </button>
        </div>
        <template v-if="result">
          <div class="context-grid">
            <SquadCard
              :squad="result.squad"
              :disabled="isBlocked"
              @reroll="run(rollSquad, '已重抽分队和全部券位')"
            />
            <section class="context-card group-card">
              <div class="context-main">
                <span class="eyebrow">招募组合</span>
                <h3>{{ result.group.name }}</h3>
                <p>{{ result.group.desc }}</p>
              </div>
              <button
                class="text-button"
                :disabled="isBlocked"
                @click="run(rollGroup, '已重抽招募组合和全部券位')"
              >
                <AppIcon name="shuffle" />
                重抽组合
              </button>
            </section>
          </div>
          <div class="roster-heading">
            <h2>开局干员</h2>
          </div>
          <RecruitSlots
            :slots="result.slots"
            :disabled="isBlocked"
            @reroll-slot="
              (i) => run(() => rollSlot(i), `已重抽第 ${i + 1} 个券位`)
            "
            @settings="activeDialog = 'settings'"
          />
          <p class="result-footnote">
            点击干员可重抽该券位。范围调整仅影响后续随机；重抽分队或组合会重新生成全部券位。
          </p>
        </template>
        <div v-else class="welcome-panel">
          <h3>暂无随机结果</h3>
          <p>点击“开始随机”生成分队、招募组合与干员。</p>
        </div>
        </template>
      </section>
    </template>
    <section v-else class="state-panel">
      <h2>当前主题暂未开放</h2>
      <p>「{{ selectedTheme.name }}」暂不支持随机开局。</p>
      <button class="button primary" @click="selectTheme('rogue_6')">
        切换至黑流树海
        <AppIcon name="arrow" />
      </button>
    </section>
    <footer class="site-footer">
      <span class="footer-brand">
        <img :src="arknightsLogo" alt="明日方舟" width="78" height="24" />
        集成战略随机工具
      </span>
      <span>非官方玩家工具</span>
    </footer>
    <p class="sr-only" role="status" aria-live="polite" aria-atomic="true">
      {{ announcement }}
    </p>
  </main>

  <BaseDialog
    v-if="activeDialog"
    :title="
      activeDialog === 'settings'
        ? '调整随机范围'
        : activeDialog === 'themes'
          ? '选择肉鸽主题'
          : '使用说明'
    "
    :drawer="activeDialog === 'settings'"
    @close="activeDialog = null"
  >
    <template v-if="activeDialog === 'settings'">
      <SettingsPanel v-model="settings" :operators="operators" />
      <p v-if="storageNotice" class="inline-warning" role="status">
        {{ storageNotice }}
      </p>
    </template>
    <div v-else-if="activeDialog === 'themes'" class="theme-grid">
      <button
        v-for="t in ROGUE_THEMES"
        :key="t.id"
        class="theme-option"
        :aria-pressed="selectedThemeId === t.id"
        @click="selectTheme(t.id)"
      >
        <img :src="t.showcase" alt="" width="280" height="120" loading="lazy" />
        <span class="theme-option-name">
          {{ t.name }}
          <AppIcon v-if="selectedThemeId === t.id" name="check" />
        </span>
        <span class="theme-option-status">
          {{ t.available ? '支持随机开局' : '暂未开放' }}
        </span>
      </button>
    </div>
    <IntroModal v-else />
    <template #footer>
      <span v-if="activeDialog === 'settings'">
        {{ storageNotice ? '仅保存于本次会话' : '设置自动保存' }}
      </span>
      <button class="button primary" @click="activeDialog = null">
        {{ activeDialog === 'settings' ? '完成' : '返回首页' }}
      </button>
    </template>
  </BaseDialog>
</template>
