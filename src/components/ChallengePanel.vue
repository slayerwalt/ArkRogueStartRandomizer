<script setup lang="ts">
import { computed, nextTick, ref, shallowRef, useId, watch } from 'vue';
import { CHALLENGE_RESTRICTION_LABELS, groupChallengePoolsBySource, type ChallengePool } from '../lib/challenges';
import type { ChallengeController } from '../composables/useChallenges';
import AppIcon from './AppIcon.vue';

const props = defineProps<{ pools: readonly ChallengePool[]; controller: ChallengeController; error?: string }>();
const { selectedPoolIds, selectedPools, selected, total, remaining, canDraw, lastDrawn, canUndo, undoMessage, togglePool, draw, remove, clear, undo } = props.controller;
const recentFirst = computed(() => [...selected.value].reverse());
const poolOptions = computed(() => groupChallengePoolsBySource(props.pools).flatMap((source, index) =>
  source.pools.map((pool) => ({ ...pool, sourceNumber: index + 1, active: selectedPoolIds.value.includes(pool.id) })),
));
const poolSummary = computed(() => !selectedPools.value.length
  ? '请选择至少一个词条池。'
  : remaining.value
    ? `已选 ${selectedPools.value.length} 个池，共 ${total.value} 条，可抽 ${remaining.value} 条`
    : '所选池的词条已抽完，可选择其他池，或移除、清空已抽词条。');
const panel = ref<HTMLElement | null>(null);
const drawButton = ref<HTMLButtonElement | null>(null);
const undoButton = ref<HTMLButtonElement | null>(null);
const expanded = shallowRef(false);
const contentId = `${useId()}-challenge-content`;

function focusDrawOrList() {
  const target = canDraw.value ? drawButton.value : panel.value?.querySelector<HTMLButtonElement>('.challenge-remove, .challenge-pool-option');
  target?.focus();
}
async function removeTerm(id: string) {
  remove(id);
  await nextTick();
  undoButton.value?.focus();
}
async function clearTerms() {
  clear();
  await nextTick();
  undoButton.value?.focus();
}
async function undoRemoval() {
  undo();
  await nextTick();
  focusDrawOrList();
}
watch(canUndo, async (available) => {
  if (available || !undoButton.value || document.activeElement !== undoButton.value) return;
  await nextTick();
  if (document.activeElement === document.body) focusDrawOrList();
});
</script>

