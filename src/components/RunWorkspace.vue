<script setup lang="ts">
import { onMounted, onUnmounted, shallowRef, useId, useTemplateRef, watch } from 'vue';
import type { Operator } from '../lib/types';
import AppIcon from './AppIcon.vue';
import RecruitedOperators from './RecruitedOperators.vue';

defineProps<{ operators: readonly Operator[] }>();

const id = useId();
const desktopTarget = `${id}-desktop-board`;
const contentId = `${id}-board-content`;
const boardContent = useTemplateRef<HTMLElement>('boardContent');
const boardExpanded = shallowRef(false);
const wideScreen = shallowRef(false);
let layoutQuery: MediaQueryList | undefined;

function updateLayout() {
  wideScreen.value = layoutQuery?.matches ?? false;
}

watch(wideScreen, (wide) => {
  if (!wide && boardContent.value?.contains(document.activeElement)) {
    boardExpanded.value = true;
  }
});

onMounted(() => {
  layoutQuery = window.matchMedia('(min-width: 1080px)');
  updateLayout();
  layoutQuery.addEventListener('change', updateLayout);
});
onUnmounted(() => layoutQuery?.removeEventListener('change', updateLayout));
</script>

<template>
  <div class="run-workspace">
    <Teleport defer :to="`#${desktopTarget}`" :disabled="!wideScreen">
      <aside class="run-board" aria-label="本局展板">
        <div class="board-heading">
          <h2 v-if="wideScreen" class="board-heading-copy">
            <span class="board-title">本局展板</span>
            <span class="board-caption">{{ operators.length }} 名六星</span>
          </h2>
          <h2 v-else>
            <button class="board-toggle" :aria-expanded="boardExpanded" :aria-controls="contentId"
              @click="boardExpanded = !boardExpanded">
              <span class="board-heading-copy">
                <span class="board-title">本局展板</span>
                <span class="board-caption">{{ operators.length }} 名六星</span>
              </span>
              <AppIcon name="chevron" :class="{ expanded: boardExpanded }" />
            </button>
          </h2>
        </div>
        <Transition name="section-fold">
          <div :id="contentId" ref="boardContent" v-show="wideScreen || boardExpanded">
            <RecruitedOperators :operators="operators" />
          </div>
        </Transition>
      </aside>
    </Teleport>
    <div class="operation-column"><slot /></div>
    <div :id="desktopTarget" class="board-slot"></div>
  </div>
</template>

<style scoped>
.run-workspace {
  display: grid;
  grid-template-columns: minmax(0, 1fr) clamp(260px, 24vw, 292px);
  align-items: start;
  gap: 16px;
}
.board-slot { display: contents; }
.operation-column { display: grid; gap: 12px; min-width: 0; }
@media (max-width: 1079px) {
  .run-workspace { grid-template-columns: minmax(0, 1fr); gap: 12px; }
}
</style>
