<script setup lang="ts">
import type { Operator } from '../lib/types';
import OperatorAvatar from './OperatorAvatar.vue';

defineProps<{
  operator: Pick<Operator, 'id' | 'name' | 'rarity'>;
  selected?: boolean;
}>();
</script>

<template>
  <span class="operator-portrait" :class="{ selected }" :data-rarity="operator.rarity"
    :title="`${operator.name} · ${operator.rarity} 星`">
    <OperatorAvatar :id="operator.id" :name="operator.name" />
    <span class="portrait-name">{{ operator.name }}</span>
  </span>
</template>

<style scoped>
.operator-portrait {
  --rarity-color: var(--line);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  width: 100%;
  min-width: 0;
}
.operator-portrait[data-rarity='6'] { --rarity-color: var(--r6); }
.operator-portrait[data-rarity='5'] { --rarity-color: var(--r5); }
.operator-portrait[data-rarity='4'] { --rarity-color: var(--r4); }
.operator-portrait[data-rarity='3'] { --rarity-color: var(--r3); }
.operator-portrait :deep(.avatar-frame) {
  width: 56px;
  max-width: 100%;
  border: 2px solid var(--rarity-color);
  border-radius: 6px;
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--rarity-color) 25%, transparent),
    0 0 8px color-mix(in srgb, var(--rarity-color) 25%, transparent);
}
.portrait-name {
  width: 100%;
  min-height: 2.7em;
  font-size: 12px;
  line-height: 1.35;
  text-align: center;
  overflow-wrap: anywhere;
}
.selected .portrait-name {
  font-weight: 600;
  text-decoration: underline;
  text-underline-offset: 3px;
}
</style>