<template>
  <section id="challenge-panel" ref="panel" class="feature-section challenge-panel" aria-labelledby="challenge-title" tabindex="-1">
    <header class="challenge-heading">
      <h2 id="challenge-title" class="feature-title">
        <button class="challenge-toggle" :aria-expanded="expanded" :aria-controls="contentId" @click="expanded = !expanded">
          <span class="challenge-heading-label">
            <span>随机词条挑战</span>
            <span v-if="selected.length" class="challenge-count"><span class="sr-only">已抽取 </span>{{ selected.length }}<span class="sr-only"> 条</span></span>
          </span>
          <span class="challenge-toggle-hint">{{ expanded ? '收起' : '展开' }}<AppIcon name="chevron" :class="{ expanded }" /></span>
        </button>
      </h2>
      <button v-if="expanded && selected.length" class="text-button challenge-clear" aria-label="清空本局已抽词条" @click="clearTerms">清空</button>
    </header>
    <Transition name="section-fold">
      <div :id="contentId" v-show="expanded">
        <p v-if="error || !pools.length" class="inline-warning" role="status">{{ error || '暂无可用词条池。' }}</p>
        <template v-else>
          <div class="challenge-controls">
            <fieldset class="challenge-source">
              <legend>词条池<span>可多选</span></legend>
              <div class="challenge-pool-options">
                <button v-for="item in poolOptions" :key="item.id" type="button" class="challenge-pool-option"
                  :class="{ selected: item.active }" :aria-pressed="item.active" :aria-label="item.name"
                  :aria-describedby="`challenge-source-${item.sourceNumber}`" @click="togglePool(item.id)">
                  <span class="challenge-pool-name">{{ item.name }}<sup class="challenge-source-marker" aria-hidden="true">{{ item.sourceNumber }}</sup></span>
                  <span class="challenge-pool-size">{{ item.terms.length }} 条</span>
                </button>
              </div>
            </fieldset>
            <div class="challenge-draw-actions">
              <p id="challenge-pool-summary" class="challenge-pool-summary" role="status">{{ poolSummary }}</p>
              <button ref="drawButton" class="button primary challenge-draw" :disabled="!canDraw" aria-describedby="challenge-pool-summary" @click="draw"><AppIcon name="shuffle" />随机抽取词条</button>
            </div>
          </div>
          <div v-if="canUndo" class="challenge-undo" role="status">
            <span>{{ undoMessage }}</span>
            <button ref="undoButton" class="text-button" aria-label="撤销移除词条" @click="undoRemoval">撤销</button>
          </div>
          <p v-if="!selected.length" class="challenge-placeholder">暂无已抽词条</p>
          <TransitionGroup name="challenge-item" tag="ol" class="challenge-entries" aria-label="已抽挑战词条">
            <li v-for="(term, index) in recentFirst" :key="term.id" class="challenge-entry" :class="[term.restriction, { 'is-latest': index === 0 }]">
              <div class="challenge-entry-topline">
                <span class="challenge-restriction">{{ CHALLENGE_RESTRICTION_LABELS[term.restriction] }}</span>
                <span v-if="index === 0" class="challenge-latest">最新</span>
                <span class="challenge-index">{{ String(selected.length - index).padStart(2, '0') }}</span>
              </div>
              <p>{{ term.text }}</p>
              <button class="text-button challenge-remove" :aria-label="`移除词条${term.text}`" @click="removeTerm(term.id)"><AppIcon name="close" /></button>
            </li>
          </TransitionGroup>
          <p class="sr-only" role="status" aria-live="polite">{{ lastDrawn ? `已抽取 ${selected.length} 条，最新词条：${CHALLENGE_RESTRICTION_LABELS[lastDrawn.restriction]}${lastDrawn.text}` : '已抽词条为空' }}</p>
        </template>
      </div>
    </Transition>
  </section>
</template>

