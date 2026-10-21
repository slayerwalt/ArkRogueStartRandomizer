<script setup lang="ts">
import { computed, nextTick, shallowRef, useId, useTemplateRef, watch } from 'vue';
import type { InRunController } from '../composables/useInRunRecruitment';
import AppIcon from './AppIcon.vue';
import OperatorRegistration from './OperatorRegistration.vue';
import RecruitedOperators from './RecruitedOperators.vue';
import MiniWindowMode from './mini-window/MiniWindowMode.vue';

const props = defineProps<{ controller: InRunController; wideScreen: boolean }>();
const { sixStars, canUndoRemoval } = props.controller;
const contentId = `${useId()}-selected-content`;
const boardContent = useTemplateRef<HTMLElement>('boardContent');
const addButton = useTemplateRef<HTMLButtonElement>('addButton');
const undoButton = useTemplateRef<HTMLButtonElement>('undoButton');
const expanded = shallowRef(false);
const adding = shallowRef(false);
const feedback = shallowRef('');
const removedHere = shallowRef(false);
const options = computed(() => props.controller.selectedOptions());

watch(() => props.wideScreen, (wide) => {
  if (!wide && boardContent.value?.contains(document.activeElement)) expanded.value = true;
});
watch(props.controller.message, () => { feedback.value = ''; removedHere.value = false; }, { flush: 'sync' });
watch(canUndoRemoval, (available) => {
  if (!available && undoButton.value?.matches(':focus')) nextTick(() => addButton.value?.focus());
});
function add(id: string) {
  const operator = options.value.find((item) => item.id === id);
  if (!operator || !props.controller.addSelected(id)) return;
  adding.value = false;
  expanded.value = true;
  feedback.value = `已添加${operator.name}，后续随机将排除该干员。`;
}
async function remove(id: string) {
  const operator = sixStars.value.find((item) => item.id === id);
  if (!operator) return;
  props.controller.removeSelected(id);
  feedback.value = `已移除${operator.name}。`;
  removedHere.value = true;
  await nextTick();
  undoButton.value?.focus();
}
async function undo() {
  if (!props.controller.undoRemoval()) return;
  feedback.value = '已恢复干员，后续随机将继续排除。';
  await nextTick();
  addButton.value?.focus();
}
</script>

<template>
  <aside class="run-board" aria-label="已选干员">
    <div class="board-heading selected-heading">
      <h2 v-if="wideScreen" class="board-heading-copy">
        <span class="board-title">已选干员</span>
        <span class="board-caption">{{ sixStars.length }} 名六星</span>
      </h2>
      <h2 v-else>
        <button class="board-toggle" :aria-expanded="expanded" :aria-controls="contentId" @click="expanded = !expanded">
          <span class="board-heading-copy">
            <span class="board-title">已选干员</span>
            <span class="board-caption">{{ sixStars.length }} 名六星</span>
          </span>
          <AppIcon name="chevron" :class="{ expanded }" />
        </button>
      </h2>
      <div class="selected-actions">
        <MiniWindowMode :controller="controller" />
        <button ref="addButton" class="button secondary selected-add" aria-haspopup="dialog" @click="adding = true">手动添加</button>
      </div>
    </div>
    <Transition name="section-fold">
      <div :id="contentId" ref="boardContent" v-show="wideScreen || expanded">
        <p class="selected-hint">后续随机会排除这里的六星干员。</p>
        <RecruitedOperators :operators="sixStars" @remove="remove" />
        <div v-if="feedback" class="selected-feedback">
          <p role="status">{{ feedback }}</p>
          <button v-if="removedHere && canUndoRemoval" ref="undoButton" class="text-button" @click="undo">撤销</button>
        </div>
      </div>
    </Transition>
  </aside>
  <OperatorRegistration v-if="adding" :operators="options" @select="add" @close="adding = false" />
</template>

<style scoped>
.selected-heading { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; }
.selected-actions { display: flex; align-items: center; flex-shrink: 0; gap: 6px; }
.selected-heading h2 { flex: 1; min-width: 0; }
.selected-heading .board-caption { margin-left: 0; }
.selected-add { flex-shrink: 0; padding: 8px; min-height: 44px; font-size: 12px; white-space: nowrap; }
.selected-hint { padding: 12px 12px 0; font-size: 12px; color: var(--muted); }
.selected-feedback { display: flex; align-items: center; gap: 8px; padding: 0 12px 12px; font-size: 12px; }
.selected-feedback p { flex: 1; min-width: 0; overflow-wrap: anywhere; }
.selected-feedback .text-button { min-height: 44px; flex-shrink: 0; }
@media (max-width: 1079px) {
  .selected-heading { padding-block: 6px; }
  .selected-heading .board-toggle { gap: 8px; padding-right: 4px; }
}
</style>
