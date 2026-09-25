<script setup lang="ts">
import { computed, nextTick, ref } from 'vue';
import arknightsLogo from './assets/arknights-logo.svg';
import rawData from './data/rogue-data.json';
import rawChallenges from './data/challenge-pools.json';
import AppIcon from './components/AppIcon.vue';
import BaseDialog from './components/BaseDialog.vue';
import CandidateStartPanel from './components/CandidateStartPanel.vue';
import IntroModal from './components/IntroModal.vue';
import InRunRecruitmentPanel from './components/InRunRecruitmentPanel.vue';
import ChallengePanel from './components/ChallengePanel.vue';
import RecruitSlots from './components/RecruitSlots.vue';
import RecruitedOperators from './components/RecruitedOperators.vue';
import SettingsPanel from './components/SettingsPanel.vue';
import SquadCard from './components/SquadCard.vue';
import StartOptions from './components/StartOptions.vue';
import { useRandomizer } from './composables/useRandomizer';
import { useCandidateStart } from './composables/useCandidateStart';
import { useRollSettings } from './composables/useRollSettings';
import { useStartConfirmation } from './composables/useStartConfirmation';
import { useInRunRecruitment } from './composables/useInRunRecruitment';
import { useChallenges } from './composables/useChallenges';
import { readChallengePools, type ChallengePool } from './lib/challenges';
import { validateGameData } from './lib/data';
import { ROGUE_THEMES, squadIcon } from './lib/themes';
import type { GameData } from './lib/types';

let data: GameData | null = null;
let loadError = '';
try {
  data = validateGameData(rawData);
} catch {
  loadError = '游戏数据暂时无法读取，请刷新页面重试。';
}
const operators = data?.operators ?? [];
let challengePools: ChallengePool[] = [];
let challengeError = '';
try {
  challengePools = readChallengePools(rawChallenges);
} catch {
  challengeError = '词条池暂时无法读取，请刷新页面重试。';
}
const selectedThemeId = ref('rogue_6');
const selectedTheme = computed(
  () => ROGUE_THEMES.find((t) => t.id === selectedThemeId.value)!,
);
const theme = computed(() =>
  selectedTheme.value.available
    ? (data?.themes.find((t) => t.id === selectedThemeId.value) ?? null)
    : null,
);
const activeDialog = ref<'settings' | 'themes' | 'help' | 'squad' | 'group' | null>(null);
const { settings, storageNotice, pruneNotice, migrationNotice } = useRollSettings(operators);
const startMode = ref<'candidates' | 'quick'>('candidates');
const candidateStart = useCandidateStart(theme, operators, settings);
const {
  result,
  squad: quickSquad,
  group: quickGroup,
  squadRandomized,
  groupRandomized,
  blockReason,
  roll,
  rollSquad,
  rollGroup,
  rollSlot,
  selectSquad,
  selectGroup,
} = useRandomizer(theme, operators, settings);
const { confirmedStart, recruited, hasConfirmed, collapsed, candidateRegistered, quickRegistered,
  canConfirmQuick, toggleCollapsed, confirmCandidate, confirmQuick } = useStartConfirmation(theme, candidateStart, result);
const inRun = useInRunRecruitment(operators, settings, confirmedStart);
const challenges = useChallenges(theme, challengePools);
const startToggle = ref<HTMLButtonElement>();
const choiceOptions = computed(() => activeDialog.value === 'group'
  ? (theme.value?.recruitGroups ?? []).map(({ id, name, desc }) => ({ id, name, desc }))
  : (theme.value?.squads ?? []).map(({ id, name }) => ({ id, name, icon: squadIcon(id) })));
const selectedChoiceId = computed(() => activeDialog.value === 'group'
  ? quickGroup.value?.id
  : (startMode.value === 'candidates' ? candidateStart.squad.value?.id : quickSquad.value?.id));