<style scoped>
.challenge-panel { min-width: 0; }
.challenge-heading, .challenge-heading-label { display: flex; align-items: center; gap: 8px; }
.challenge-heading { justify-content: space-between; min-height: 44px; }
.challenge-heading-label { flex-wrap: wrap; min-width: 0; }
.challenge-heading .feature-title { flex: 1; min-width: 0; }
.challenge-toggle { display: flex; align-items: center; justify-content: space-between; gap: 12px; width: 100%; min-height: 44px; padding: 0; border: 0; border-radius: 6px; background: transparent; color: inherit; font: inherit; text-align: left; }
.challenge-toggle-hint { display: inline-flex; align-items: center; gap: 6px; flex-shrink: 0; color: var(--muted); font-size: 12px; font-weight: 400; }
.challenge-toggle-hint .icon { transition: transform .2s; }
.challenge-toggle-hint .icon.expanded { transform: rotate(90deg); }
.challenge-count { min-width: 22px; padding: 2px 5px; border-radius: 6px; background: var(--primary-soft); color: var(--primary); font-size: 11px; text-align: center; font-variant-numeric: tabular-nums; }
.challenge-clear { flex-shrink: 0; min-width: 44px; min-height: 44px; padding: 4px; font-size: 12px; }
.challenge-controls { display: grid; gap: 10px; margin-top: 10px; }
.challenge-source { min-width: 0; margin: 0; padding: 0; border: 0; }
.challenge-source legend { padding: 0; margin-bottom: 6px; font-size: 12px; font-weight: 600; }
.challenge-source legend > span { margin-left: 8px; color: var(--muted); font-size: 12px; font-weight: 400; }
.challenge-pool-options { display: flex; flex-wrap: wrap; gap: 8px; }
.challenge-pool-option { display: inline-flex; flex: 0 1 auto; align-items: center; gap: 6px; min-width: 0; max-width: 100%; min-height: 44px; padding: 6px 8px; border: 1px solid var(--line); border-radius: var(--radius-small); background: var(--surface); text-align: left; transition: background 150ms, border-color 150ms; }
.challenge-pool-option:hover { border-color: var(--primary); background: var(--background); }
.challenge-pool-option.selected { color: var(--primary); border-color: var(--primary); background: var(--primary-soft); }
.challenge-pool-name { min-width: 0; white-space: nowrap; font-size: 12px; }
.challenge-source-marker { position: relative; top: -.35em; margin-left: 2px; font-size: 10px; line-height: 0; vertical-align: baseline; }
.selected .challenge-pool-name { font-weight: 600; }
.challenge-pool-size { flex-shrink: 0; color: var(--muted); font-size: 11px; font-variant-numeric: tabular-nums; }
.challenge-draw-actions { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px 12px; }
.challenge-pool-summary { flex: 1; min-width: 160px; color: var(--muted); font-size: 12px; font-variant-numeric: tabular-nums; }
.challenge-draw { min-height: 44px; justify-content: center; gap: 8px; white-space: nowrap; }
.challenge-undo { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-top: 8px; padding: 0 10px; border-radius: var(--radius-small); background: var(--primary-soft); color: var(--primary); font-size: 12px; }
.challenge-undo > span { min-width: 0; overflow-wrap: anywhere; }
.challenge-undo .text-button { flex-shrink: 0; min-width: 44px; min-height: 44px; font-size: 12px; font-weight: 600; }
.challenge-placeholder { display: grid; place-items: center; min-height: 56px; margin-top: 10px; border: 1px dashed var(--line); border-radius: var(--radius-small); color: var(--muted); font-size: 12px; }
.challenge-entries { position: relative; display: grid; gap: 8px; margin: 10px 0 0; padding: 0; list-style: none; }
.challenge-entries:empty { margin: 0; }
.challenge-entry { position: relative; min-width: 0; padding: 10px 52px 10px 12px; border: 1px solid var(--line); border-radius: 8px; background: var(--surface); }
.challenge-entry.is-latest { border-color: #bdcafa; box-shadow: 0 2px 8px #17212f08; }
.challenge-entry-topline { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; min-height: 18px; margin-bottom: 4px; }
.challenge-restriction { border-radius: 4px; padding: 1px 5px; font-size: 11px; font-weight: 600; line-height: 1.5; }
.forbid .challenge-restriction { background: var(--background); color: var(--ink); }
.allow .challenge-restriction, .require .challenge-restriction { background: var(--primary-soft); color: var(--primary); }
.challenge-latest { color: var(--primary); font-size: 11px; }
.challenge-index { margin-left: auto; color: var(--muted); font-size: 11px; font-variant-numeric: tabular-nums; }
.challenge-entry > p { margin: 0; color: var(--ink); font-size: 13px; line-height: 1.6; overflow-wrap: anywhere; }
.challenge-remove { position: absolute; inset: 4px 4px auto auto; display: grid; place-items: center; width: 44px; height: 44px; padding: 0; border-radius: var(--radius-small); color: var(--muted); }
.challenge-remove:hover { background: var(--background); color: var(--ink); }
.challenge-remove .icon { width: 15px; height: 15px; }
.challenge-item-enter-active { transition: opacity 220ms ease, transform 220ms ease; }
.challenge-item-leave-active { position: absolute; width: 100%; transition: opacity 160ms ease, transform 160ms ease; }
.challenge-item-move { transition: transform 220ms ease; }
.challenge-item-enter-from { opacity: 0; transform: translateY(-7px); }
.challenge-item-leave-to { opacity: 0; transform: translateX(8px); }
@media (max-width: 600px) {
  .challenge-draw { width: 100%; }
}
@media (prefers-reduced-motion: reduce) {
  .challenge-item-enter-active, .challenge-item-leave-active, .challenge-item-move { transition: none; }
}
</style>
