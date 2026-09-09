<script setup lang="ts">
import { computed, ref } from 'vue';
import arknightsLogo from './assets/arknights-logo.svg';
import rawData from './data/rogue-data.json';
import AppIcon from './components/AppIcon.vue';
import BaseDialog from './components/BaseDialog.vue';
import IntroModal from './components/IntroModal.vue';
import RecruitSlots from './components/RecruitSlots.vue';
import SettingsPanel from './components/SettingsPanel.vue';
import SquadCard from './components/SquadCard.vue';
import { useRandomizer } from './composables/useRandomizer';
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
const { settings, storageNotice, pruneNotice } = useRollSettings(
  new Set(operators.map((o) => o.id)),
);
const {
  result,
  blockReason,
  usedHope,
  remainingHope,
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
  announcement.value = `${message}。剩余 ${remainingHope.value} 希望。${result.value?.slots.map((s, i) => `券位 ${i + 1}：${s.operator?.name ?? '暂无可选干员'}`).join('；')}`;
}
function selectTheme(id: string) {
  selectedThemeId.value = id;
  activeDialog.value = null;
  announcement.value = '';
}
</script>

<template>
  <a href="#main" class="skip-link">跳转到开局工作台</a>
  <header class="site-header">
    <div class="header-inner">
      <div class="brand">
        <span class="brand-symbol"><AppIcon name="shuffle" /></span>
        <div>
          <span class="brand-name">开局工作台</span>
          <span class="brand-subtitle">明日方舟 · 集成战略</span>
        </div>
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
    <div class="page-heading">
      <div>
        <p class="eyebrow">ROGUE START / 随机开局</p>
        <h1>让下一局，有点不一样。</h1>
      </div>
      <span class="page-caption">选好范围，剩下的交给随机。</span>
    </div>
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
        <h2>{{ selectedTheme.name }}</h2>
        <p>
          {{
            theme
              ? '从一支分队开始，走进未知的树海。'
              : '先看看这片世界，随机功能将在后续开放。'
          }}
        </p>
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
      <h2>暂时无法开始</h2>
      <p>{{ loadError }}</p>
    </div>
    <template v-else-if="theme">
      <section class="pool-summary" aria-label="当前随机范围">
        <div>
          <span class="pool-icon"><AppIcon name="sliders" /></span>
          <div>
            <strong>我的随机范围</strong>
            <p>
              <span v-for="r in POOL_RARITIES" :key="r" class="pool-count">
                {{ r }} 星 {{ settings.pool[r]?.length ?? 0 }} 名
              </span>
              <span class="summary-extra">三星固定参与</span>
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
      <p v-if="storageNotice || pruneNotice" class="notice" role="status">
        {{ [storageNotice, pruneNotice].filter(Boolean).join(' ') }}
      </p>
      <section class="results-section" aria-labelledby="result-title">
        <div class="results-toolbar">
          <div>
            <p class="eyebrow">YOUR NEXT RUN</p>
            <h2 id="result-title">
              {{ result ? '这一次的开局' : '准备好出发了吗？' }}
            </h2>
          </div>
          <button
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
        <div
          v-if="blockReason"
          id="pool-warning"
          class="inline-warning warning-action"
          role="status"
        >
          <span>{{ blockReason }}</span>
          <button class="text-button" @click="activeDialog = 'settings'">
            去调整范围
            <AppIcon name="arrow" />
          </button>
        </div>
        <div class="hope-strip" aria-label="希望预算">
          <span class="hope-label">希望预算</span>
          <dl>
            <div>
              <dt>初始</dt>
              <dd>{{ result?.initialHope ?? '—' }}</dd>
            </div>
            <div>
              <dt>已用</dt>
              <dd>{{ result ? usedHope : '—' }}</dd>
            </div>
            <div class="hope-remaining">
              <dt>剩余</dt>
              <dd>{{ result ? remainingHope : '—' }}</dd>
            </div>
          </dl>
          <span class="hope-note">按分队与干员减免计算</span>
        </div>
        <template v-if="result">
          <div class="context-grid">
            <SquadCard
              :squad="result.squad"
              :disabled="isBlocked"
              @reroll="run(rollSquad, '已重抽分队和全部券位')"
            />
            <section class="context-card group-card">
              <div class="section-top">
                <span class="eyebrow">招募组合</span>
                <button
                  class="text-button"
                  :disabled="isBlocked"
                  @click="run(rollGroup, '已重抽招募组合和全部券位')"
                >
                  <AppIcon name="shuffle" />
                  重抽组合
                </button>
              </div>
              <h3>{{ result.group.name }}</h3>
              <p>{{ result.group.desc }}</p>
              <span class="group-tag">
                {{ result.slots.length }} 张初始招募券
              </span>
            </section>
          </div>
          <div class="roster-heading">
            <h2>开局干员</h2>
            <span>想换一位？试试重抽此券。</span>
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
            范围调整仅影响后续随机。重抽分队或组合会重新生成全部券位。
          </p>
        </template>
        <div v-else class="welcome-panel">
          <div class="welcome-symbol"><AppIcon name="shuffle" /></div>
          <h3>你的下一套阵容，尚待揭晓。</h3>
          <p>随机一支分队、一组招募券，和属于这一局的干员。</p>
          <div class="welcome-steps">
            <span>
              <b>01</b>
              选择干员范围
            </span>
            <AppIcon name="chevron" />
            <span>
              <b>02</b>
              生成随机开局
            </span>
            <AppIcon name="chevron" />
            <span>
              <b>03</b>
              重抽，直到满意
            </span>
          </div>
        </div>
      </section>
    </template>
    <section v-else class="state-panel">
      <span class="eyebrow">COMING SOON</span>
      <h2>这段旅程，还在准备中。</h2>
      <p>
        「{{ selectedTheme.name }}」的随机开局尚未开放。
        <br />
        你可以先前往黑流树海，开始一场新的冒险。
      </p>
      <button class="button primary" @click="selectTheme('rogue_6')">
        前往黑流树海
        <AppIcon name="arrow" />
      </button>
    </section>
    <footer class="site-footer">
      <span class="footer-brand">
        <img :src="arknightsLogo" alt="明日方舟" width="78" height="24" />
        集成战略开局随机器
      </span>
      <span>非官方玩家工具 · 祝你开局顺利</span>
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
          ? '选择你的旅程'
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
          {{ t.available ? '可用 · 开始探索' : '尚未开放 · 可浏览' }}
        </span>
      </button>
    </div>
    <IntroModal v-else />
    <template #footer>
      <span v-if="activeDialog === 'settings'">
        {{ storageNotice ? '仅保存于本次会话' : '设置自动保存' }}
      </span>
      <button class="button primary" @click="activeDialog = null">
        {{ activeDialog === 'settings' ? '完成' : '返回工作台' }}
      </button>
    </template>
  </BaseDialog>
</template>
