<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import { CHALLENGE_RESTRICTION_LABELS, type ChallengePool } from '../lib/challenges';
import type { ChallengeController } from '../composables/useChallenges';
import AppIcon from './AppIcon.vue';

const props = defineProps<{ pools: readonly ChallengePool[]; controller: ChallengeController; error?: string }>();
const { selectedPoolId, pool, selected, remaining, canDraw, lastDrawn, canUndo, undoMessage, selectPool, draw, remove, clear, undo } = props.controller;
const recentFirst = computed(() => [...selected.value].reverse());
const panel = ref<HTMLElement | null>(null);
const drawButton = ref<HTMLButtonElement | null>(null);
const undoButton = ref<HTMLButtonElement | null>(null);
const poolSelect = ref<HTMLSelectElement | null>(null);

function focusDrawOrList() {
  const target = canDraw.value ? drawButton.value : panel.value?.querySelector<HTMLButtonElement>('.challenge-remove') ?? poolSelect.value;
  target?.focus({ preventScroll: true });
}
async function removeTerm(id: string) {
  remove(id);
  await nextTick();
  undoButton.value?.focus({ preventScroll: true });
}
async function clearTerms() {
  clear();
  await nextTick();
  undoButton.value?.focus({ preventScroll: true });
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
  <section ref="panel" class="feature-section challenge-panel" aria-labelledby="challenge-title">
    <header class="challenge-heading">
      <div class="challenge-heading-label">
        <span class="challenge-symbol"><AppIcon name="shuffle" /></span>
        <h2 id="challenge-title" class="feature-title">随机词条</h2>
        <span v-if="selected.length" class="challenge-count">{{ selected.length }}</span>
      </div>
      <button v-if="selected.length" class="text-button challenge-clear" @click="clearTerms">清空</button>
    </header>
    <p v-if="error || !pools.length" class="inline-warning" role="status">{{ error || '暂无可用词条池。' }}</p>
    <template v-else-if="pool">
      <div class="challenge-source">
        <label class="sr-only" for="challenge-pool">词条池</label>
        <select id="challenge-pool" ref="poolSelect" :value="selectedPoolId" @change="selectPool(($event.target as HTMLSelectElement).value)">
          <option v-for="item in pools" :key="item.id" :value="item.id">{{ item.name }}</option>
        </select>
      </div>
      <button ref="drawButton" class="button primary challenge-draw" :disabled="!canDraw" @click="draw"><AppIcon name="shuffle" />随机抽取词条</button>
      <div v-if="canUndo" class="challenge-undo" role="status">
        <span>{{ undoMessage }}</span>
        <button ref="undoButton" class="text-button" @click="undoRemoval">撤销</button>
      </div>
      <p v-if="!remaining" class="inline-warning" role="status">当前池已抽完</p>
      <p v-if="!selected.length" class="challenge-placeholder">暂无已抽词条</p>
      <TransitionGroup name="challenge-item" tag="ol" class="challenge-entries" aria-label="已抽挑战词条">
        <li v-for="(term, index) in recentFirst" :key="`${selectedPoolId}:${term.id}`" class="challenge-entry" :class="[term.restriction, { 'is-latest': index === 0 }]">
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
  </section>
</template>

<style scoped>
.challenge-panel { min-width: 0; }
.challenge-heading, .challenge-heading-label { display: flex; align-items: center; gap: 9px; }
.challenge-heading { justify-content: space-between; min-height: 36px; }
.challenge-heading-label { min-width: 0; }
.challenge-heading .feature-title { white-space: nowrap; }
.challenge-symbol { display: grid; place-items: center; width: 30px; height: 30px; border-radius: 9px; color: var(--primary); background: var(--primary-soft); }
.challenge-symbol .icon { width: 16px; height: 16px; }
.challenge-count { min-width: 23px; padding: 2px 6px; border-radius: 7px; background: var(--primary-soft); color: var(--primary); font-size: 11px; text-align: center; }
.challenge-clear { min-height: 36px; padding: 4px; font-size: 12px; }
.challenge-source { display: flex; align-items: center; gap: 10px; margin-block: 16px 10px; }
.challenge-source select { min-width: 0; width: 100%; min-height: 44px; padding: 8px 10px; border: 1px solid var(--line); border-radius: var(--radius-small); background: var(--surface); color: var(--ink); font: inherit; font-size: 13px; text-overflow: ellipsis; }
.challenge-draw { width: 100%; justify-content: center; gap: 8px; }
.challenge-undo { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-top: 12px; padding: 0 10px; border-radius: var(--radius-small); background: var(--primary-soft); color: var(--primary); font-size: 12px; }
.challenge-undo .text-button { min-height: 44px; font-size: 12px; font-weight: 600; }
.challenge-placeholder { display: grid; place-items: center; min-height: 90px; margin-top: 14px; border: 1px dashed var(--line); border-radius: var(--radius-small); color: var(--muted); font-size: 12px; }
.challenge-entries { position: relative; display: grid; gap: 8px; margin: 14px 0 0; padding: 0; list-style: none; }
.challenge-entries:empty { margin: 0; }
.challenge-entry { position: relative; min-width: 0; padding: 11px 44px 12px 13px; border: 1px solid var(--line); border-radius: 10px; background: var(--surface); }
.challenge-entry.is-latest { border-color: #bdcafa; box-shadow: 0 2px 8px #17212f08; }
.challenge-entry-topline { display: flex; align-items: center; gap: 8px; min-height: 18px; margin-bottom: 6px; }
.challenge-restriction { border-radius: 4px; padding: 1px 5px; font-size: 10px; font-weight: 700; letter-spacing: .04em; line-height: 1.5; }
.forbid .challenge-restriction { background: var(--background); color: var(--ink); }
.allow .challenge-restriction, .require .challenge-restriction { background: var(--primary-soft); color: var(--primary); }
.challenge-latest { color: var(--primary); font-size: 10px; }
.challenge-index { margin-left: auto; color: var(--muted); font-size: 10px; font-variant-numeric: tabular-nums; }
.challenge-entry > p { margin: 0; color: var(--ink); font-size: 13px; line-height: 1.7; overflow-wrap: anywhere; }
.challenge-remove { position: absolute; inset: 50% 1px auto auto; display: grid; place-items: center; width: 40px; height: 44px; padding: 0; transform: translateY(-50%); color: var(--muted); }
.challenge-remove .icon { width: 15px; height: 15px; }
.challenge-item-enter-active { transition: opacity 220ms ease, transform 220ms ease; }
.challenge-item-leave-active { position: absolute; width: 100%; transition: opacity 160ms ease, transform 160ms ease; }
.challenge-item-move { transition: transform 220ms ease; }
.challenge-item-enter-from { opacity: 0; transform: translateY(-7px); }
.challenge-item-leave-to { opacity: 0; transform: translateX(8px); }
@media (max-width: 600px) {
  .challenge-source select { font-size: 16px; }
}
@media (prefers-reduced-motion: reduce) {
  .challenge-item-enter-active, .challenge-item-leave-active, .challenge-item-move { transition: none; }
}
</style>