const announcement = ref('');
const isBlocked = computed(() => Boolean(blockReason.value));
async function finishStart(confirm: () => boolean) {
  if (!confirm()) return;
  announcement.value = recruited.value.length
    ? `已确认开局，已招募六星干员：${recruited.value.map((operator) => operator.name).join('、')}。随机开局已收起。`
    : '已确认开局，本次没有六星干员。随机开局已收起。';
  await nextTick();
  startToggle.value?.focus();
}
function run(action: () => void, message: string) {
  if (isBlocked.value) return;
  action();
  const slots = result.value?.slots.map((s, i) => `券位 ${i + 1}：${s.operator ? `${s.operator.name}，${s.operator.rarity} 星` : '暂无可选干员'}`).join('；');
  announcement.value = [message, slots].filter(Boolean).join('。');
}
function chooseStartOption(id: string) {
  if (activeDialog.value === 'squad') {
    if (startMode.value === 'candidates') {
      candidateStart.selectSquad(id);
      announcement.value = `开局分队：${candidateStart.squad.value?.name}`;
    } else {
      run(() => selectSquad(id), '已选择分队');
    }
  } else if (activeDialog.value === 'group') {
    run(() => selectGroup(id), '已选择招募组合');
  }
  activeDialog.value = null;
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
      <section class="pool-summary" aria-label="干员随机范围设置">
        <div>
          <span class="pool-icon"><AppIcon name="sliders" /></span>
          <div>
            <strong>干员随机范围设置</strong>
            <p class="summary-extra">开局与局内抽取共用</p>
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
      <RecruitedOperators :operators="inRun.sixStars.value" :confirmed="hasConfirmed" />
      <section class="results-section" :class="{ collapsed }" aria-labelledby="result-title">
        <h2 class="start-heading">
          <button ref="startToggle" class="start-toggle" :aria-expanded="!collapsed" aria-controls="start-content"
            :aria-label="collapsed ? '展开随机开局' : '收起随机开局'" @click="toggleCollapsed">
            <span id="result-title">随机开局</span>
            <span class="start-toggle-hint" aria-hidden="true">
              {{ collapsed ? '展开' : '收起' }}<AppIcon name="chevron" />
            </span>
          </button>
        </h2>
        <div id="start-content" v-show="!collapsed" class="start-content">
        <div class="start-mode-description">
          <p><strong>随心所欲开局：</strong>对应游戏中的“随心所欲”，按实际获得的三张随机招募券填写职业，再从抽出的六星干员中选择一名起手。</p>
          <p><strong>全随机开局：</strong>直接随机分队、招募组合和全部开局干员。</p>
        </div>
        <div class="start-mode-switch" role="group" aria-label="开局方式">
          <button :aria-pressed="startMode === 'candidates'" @click="startMode = 'candidates'; announcement = ''">随心所欲开局</button>
          <button :aria-pressed="startMode === 'quick'" @click="startMode = 'quick'; announcement = ''">全随机开局</button>
        </div>
        <CandidateStartPanel
          v-if="startMode === 'candidates'"
          :controller="candidateStart"
          :registered="candidateRegistered"
          @settings="activeDialog = 'settings'"
          @choose-squad="activeDialog = 'squad'"
          @confirm="finishStart(confirmCandidate)"
        />
        <template v-else>
        <div class="full-start-actions">
          <button
            class="button primary roll-button"
            :disabled="isBlocked"
            :aria-describedby="isBlocked ? 'pool-warning' : undefined"
            @click="run(roll, '已生成新开局')"
          >
            {{ result ? '重新随机全部' : '开始随机' }}
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
            调整范围
            <AppIcon name="arrow" />
          </button>
        </div>
          <div class="context-grid">
            <SquadCard
              :squad="quickSquad"
              :randomized="squadRandomized"
              :disabled="isBlocked"
              @choose="activeDialog = 'squad'"
              @reroll="run(rollSquad, '已随机分队')"
            />
            <section class="context-card group-card" aria-label="招募组合">
              <div class="context-main">
                <span class="eyebrow">招募组合</span>
                <template v-if="quickGroup">
                  <h3>{{ quickGroup.name }}</h3>
                  <p>{{ quickGroup.desc }}</p>
                </template>
                <p v-else>尚未选择组合</p>
              </div>
              <div class="context-actions">
                <button class="button secondary" :disabled="isBlocked" aria-haspopup="dialog" @click="activeDialog = 'group'">
                  选择组合
                </button>
                <button class="button secondary" :disabled="isBlocked" @click="run(rollGroup, '已随机招募组合')">
                  {{ groupRandomized ? '重新随机' : '随机组合' }}
                </button>
              </div>
            </section>
          </div>
        <template v-if="result">
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
          <div class="quick-confirm">
            <p>{{ quickRegistered ? '本次开局已确认。' : '确认后登记全部开局干员，并收起开局卡片。' }}</p>
            <button class="button primary" :disabled="!canConfirmQuick || quickRegistered"
              @click="finishStart(confirmQuick)">
              {{ quickRegistered ? '已确认开局' : '确认开局' }}
            </button>
          </div>
          <p v-if="!canConfirmQuick" class="inline-warning">请先补齐所有券位的干员，再确认开局。</p>
          <p class="result-footnote">
            点击干员可重抽该券位。选择或随机分队、组合会重新生成全部券位；“重新随机全部”会重新抽取分队、组合与干员。
          </p>
        </template>
        <div v-else class="welcome-panel">
          <h3>暂无随机结果</h3>
          <p>可先选择或随机分队、招募组合，再点击“开始随机”生成干员；未选项目会自动随机。</p>
        </div>
        </template>
        <p v-if="hasConfirmed" class="result-footnote">重新确认其他开局会重置本局招募和应急助力名单。</p>
        </div>
      </section>
      <InRunRecruitmentPanel :controller="inRun" />
      <ChallengePanel :pools="challengePools" :controller="challenges" :error="challengeError" />
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
        ? '干员随机范围设置'
        : activeDialog === 'themes'
          ? '选择肉鸽主题'
          : activeDialog === 'squad'
            ? '选择分队'
            : activeDialog === 'group'
              ? '选择招募组合'
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
    <StartOptions v-else-if="activeDialog === 'squad' || activeDialog === 'group'"
      :options="choiceOptions" :selected-id="selectedChoiceId" @select="chooseStartOption" />
    <IntroModal v-else />
    <template #footer>
      <span v-if="activeDialog === 'settings'">
        {{ storageNotice ? '仅保存于本次会话' : '设置自动保存' }}
      </span>
      <button class="button primary" @click="activeDialog = null">
        {{ activeDialog === 'settings' ? '完成' : activeDialog === 'squad' || activeDialog === 'group' ? '取消' : '返回首页' }}
      </button>
    </template>
  </BaseDialog>
</template>
