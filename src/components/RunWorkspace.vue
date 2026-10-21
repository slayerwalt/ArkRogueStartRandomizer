<script setup lang="ts">
import { onMounted, onUnmounted, shallowRef, useId } from 'vue';
import type { InRunController } from '../composables/useInRunRecruitment';
import SelectedOperatorsPanel from './SelectedOperatorsPanel.vue';

defineProps<{ controller: InRunController }>();

const id = useId();
const desktopTarget = `${id}-desktop-board`;
const wideScreen = shallowRef(false);
let layoutQuery: MediaQueryList | undefined;

function updateLayout() {
  wideScreen.value = layoutQuery?.matches ?? false;
}

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
      <SelectedOperatorsPanel :controller="controller" :wide-screen="wideScreen" />
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
