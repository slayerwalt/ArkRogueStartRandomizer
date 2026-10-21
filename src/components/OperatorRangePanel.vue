<script setup lang="ts">
import { computed, useId } from 'vue';
import { summarizeOperatorPools } from '../lib/pool';
import type { Operator, RollSettings } from '../lib/types';
import AppIcon from './AppIcon.vue';
import OperatorAvatar from './OperatorAvatar.vue';

const props = defineProps<{ operators: readonly Operator[]; settings: RollSettings }>();
const emit = defineEmits<{ settings: [] }>();
const headingId = useId();
const rarityNames = { 6: '六星', 5: '五星', 4: '四星' } as const;
const groups = computed(() => summarizeOperatorPools(props.operators, props.settings));
</script>

<template>
  <section class="operator-range-panel" :aria-labelledby="headingId">
    <header class="range-heading">
      <h2 :id="headingId">干员随机范围</h2>
      <button class="button secondary range-settings" aria-label="调整干员随机范围" aria-haspopup="dialog" @click="emit('settings')">
        <AppIcon name="sliders" />调整范围
      </button>
    </header>
    <ul class="range-groups">
      <li v-for="group in groups" :key="group.rarity" class="range-group" :data-rarity="group.rarity">
        <div class="range-avatars" aria-hidden="true">
          <span v-for="operator in group.preview" :key="operator.id" class="range-avatar" :title="operator.name">
            <OperatorAvatar :id="operator.id" :name="operator.name" lazy />
          </span>
          <span v-if="!group.count" class="range-avatar-placeholder">{{ rarityNames[group.rarity] }}</span>
        </div>
        <p class="range-copy">
          <template v-if="group.count">
            <span><strong>{{ group.preview[0]?.name }}</strong>{{ group.count > 1 ? '等' : '，' }}</span>
            <span class="range-count"><span>{{ group.count }} 个</span><span>{{ rarityNames[group.rarity] }}干员</span></span>
          </template>
          <template v-else>已选择 <span class="range-count"><span>0 个</span><span>{{ rarityNames[group.rarity] }}干员</span></span></template>
        </p>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.operator-range-panel {
  container-type: inline-size;
  margin-block: 16px 12px;
  padding: 16px 18px;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  background: var(--surface);
  box-shadow: 0 4px 20px #17212f05;
}
.range-heading { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 12px; }
.range-heading h2 { font-size: 18px; }
.range-settings { flex-shrink: 0; min-height: 44px; gap: 6px; padding: 8px 12px; font-size: 13px; white-space: nowrap; }
.range-groups { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; list-style: none; margin: 0; padding: 0; }
.range-group { --rarity-color: var(--line); display: flex; align-items: center; gap: 8px; min-width: 0; }
.range-group[data-rarity='6'] { --rarity-color: var(--r6); }
.range-group[data-rarity='5'] { --rarity-color: var(--r5); }
.range-group[data-rarity='4'] { --rarity-color: var(--r4); }
.range-avatars { display: flex; flex-shrink: 0; gap: 4px; }
.range-avatar { display: none; width: 36px; height: 36px; overflow: hidden; border: 2px solid var(--rarity-color); border-radius: 6px; }
.range-avatar:first-child { display: block; }
.range-avatar :deep(.avatar-frame) { width: 100%; height: 100%; border-radius: 0; }
.range-avatar-placeholder { display: grid; place-items: center; width: 36px; height: 36px; border: 1px dashed var(--line); border-radius: 6px; color: var(--muted); font-size: 11px; }
.range-copy { min-width: 0; color: var(--muted); font-size: 13px; line-height: 1.6; overflow-wrap: anywhere; }
.range-copy strong { color: var(--ink); font-weight: 600; }
.range-count { display: block; font-variant-numeric: tabular-nums; }
.range-count > span { white-space: nowrap; }
@container (max-width: 440px) {
  .range-groups { gap: 12px; }
  .range-group { flex-direction: column; align-items: flex-start; }
  .range-copy { font-size: 12px; }
}
@container (min-width: 720px) {
  .range-avatar:nth-child(-n+3) { display: block; }
}
@container (min-width: 960px) {
  .range-avatar:nth-child(-n+4) { display: block; }
}
@container (min-width: 1200px) {
  .range-avatar:nth-child(-n+6) { display: block; }
}
@media (max-width: 600px) {
  .operator-range-panel { padding: 14px; }
  .range-heading h2 { font-size: 17px; }
}
</style>
